import "server-only";
import { MAXIMO_FILAS, leerArchivo, leerFecha, leerNumero, normalizar } from "@/lib/pedidos/importacion";
import type { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio, ESTADOS_CALIDAD } from "./calidad";

// Carga de inventario inicial: registra las existencias de arranque desde una planilla. Cada fila es un artículo en una ubicación
// y un lote, con su cantidad por caja y el número de cajas. Crea lo que el sistema anterior creaba al recibir: el lote (si no
// existe) con su estado de calidad, la entrada de cada caja (t_entradas_ras) y la caja en el inventario (t_pic), y deja un
// ajuste (t_pic_ajuste) por caja con el motivo y la referencia de la carga. Es TODO O NADA: con un solo error no se carga
// nada, y la misma referencia no se puede usar dos veces (evita duplicar el inventario al subir dos veces el mismo archivo).

export const MOTIVO = "Carga de inventario inicial";
export const SIN_VENCIMIENTO = new Date(Date.UTC(2999, 11, 31));
export const MAX_CAJAS_POR_FILA = 1000;
export const MAX_CAJAS_TOTAL = 20000;

export const COLUMNAS = [
  { campo: "ean", titulo: "Código de barras", otros: ["ean", "codigo", "articulo", "sku"], obligatoria: true },
  { campo: "bodega", titulo: "Bodega", otros: [], obligatoria: true },
  { campo: "ubicacion", titulo: "Ubicación", otros: ["ubicacion", "posicion"], obligatoria: true },
  { campo: "lote", titulo: "Lote", otros: ["lote proveedor", "numero de lote"], obligatoria: true },
  { campo: "cantidad", titulo: "Cantidad por caja", otros: ["cantidad", "cant", "unidades por caja"], obligatoria: true },
  { campo: "cajas", titulo: "Número de cajas", otros: ["cajas", "no de cajas", "cantidad de cajas"], obligatoria: false },
  { campo: "vence", titulo: "Vence", otros: ["fecha vence", "vencimiento", "fecha de vencimiento"], obligatoria: false },
  { campo: "ingreso", titulo: "Fecha de ingreso", otros: ["ingreso", "fecha ingreso"], obligatoria: false },
  { campo: "nit", titulo: "NIT proveedor", otros: ["nit", "proveedor"], obligatoria: false },
  { campo: "estado", titulo: "Estado de calidad", otros: ["estado", "calidad"], obligatoria: false },
  { campo: "caja", titulo: "Número de caja", otros: ["caja", "no de caja"], obligatoria: false },
] as const;
type Campo = (typeof COLUMNAS)[number]["campo"];
type FilaCruda = { numero: number } & Record<Campo, string>;

export type FilaCarga = { fila: number; ean: string; descripcion: string; bodega: string; ubicacion: string; lote: string; cantidad: number; cajas: number; errores: string[] };
export type ResumenArticulo = { ean: string; descripcion: string; cajas: number; unidades: number };
export type AnalisisCarga = {
  error?: string;
  filas: FilaCarga[];
  total: number;
  cajas: number;
  unidades: number;
  lotesNuevos: number;
  ubicaciones: number;
  articulos: ResumenArticulo[];
  ignoradas: string[];
};
type Trabajo = {
  fila: number; ean: string; bodega: string; ubicacion: string; lote: string; cantidad: number; cajas: number; vence: Date | null; ingreso: Date; nit: string; estado: string; caja: number | null;
};

export function validarReferencia(r: string) {
  const t = r.trim();
  if (t.length < 3 || t.length > 40) return "La referencia de la carga debe tener entre 3 y 40 caracteres (por ejemplo INI-2026-01).";
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/.test(t)) return "La referencia solo admite letras, números, espacios y . _ / -";
  return null;
}

const ESTADO_ES = new Map(ESTADOS_CALIDAD.map((e) => [normalizar(e), e]));

async function trabajar(db: Db, archivo: File, referencia: string): Promise<AnalisisCarga & { trabajos: Trabajo[]; lotesPorCrear: Map<string, Trabajo> }> {
  const base = { filas: [], total: 0, cajas: 0, unidades: 0, lotesNuevos: 0, ubicaciones: 0, articulos: [], ignoradas: [], trabajos: [], lotesPorCrear: new Map<string, Trabajo>() };
  const errRef = validarReferencia(referencia);
  if (errRef) return { ...base, error: errRef };
  const ref = referencia.trim();
  if ((await db.picAjuste.count({ where: { numdocumento: ref } })) > 0) return { ...base, error: `La referencia «${ref}» ya se usó en otra carga. Usa una distinta (o deshaz la anterior).` };

  const leido = await leerArchivo(archivo);
  if ("error" in leido) return { ...base, error: leido.error };
  const [encabezado = [], ...resto] = leido.celdas;
  const titulos = encabezado.map((t) => normalizar(t.replace(/\s*\*+\s*$/, "")));
  const pos = Object.fromEntries(COLUMNAS.map((c) => [c.campo, titulos.findIndex((t) => t === normalizar(c.titulo) || (c.otros as readonly string[]).includes(t))])) as Record<Campo, number>;
  const faltan = COLUMNAS.filter((c) => c.obligatoria && pos[c.campo] === -1).map((c) => c.titulo);
  if (faltan.length > 0) return { ...base, error: `A la planilla le faltan columnas obligatorias: ${faltan.join(", ")}. Descarga la planilla modelo.` };
  const usadas = new Set(Object.values(pos).filter((p) => p >= 0));
  const ignoradas = encabezado.filter((t, i) => t !== "" && !usadas.has(i));

  const filas: FilaCruda[] = [];
  resto.forEach((celdas, i) => {
    if (celdas.every((c) => c === "")) return;
    const f = { numero: i + 2 } as FilaCruda;
    for (const c of COLUMNAS) f[c.campo] = pos[c.campo] >= 0 ? (celdas[pos[c.campo]] ?? "").trim() : "";
    filas.push(f);
  });
  if (filas.length === 0) return { ...base, ignoradas, error: "La planilla no tiene filas con datos." };
  if (filas.length > MAXIMO_FILAS) return { ...base, ignoradas, error: `La planilla tiene ${filas.length} filas: el máximo es ${MAXIMO_FILAS}. Divídela en varias cargas.` };

  const eans = [...new Set(filas.map((f) => f.ean).filter(Boolean))];
  const bodegas = [...new Set(filas.map((f) => f.bodega).filter(Boolean))];
  const ubicaciones = [...new Set(filas.map((f) => f.ubicacion).filter(Boolean))];
  const lotes = [...new Set(filas.map((f) => f.lote).filter(Boolean))];
  const numerosCaja = filas.map((f) => leerNumero(f.caja)).filter((n): n is number => n !== null);
  const [articulos, bodDb, ubiDb, lotesDb, cajasDb] = await Promise.all([
    db.detalleReferencia.findMany({ where: { productoean: { in: eans } }, select: { productoean: true, descripcion: true, um1: true, inventariable: true } }),
    db.insBodega.findMany({ where: { bodega: { in: bodegas } }, select: { bodega: true, prcierre: true } }),
    db.insCoordenadas.findMany({ where: { ubicacion: { in: ubicaciones } }, select: { ubicacion: true, bodegac: true, seleccion: true } }),
    db.maestroLotePt.findMany({ where: { loteproveedor: { in: lotes } }, select: { loteproveedor: true, codean: true, fechavence: true, nitprov: true, confirmacertif: true } }),
    numerosCaja.length ? db.entradasRas.findMany({ where: { cajano: { in: numerosCaja } }, select: { cajano: true } }) : [],
  ]);
  const art = new Map(articulos.map((a) => [a.productoean, a]));
  const bod = new Map(bodDb.map((b) => [b.bodega, b]));
  const ubi = new Map(ubiDb.map((u) => [u.ubicacion, u]));
  const loteExistente = new Map(lotesDb.map((l) => [`${l.loteproveedor}|${l.codean}`, l]));
  const estadoLote = new Map<string, string | null>();
  for (const l of lotesDb) {
    const h = await db.historiaStatusCalidad.findFirst({ where: { lote: l.loteproveedor, productoean: l.codean }, orderBy: { id: "desc" }, select: { estado: true } });
    estadoLote.set(`${l.loteproveedor}|${l.codean}`, h?.estado ?? null);
  }
  const cajasUsadas = new Set(cajasDb.map((c) => c.cajano));

  const resultado: FilaCarga[] = [];
  const trabajos: Trabajo[] = [];
  const lotesPorCrear = new Map<string, Trabajo>();
  const cajasEnArchivo = new Set<number>();
  let totalCajas = 0;
  const hoy = new Date();
  for (const f of filas) {
    const errores: string[] = [];
    const a = art.get(f.ean);
    if (!f.ean) errores.push("Falta el código de barras.");
    else if (!a) errores.push(`No existe el artículo ${f.ean}.`);
    else if ((a.inventariable ?? 1) !== 1) errores.push(`El artículo ${f.ean} no es inventariable.`);
    if (!f.bodega) errores.push("Falta la bodega.");
    else if (!bod.has(f.bodega)) errores.push(`No existe la bodega ${f.bodega}.`);
    if (!f.ubicacion) errores.push("Falta la ubicación.");
    else {
      const u = ubi.get(f.ubicacion);
      if (!u) errores.push(`No existe la ubicación ${f.ubicacion} (créala en Ubicaciones).`);
      else if (f.bodega && bod.has(f.bodega) && u.bodegac !== f.bodega) errores.push(`La ubicación ${f.ubicacion} es de la bodega ${u.bodegac}, no de la ${f.bodega}.`);
      else if (u.seleccion) errores.push(`La ubicación ${f.ubicacion} está bloqueada.`);
    }
    if (!f.lote) errores.push("Falta el lote.");
    else if (f.lote.length > 20) errores.push("El lote admite hasta 20 caracteres.");
    const cant = leerNumero(f.cantidad);
    if (cant === null || cant <= 0 || cant > 1e9) errores.push(f.cantidad === "" ? "Falta la cantidad por caja." : `La cantidad «${f.cantidad}» debe ser un número mayor que cero.`);
    let cajas = 1;
    if (f.cajas !== "") {
      const c = leerNumero(f.cajas);
      if (c === null || !Number.isInteger(c) || c < 1 || c > MAX_CAJAS_POR_FILA) errores.push(`El número de cajas «${f.cajas}» debe ser un entero entre 1 y ${MAX_CAJAS_POR_FILA}.`);
      else cajas = c;
    }
    let vence: Date | null = null;
    if (f.vence !== "") {
      const v = leerFecha(f.vence);
      if (!v) errores.push(`La fecha de vencimiento «${f.vence}» no es válida (AAAA-MM-DD o DD/MM/AAAA).`);
      else vence = new Date(`${v}T00:00:00.000Z`);
    }
    let ingreso = hoy;
    if (f.ingreso !== "") {
      const v = leerFecha(f.ingreso);
      if (!v) errores.push(`La fecha de ingreso «${f.ingreso}» no es válida.`);
      else ingreso = new Date(`${v}T00:00:00.000Z`);
    }
    if (f.nit.length > 50) errores.push("El NIT del proveedor admite hasta 50 caracteres.");
    let estado = "Aprobado";
    if (f.estado !== "") {
      const e = ESTADO_ES.get(normalizar(f.estado));
      if (!e) errores.push(`El estado de calidad «${f.estado}» no es válido (${ESTADOS_CALIDAD.join(", ")}).`);
      else estado = e;
    }
    let caja: number | null = null;
    if (f.caja !== "") {
      const n = leerNumero(f.caja);
      if (n === null || !Number.isSafeInteger(n) || n <= 0) errores.push(`El número de caja «${f.caja}» debe ser un entero positivo.`);
      else if (cajas !== 1) errores.push("Con un número de caja específico, el número de cajas debe ser 1.");
      else if (cajasUsadas.has(n)) errores.push(`Ya existe la caja ${n}.`);
      else if (cajasEnArchivo.has(n)) errores.push(`La caja ${n} se repite en la planilla.`);
      else { caja = n; cajasEnArchivo.add(n); }
    }

    // Lote: si existe, la fila debe ser coherente con él; si es nuevo, todas sus filas deben coincidir.
    if (f.lote && f.ean && a) {
      const k = `${f.lote}|${f.ean}`;
      const ex = loteExistente.get(k);
      if (ex) {
        if (vence && ex.confirmacertif === 0 && ex.fechavence.getTime() !== vence.getTime()) errores.push(`El lote ${f.lote} ya existe y vence el ${ex.fechavence.toISOString().slice(0, 10)}, no el ${vence.toISOString().slice(0, 10)}.`);
        const actual = estadoLote.get(k);
        if (f.estado !== "" && actual && normalizar(actual) !== normalizar(estado)) errores.push(`El lote ${f.lote} ya existe con estado ${actual}: el estado de calidad no se cambia desde la carga.`);
      } else if (errores.length === 0) {
        const previo = lotesPorCrear.get(k);
        if (previo) {
          if ((previo.vence?.getTime() ?? 0) !== (vence?.getTime() ?? 0)) errores.push(`El lote ${f.lote} del artículo ${f.ean} aparece con vencimientos distintos en la planilla.`);
          if (previo.estado !== estado) errores.push(`El lote ${f.lote} del artículo ${f.ean} aparece con estados de calidad distintos.`);
        }
      }
    }
    totalCajas += cajas;
    if (totalCajas > MAX_CAJAS_TOTAL && errores.length === 0) errores.push(`La carga supera ${MAX_CAJAS_TOTAL} cajas: divídela en varias.`);

    const t: Trabajo | null = errores.length === 0 && cant !== null ? { fila: f.numero, ean: f.ean, bodega: f.bodega, ubicacion: f.ubicacion, lote: f.lote, cantidad: cant, cajas, vence, ingreso, nit: f.nit, estado, caja } : null;
    if (t) {
      trabajos.push(t);
      const k = `${t.lote}|${t.ean}`;
      if (!loteExistente.has(k) && !lotesPorCrear.has(k)) lotesPorCrear.set(k, t);
    }
    resultado.push({ fila: f.numero, ean: f.ean, descripcion: a?.descripcion ?? "", bodega: f.bodega, ubicacion: f.ubicacion, lote: f.lote, cantidad: cant ?? 0, cajas, errores });
  }

  const porArt = new Map<string, ResumenArticulo>();
  for (const t of trabajos) {
    const x = porArt.get(t.ean) ?? { ean: t.ean, descripcion: art.get(t.ean)?.descripcion ?? t.ean, cajas: 0, unidades: 0 };
    x.cajas += t.cajas;
    x.unidades = Math.round((x.unidades + t.cajas * t.cantidad) * 10000) / 10000;
    porArt.set(t.ean, x);
  }
  return {
    filas: resultado, total: filas.length, cajas: trabajos.reduce((s, t) => s + t.cajas, 0), unidades: [...porArt.values()].reduce((s, x) => s + x.unidades, 0),
    lotesNuevos: lotesPorCrear.size, ubicaciones: new Set(trabajos.map((t) => t.ubicacion)).size, articulos: [...porArt.values()].sort((a, b) => a.descripcion.localeCompare(b.descripcion)), ignoradas, trabajos, lotesPorCrear,
  };
}

export async function analizarCarga(db: Db, archivo: File, referencia: string): Promise<AnalisisCarga> {
  const { trabajos: _t, lotesPorCrear: _l, ...a } = await trabajar(db, archivo, referencia);
  void _t; void _l;
  return a;
}

// ── Cargar ────────────────────────────────────────────────────────────────────────────────────────────────────────

export type ResultadoCarga = { referencia: string; cajas: number; unidades: number; lotesNuevos: number };

export async function cargarInventario(db: Db, archivo: File, referencia: string): Promise<{ error?: string; analisis: AnalisisCarga; resultado?: ResultadoCarga; lotesCreados?: { lote: string; ean: string }[]; cajasCreadas?: number[] }> {
  const { trabajos, lotesPorCrear, ...analisis } = await trabajar(db, archivo, referencia);
  if (analisis.error) return { error: analisis.error, analisis };
  const conErrores = analisis.filas.filter((f) => f.errores.length > 0).length;
  if (conErrores > 0) return { error: `La planilla tiene ${conErrores} fila${conErrores === 1 ? "" : "s"} con errores: una carga de inventario es todo o nada. Corrígelas y vuelve a revisar.`, analisis };
  const ref = referencia.trim();
  const descripciones = new Map((await db.detalleReferencia.findMany({ where: { productoean: { in: [...new Set(trabajos.map((t) => t.ean))] } }, select: { productoean: true, descripcion: true, um1: true } })).map((a) => [a.productoean, a]));

  return db.$transaction(async (tx) => {
    // La referencia se vuelve a comprobar dentro de la transacción, por si otra carga la usó entre tanto.
    await tx.$executeRaw`LOCK TABLE t_pic_ajuste IN EXCLUSIVE MODE`;
    if ((await tx.picAjuste.count({ where: { numdocumento: ref } })) > 0) throw new ErrorDeNegocio(`La referencia «${ref}» ya se usó en otra carga.`);
    await tx.$executeRaw`LOCK TABLE t_entradas_ras IN EXCLUSIVE MODE`;
    const max = await tx.entradasRas.aggregate({ _max: { cajano: true } });
    let siguiente = Math.floor(max._max.cajano ?? 0) + 1;
    const ahora = new Date();

    // Saldo total por lote nuevo (para su primer estado de calidad).
    const saldoLote = new Map<string, number>();
    for (const t of trabajos) saldoLote.set(`${t.lote}|${t.ean}`, (saldoLote.get(`${t.lote}|${t.ean}`) ?? 0) + t.cajas * t.cantidad);
    const lotesCreados: { lote: string; ean: string }[] = [];
    for (const [k, t] of lotesPorCrear) {
      await tx.maestroLotePt.create({
        data: { loteproveedor: t.lote, nitprov: t.nit || "SIN-PROVEEDOR", codean: t.ean, fechaingresa: t.ingreso, fechavence: t.vence ?? SIN_VENCIMIENTO, confirmacertif: t.vence ? 0 : 1, numcontrolliberacion: null },
      });
      await tx.historiaStatusCalidad.create({ data: { lote: t.lote, productoean: t.ean, fecha_registro: ahora, estado: t.estado, id_usuario: 0, saldo: saldoLote.get(k) ?? 0 } });
      lotesCreados.push({ lote: t.lote, ean: t.ean });
    }
    const estadoPorLote = new Map<string, string>();
    for (const [k, t] of lotesPorCrear) estadoPorLote.set(k, t.estado);
    for (const t of trabajos) {
      const k = `${t.lote}|${t.ean}`;
      if (!estadoPorLote.has(k)) {
        const h = await tx.historiaStatusCalidad.findFirst({ where: { lote: t.lote, productoean: t.ean }, orderBy: { id: "desc" }, select: { estado: true } });
        estadoPorLote.set(k, h?.estado ?? t.estado);
      }
    }

    const entradas: Prisma.EntradasRasCreateManyInput[] = [];
    const pics: Prisma.PicCreateManyInput[] = [];
    const ajustes: Prisma.PicAjusteCreateManyInput[] = [];
    const cajasCreadas: number[] = [];
    for (const t of trabajos) {
      const d = descripciones.get(t.ean);
      for (let i = 0; i < t.cajas; i++) {
        const caja = t.caja ?? siguiente++;
        cajasCreadas.push(caja);
        entradas.push({
          cajano: caja, producto: t.ean, lote_orden: t.lote, describteetiqueta: `${MOTIVO} ${ref}`.slice(0, 250), cantidadprog: t.cantidad, registra: 0, brecibe: t.bodega, saldoactual: t.cantidad,
          ubicacionpreasign: t.ubicacion, operadorras: estadoPorLote.get(`${t.lote}|${t.ean}`) ?? t.estado, impresa: 0, des_articulo: d?.descripcion?.slice(0, 100) ?? null, des_umedida: d?.um1 ?? null, fecha: t.ingreso, cajarecargable: 0,
        });
        pics.push({ cod_producto: t.ean, bodepicking: t.bodega, cajap: caja, lote: t.lote, ubicacion: t.ubicacion, entradas: t.cantidad, salidas: 0, reserva: 0 });
        ajustes.push({ caja, fecha: ahora, saldoinicial: 0, qtyentrada: t.cantidad, qtysale: 0, motivoajuste: `${MOTIVO} ${ref}`, loteproveedor: t.lote, numdocumento: ref });
      }
    }
    for (let i = 0; i < entradas.length; i += 2000) {
      await tx.entradasRas.createMany({ data: entradas.slice(i, i + 2000) });
      await tx.pic.createMany({ data: pics.slice(i, i + 2000) });
      await tx.picAjuste.createMany({ data: ajustes.slice(i, i + 2000) });
    }
    await tx.insCoordenadas.updateMany({ where: { ubicacion: { in: [...new Set(trabajos.map((t) => t.ubicacion))] } }, data: { ocupacion: 1 } });
    return { analisis, resultado: { referencia: ref, cajas: entradas.length, unidades: analisis.unidades, lotesNuevos: lotesCreados.length }, lotesCreados, cajasCreadas };
  }, { timeout: 120000, maxWait: 20000 });
}

// ── Historial y deshacer ──────────────────────────────────────────────────────────────────────────────────────────

export async function cargasAnteriores(db: Db) {
  return db.$queryRaw<{ referencia: string; fecha: Date; cajas: number; unidades: Prisma.Decimal }[]>`
    SELECT numdocumento AS referencia, MIN(fecha) AS fecha, COUNT(*)::int AS cajas, SUM(COALESCE(qtyentrada, 0)) AS unidades
    FROM t_pic_ajuste WHERE motivoajuste LIKE ${`${MOTIVO}%`} GROUP BY numdocumento ORDER BY MIN(fecha) DESC LIMIT 50`;
}

/**
 * Deshace una carga: borra sus cajas, sus ajustes y los lotes que creó. Solo si nada se movió: cada caja debe seguir intacta (sin
 * salidas ni reservas), sin otros ajustes y sin estar en un picking, un conteo ni un SSCC. Todo o nada.
 */
export async function deshacerCarga(db: Db, referencia: string, lotesCreados: { lote: string; ean: string }[]) {
  return db.$transaction(async (tx) => {
    const ajustes = await tx.picAjuste.findMany({ where: { numdocumento: referencia, motivoajuste: { startsWith: MOTIVO } } });
    if (ajustes.length === 0) throw new ErrorDeNegocio("No existe una carga con esa referencia.");
    const cajas = ajustes.map((a) => a.caja);
    const pics = await tx.pic.findMany({ where: { cajap: { in: cajas } } });
    const alterada = pics.find((p) => Number(p.salidas ?? 0) !== 0 || Number(p.reserva ?? 0) !== 0 || Number(p.entradas ?? 0) !== Number(ajustes.find((a) => a.caja === p.cajap)?.qtyentrada ?? -1));
    if (alterada) throw new ErrorDeNegocio(`La caja ${alterada.cajap} ya tiene movimientos o reservas: la carga no se puede deshacer. Haz un ajuste de inventario.`);
    const textos = cajas.map(String);
    const [otros, enPicking, enSscc, enConteo] = await Promise.all([
      tx.picAjuste.count({ where: { caja: { in: cajas }, NOT: { numdocumento: referencia } } }),
      tx.detallePrepack.count({ where: { OR: [{ conscaja: { in: textos } }, { alerta: { in: textos } }] } }),
      tx.ssccxcaja.count({ where: { idcaja: { in: cajas.map((c) => Math.trunc(c)) } } }),
      tx.temporalConteowms.count({ where: { caja: { in: cajas } } }),
    ]);
    if (otros > 0) throw new ErrorDeNegocio("Alguna caja de la carga ya tuvo otros ajustes: no se puede deshacer.");
    if (enPicking > 0 || enSscc > 0) throw new ErrorDeNegocio("Alguna caja de la carga ya está en un picking: no se puede deshacer.");
    if (enConteo > 0) throw new ErrorDeNegocio("Alguna caja de la carga ya está en un conteo: no se puede deshacer.");

    const ubicaciones = [...new Set(pics.map((p) => p.ubicacion).filter((u): u is string => !!u))];
    await tx.picAjuste.deleteMany({ where: { numdocumento: referencia, motivoajuste: { startsWith: MOTIVO } } });
    await tx.pic.deleteMany({ where: { cajap: { in: cajas } } });
    await tx.entradasRas.deleteMany({ where: { cajano: { in: cajas } } });
    let lotesBorrados = 0;
    for (const l of lotesCreados) {
      if ((await tx.entradasRas.count({ where: { lote_orden: l.lote, producto: l.ean } })) > 0) continue;
      await tx.historiaStatusCalidad.deleteMany({ where: { lote: l.lote, productoean: l.ean } });
      await tx.maestroLotePt.deleteMany({ where: { loteproveedor: l.lote, codean: l.ean } });
      lotesBorrados++;
    }
    for (const u of ubicaciones) {
      const quedan = await tx.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_pic WHERE ubicacion = ${u} AND (entradas - salidas) > 0`;
      if ((quedan[0]?.n ?? 0) === 0) await tx.insCoordenadas.updateMany({ where: { ubicacion: u }, data: { ocupacion: 0 } });
    }
    return { cajas: cajas.length, lotesBorrados };
  }, { timeout: 120000, maxWait: 20000 });
}
