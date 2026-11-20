import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { MAXIMO_FILAS, leerArchivo, leerNumero, normalizar } from "@/lib/pedidos/importacion";
import type { Db } from "@/lib/tenant";
import { ajustarCajaTx, simularAjuste, textoMotivo, validarAjuste, type DatosAjuste, type Motivo } from "./ajustes";
import { MOTIVOS } from "./ajustes-tipos";
import { ErrorDeNegocio } from "./calidad";

// Aprobación, anulación y carga en bloque de ajustes de inventario.
//  - Aprobación: si hay un umbral (unidades) y quien ajusta no puede aprobar, un ajuste manual cuya diferencia lo supera no se aplica:
//    queda como solicitud pendiente hasta que un aprobador (permiso «eliminar» de Inventario) lo apruebe o lo rechace.
//  - Anulación: un ajuste manual se deshace con otro ajuste contrario que cita el original; el original queda marcado como anulado.
//  - En bloque: una planilla con el saldo real de muchas cajas; todo o nada.

export const CLAVE_UMBRAL = "ajustes.aprobacion";
export const MAX_FILAS_BLOQUE = 2000;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

export type Usuario = { id: string; nombre: string };

export async function leerUmbral(db: Db): Promise<number> {
  const c = await db.configuracion.findUnique({ where: { clave: CLAVE_UMBRAL } });
  const v = c && typeof c.valor === "object" && c.valor ? Number((c.valor as { umbral?: unknown }).umbral) : 0;
  return Number.isFinite(v) && v > 0 ? v : 0;
}

export async function guardarUmbral(db: Db, umbral: number) {
  if (!Number.isFinite(umbral) || umbral < 0 || umbral > 1e9) throw new ErrorDeNegocio("El umbral debe ser un número, cero o más (cero desactiva la aprobación).");
  await db.configuracion.upsert({ where: { clave: CLAVE_UMBRAL }, create: { clave: CLAVE_UMBRAL, valor: { umbral } }, update: { valor: { umbral } } });
}

export const requiereAprobacion = (umbral: number, diferencia: number, esAprobador: boolean) => umbral > 0 && !esAprobador && Math.abs(diferencia) > umbral;

// ── Solicitudes ───────────────────────────────────────────────────────────────────────────────────────────────────

function reglas(sim: { saldo: number; nuevo: number; diferencia: number; reservado: number }) {
  if (sim.nuevo < 0) throw new ErrorDeNegocio(`No se puede dejar la caja en ${sim.nuevo}: solo tiene ${sim.saldo}.`);
  if (sim.diferencia === 0) throw new ErrorDeNegocio("No hay diferencia: el saldo ya es ese.");
  if (sim.nuevo + 1e-9 < sim.reservado) throw new ErrorDeNegocio(`La caja tiene ${sim.reservado} reservados (en un picking): el saldo no puede quedar por debajo. Libera o elimina el picking primero.`);
}

export async function solicitarAjuste(db: Db, d: DatosAjuste, u: Usuario) {
  validarAjuste(d);
  const sim = await simularAjuste(db, d);
  reglas(sim);
  const s = await db.ajusteSolicitud.create({
    data: {
      caja: d.caja, ean: d.ean, bodega: d.bodega, modo: d.modo, cantidad: d.cantidad, motivo: d.motivo, detalle: d.detalle?.trim() || null, soporte: d.soporte?.trim() || null,
      saldo_solicitado: sim.saldo, diferencia: sim.diferencia, solicitado_por: u.id, solicitado_nombre: u.nombre.slice(0, 120),
    },
  });
  return { id: s.id, ...sim };
}

export async function listarSolicitudes(db: Db, estado: "pendiente" | "resueltas") {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT s.id, s.caja, s.ean, d.descripcion AS articulo, s.bodega, s.modo, s.cantidad, s.motivo, s.detalle, s.soporte, s.saldo_solicitado AS saldo, s.diferencia, s.estado,
           s.solicitado_nombre AS solicitante, s.fecha_solicitud AS fecha, s.resuelto_nombre AS resolvio, s.fecha_resolucion AS fecha_resolucion, s.nota_resolucion AS nota,
           (SELECT (p.entradas - p.salidas) FROM t_pic p WHERE p.cajap = s.caja AND p.cod_producto = s.ean AND p.bodepicking = s.bodega) AS saldo_actual
    FROM ajuste_solicitud s LEFT JOIN t_detalle_referencia d ON d.productoean = s.ean
    WHERE ${estado === "pendiente" ? Prisma.sql`s.estado = 'pendiente'` : Prisma.sql`s.estado <> 'pendiente'`}
    ORDER BY ${estado === "pendiente" ? Prisma.sql`s.id ASC` : Prisma.sql`s.fecha_resolucion DESC NULLS LAST, s.id DESC`} LIMIT 200`;
}

export async function contarPendientes(db: Db) {
  return db.ajusteSolicitud.count({ where: { estado: "pendiente" } });
}

export async function aprobarSolicitud(db: Db, id: number, u: Usuario, nota: string | null) {
  return db.$transaction(async (tx) => {
    const f = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM ajuste_solicitud WHERE id = ${id} AND estado = 'pendiente' FOR UPDATE`;
    if (!f[0]) throw new ErrorDeNegocio("La solicitud ya fue resuelta o no existe.");
    const s = await tx.ajusteSolicitud.findUniqueOrThrow({ where: { id } });
    const d: DatosAjuste = { caja: s.caja, ean: s.ean, bodega: s.bodega, modo: s.modo as DatosAjuste["modo"], cantidad: Number(s.cantidad), motivo: s.motivo as Motivo, detalle: s.detalle, soporte: s.soporte };
    const motivo = `${textoMotivo(d)} · solicitud #${id} de ${s.solicitado_nombre ?? "—"}, aprobada por ${u.nombre}`.slice(0, 500);
    // Se aplica contra el saldo de hoy: «fijar» deja el saldo pedido; «sumar» y «restar» cambian lo que hay.
    const r = await ajustarCajaTx(tx, d, motivo);
    await tx.ajusteSolicitud.update({ where: { id }, data: { estado: "aprobada", resuelto_por: u.id, resuelto_nombre: u.nombre.slice(0, 120), fecha_resolucion: new Date(), nota_resolucion: nota?.trim().slice(0, 300) || null, ajuste_id: r.id } });
    return { ...r, caja: s.caja };
  });
}

export async function rechazarSolicitud(db: Db, id: number, u: Usuario, nota: string) {
  if (!nota.trim()) throw new ErrorDeNegocio("Explica por qué se rechaza la solicitud.");
  const n = await db.ajusteSolicitud.updateMany({
    where: { id, estado: "pendiente" },
    data: { estado: "rechazada", resuelto_por: u.id, resuelto_nombre: u.nombre.slice(0, 120), fecha_resolucion: new Date(), nota_resolucion: nota.trim().slice(0, 300) },
  });
  if (n.count === 0) throw new ErrorDeNegocio("La solicitud ya fue resuelta o no existe.");
}

// ── Anulación ─────────────────────────────────────────────────────────────────────────────────────────────────────

export const PREFIJO_ANULACION = "Anulación del ajuste #";

export async function fichaAjuste(db: Db, id: number) {
  const f = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT a.id, a.fecha, a.caja, er.producto AS ean, d.descripcion AS articulo, a.loteproveedor AS lote, a.ubicacion_sale AS ubicacion, a.saldoinicial AS antes,
           COALESCE(a.qtyentrada, 0) AS entrada, COALESCE(a.qtysale, 0) AS salida, (COALESCE(a.saldoinicial, 0) + COALESCE(a.qtyentrada, 0) - COALESCE(a.qtysale, 0)) AS despues,
           a.motivoajuste AS motivo, a.numdocumento AS soporte,
           (SELECT (p.entradas - p.salidas) FROM t_pic p WHERE p.cajap = a.caja LIMIT 1) AS saldo_actual,
           (SELECT x.id FROM t_pic_ajuste x WHERE x.motivoajuste LIKE ${`${PREFIJO_ANULACION}`} || a.id::text || ':%' ORDER BY x.id LIMIT 1) AS anulado_por
    FROM t_pic_ajuste a LEFT JOIN t_entradas_ras er ON er.cajano = a.caja LEFT JOIN t_detalle_referencia d ON d.productoean = er.producto WHERE a.id = ${id}`;
  return f[0] ?? null;
}

export async function anularAjuste(db: Db, id: number, razon: string) {
  if (!razon.trim()) throw new ErrorDeNegocio("Explica por qué se anula el ajuste.");
  return db.$transaction(async (tx) => {
    const a = await tx.picAjuste.findUnique({ where: { id } });
    if (!a) throw new ErrorDeNegocio("El ajuste no existe.");
    const m = a.motivoajuste ?? "";
    if (m.startsWith(PREFIJO_ANULACION)) throw new ErrorDeNegocio("Una anulación no se anula: haz un ajuste nuevo.");
    if (!m.startsWith("Ajuste manual")) throw new ErrorDeNegocio("Solo se anulan ajustes manuales. Los de conteo se corrigen con otro conteo y los de la carga inicial se deshacen desde la carga.");
    const previa = await tx.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_pic_ajuste WHERE motivoajuste LIKE ${`${PREFIJO_ANULACION}${id}:%`}`;
    if ((previa[0]?.n ?? 0) > 0) throw new ErrorDeNegocio("Ese ajuste ya fue anulado.");
    const cajas = await tx.$queryRaw<{ ean: string; bodega: string }[]>`SELECT cod_producto AS ean, bodepicking AS bodega FROM t_pic WHERE cajap = ${a.caja} FOR UPDATE`;
    if (cajas.length === 0) throw new ErrorDeNegocio("La caja ya no existe en el inventario: no se puede revertir el ajuste.");
    if (cajas.length > 1) throw new ErrorDeNegocio(`Hay ${cajas.length} cajas con el número ${a.caja}: anula el ajuste con un ajuste nuevo desde la caja correcta.`);
    const dif = r4(Number(a.qtyentrada ?? 0) - Number(a.qtysale ?? 0));
    if (dif === 0) throw new ErrorDeNegocio("El ajuste no movió el saldo: no hay nada que revertir.");
    const d: DatosAjuste = { caja: a.caja, ean: cajas[0].ean, bodega: cajas[0].bodega, modo: dif > 0 ? "restar" : "sumar", cantidad: Math.abs(dif), motivo: "Error de registro", detalle: null, soporte: null };
    // Si el saldo actual ya no permite revertirlo (por ejemplo porque se pickeó), ajustarCajaTx lo dice con el saldo real.
    const r = await ajustarCajaTx(tx, d, `${PREFIJO_ANULACION}${id}: ${razon.trim()}`.slice(0, 500), `ANUL-${id}`);
    return { ...r, caja: a.caja, revertido: -dif };
  });
}

// ── En bloque ─────────────────────────────────────────────────────────────────────────────────────────────────────

export const COLUMNAS_BLOQUE = [
  { campo: "caja", titulo: "Caja", otros: ["numero de caja", "no de caja", "cajap"], obligatoria: true },
  { campo: "saldo", titulo: "Saldo real", otros: ["saldo", "cantidad", "cantidad real", "conteo"], obligatoria: true },
  { campo: "motivo", titulo: "Motivo", otros: [], obligatoria: true },
  { campo: "detalle", titulo: "Detalle", otros: ["observacion", "observaciones"], obligatoria: false },
  { campo: "soporte", titulo: "Documento", otros: ["documento de soporte", "soporte"], obligatoria: false },
] as const;
type Campo = (typeof COLUMNAS_BLOQUE)[number]["campo"];

export type FilaBloque = { fila: number; caja: string; articulo: string; antes: number | null; saldo: number | null; diferencia: number | null; motivo: string; errores: string[] };
export type AnalisisBloque = { error?: string; filas: FilaBloque[]; ignoradas: string[]; cajas: number; aumentan: number; disminuyen: number; sinCambio: number };
type Trabajo = { fila: number; datos: DatosAjuste };

const MOTIVO_POR_TEXTO = new Map(MOTIVOS.map((m) => [normalizar(m), m]));

async function trabajarBloque(db: Db, archivo: File, esAprobador: boolean): Promise<AnalisisBloque & { trabajos: Trabajo[] }> {
  const base = { filas: [] as FilaBloque[], ignoradas: [] as string[], cajas: 0, aumentan: 0, disminuyen: 0, sinCambio: 0, trabajos: [] as Trabajo[] };
  const leido = await leerArchivo(archivo);
  if ("error" in leido) return { ...base, error: leido.error };
  const [encabezado = [], ...resto] = leido.celdas;
  const titulos = encabezado.map((t) => normalizar(t.replace(/\s*\*+\s*$/, "")));
  const pos = Object.fromEntries(COLUMNAS_BLOQUE.map((c) => [c.campo, titulos.findIndex((t) => t === normalizar(c.titulo) || (c.otros as readonly string[]).includes(t))])) as Record<Campo, number>;
  const faltan = COLUMNAS_BLOQUE.filter((c) => c.obligatoria && pos[c.campo] === -1).map((c) => c.titulo);
  if (faltan.length > 0) return { ...base, error: `A la planilla le faltan columnas obligatorias: ${faltan.join(", ")}. Descarga la planilla modelo.` };
  const usadas = new Set(Object.values(pos).filter((p) => p >= 0));
  const ignoradas = encabezado.filter((t, i) => t !== "" && !usadas.has(i));
  const filas = resto.map((celdas, i) => ({ numero: i + 2, celdas })).filter((f) => !f.celdas.every((c) => c === ""));
  if (filas.length === 0) return { ...base, ignoradas, error: "La planilla no tiene filas con datos." };
  if (filas.length > Math.min(MAX_FILAS_BLOQUE, MAXIMO_FILAS)) return { ...base, ignoradas, error: `La planilla tiene ${filas.length} filas: el máximo es ${MAX_FILAS_BLOQUE}. Divídela en varias.` };

  const val = (celdas: string[], c: Campo) => (pos[c] >= 0 ? (celdas[pos[c]] ?? "").trim() : "");
  const numeros = [...new Set(filas.map((f) => leerNumero(val(f.celdas, "caja"))).filter((n): n is number => n !== null && Number.isInteger(n)))];
  const cajasDb = numeros.length
    ? await db.$queryRaw<{ caja: number; ean: string; bodega: string; descripcion: string | null; saldo: Prisma.Decimal; reservado: Prisma.Decimal | null }[]>`
        SELECT p.cajap AS caja, p.cod_producto AS ean, p.bodepicking AS bodega, d.descripcion, (p.entradas - p.salidas) AS saldo, p.reserva AS reservado
        FROM t_pic p LEFT JOIN t_detalle_referencia d ON d.productoean = p.cod_producto WHERE p.cajap = ANY(${numeros}::float8[])`
    : [];
  const porCaja = new Map<number, typeof cajasDb>();
  for (const c of cajasDb) porCaja.set(c.caja, [...(porCaja.get(c.caja) ?? []), c]);
  const umbral = await leerUmbral(db);

  const vistas = new Set<number>();
  const resultado: FilaBloque[] = [];
  const trabajos: Trabajo[] = [];
  let aumentan = 0, disminuyen = 0, sinCambio = 0;
  for (const f of filas) {
    const errores: string[] = [];
    const cajaTxt = val(f.celdas, "caja");
    const caja = leerNumero(cajaTxt);
    const saldo = leerNumero(val(f.celdas, "saldo"));
    const motivoTxt = val(f.celdas, "motivo");
    const motivo = MOTIVO_POR_TEXTO.get(normalizar(motivoTxt)) as Motivo | undefined;
    const detalle = val(f.celdas, "detalle");
    let articulo = "", antes: number | null = null, dif: number | null = null;
    if (caja === null || !Number.isInteger(caja) || caja <= 0) errores.push("La caja debe ser un número entero.");
    else if (vistas.has(caja)) errores.push("La caja está repetida en la planilla.");
    else {
      vistas.add(caja);
      const c = porCaja.get(caja);
      if (!c) errores.push(`No existe la caja ${caja} en el inventario.`);
      else if (c.length > 1) errores.push(`Hay ${c.length} cajas con ese número: ajústala una por una.`);
      else {
        articulo = c[0].descripcion ?? c[0].ean;
        antes = Number(c[0].saldo);
        if (saldo === null || saldo < 0 || saldo > 1e9) errores.push("El saldo real debe ser un número, cero o más.");
        else {
          dif = r4(saldo - antes);
          if (dif === 0) errores.push("No hay diferencia: el saldo ya es ese.");
          if (saldo + 1e-9 < Number(c[0].reservado ?? 0)) errores.push(`Tiene ${Number(c[0].reservado)} reservados: el saldo no puede quedar por debajo.`);
          if (dif !== 0 && requiereAprobacion(umbral, dif, esAprobador)) errores.push(`La diferencia (${dif}) supera el umbral de ${umbral} y necesita un aprobador: haz ese ajuste de forma individual para solicitarlo.`);
        }
      }
    }
    if (!motivo) errores.push(motivoTxt ? `Motivo no válido: elige uno de ${MOTIVOS.join(", ")}.` : "El motivo es obligatorio.");
    else if (motivo === "Otro" && !detalle) errores.push("Con el motivo «Otro» el detalle es obligatorio.");
    if (detalle.length > 400) errores.push("El detalle admite hasta 400 caracteres.");
    if (val(f.celdas, "soporte").length > 50) errores.push("El documento admite hasta 50 caracteres.");
    if (errores.length === 0 && caja !== null && motivo && saldo !== null && dif !== null) {
      const c = porCaja.get(caja)![0];
      trabajos.push({ fila: f.numero, datos: { caja, ean: c.ean, bodega: c.bodega, modo: "fijar", cantidad: saldo, motivo, detalle: detalle || null, soporte: val(f.celdas, "soporte") || null } });
      if (dif > 0) aumentan++; else disminuyen++;
    }
    if (dif === 0) sinCambio++;
    resultado.push({ fila: f.numero, caja: cajaTxt, articulo, antes, saldo, diferencia: dif, motivo: motivo ?? motivoTxt, errores });
  }
  return { filas: resultado, ignoradas, cajas: trabajos.length, aumentan, disminuyen, sinCambio, trabajos };
}

export async function analizarBloque(db: Db, archivo: File, esAprobador: boolean): Promise<AnalisisBloque> {
  const { trabajos: _t, ...a } = await trabajarBloque(db, archivo, esAprobador);
  void _t;
  return a;
}

/** Aplica la planilla: todo o nada, cada caja con su ajuste manual. La referencia de la carga queda en el documento de soporte si la fila no trae uno. */
export async function aplicarBloque(db: Db, archivo: File, esAprobador: boolean, referencia: string) {
  const ref = referencia.trim();
  if (ref.length < 3 || ref.length > 40) throw new ErrorDeNegocio("La referencia debe tener entre 3 y 40 caracteres (por ejemplo AJ-2026-01).");
  const a = await trabajarBloque(db, archivo, esAprobador);
  if (a.error) return { error: a.error, analisis: a as AnalisisBloque };
  if (a.filas.some((f) => f.errores.length > 0) || a.trabajos.length === 0) return { error: "La planilla tiene errores: corrígelos y vuelve a revisarla.", analisis: a as AnalisisBloque };
  const ids = await db.$transaction(async (tx) => {
    const sal: number[] = [];
    for (const t of a.trabajos) {
      // Se vuelve a calcular dentro de la transacción: si el saldo cambió desde la revisión, «fijar» deja el saldo pedido igualmente.
      const r = await ajustarCajaTx(tx, t.datos, `${textoMotivo(t.datos)} · bloque ${ref}`.slice(0, 500), t.datos.soporte ?? ref);
      sal.push(r.id);
    }
    return sal;
  }, { timeout: 120000, maxWait: 10000 });
  const resumen = { cajas: a.trabajos.length, aumentan: a.aumentan, disminuyen: a.disminuyen, referencia: ref, ajustes: ids };
  return { analisis: a as AnalisisBloque, resumen };
}
