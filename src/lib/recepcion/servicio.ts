import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio, ESTADOS_CALIDAD } from "@/lib/inventario/calidad";
import { SIN_VENCIMIENTO } from "@/lib/inventario/carga";
import { reubicarCaja } from "@/lib/movil/servicio";
import { aplicarRecepcion } from "@/lib/compras/ordenes";

// Recepción y almacenamiento dirigido. Recibir crea el lote (si no existe) con su primer estado de calidad y una caja por rótulo en la
// ubicación de recibo de la bodega (t_entradas_ras + t_pic); almacenar lleva cada caja del recibo a su ubicación definitiva, con una
// sugerencia: la ubicación fija del artículo, una donde ya está el mismo lote, o la posición libre más cercana.

export const ZONA_RECIBO = Prisma.sql`UPPER(c.ubicacion) ~ '^(RECIBO|RECEPCION)'`;
const ZONA_NO_ALMACENAR = Prisma.sql`UPPER(c.ubicacion) ~ '^(RECIBO|RECEPCION|DESPACHO|AVERIADOS|AJUSTE|RECLAMO|NOV)'`;
export const MAX_LINEAS = 50;
export const MAX_CAJAS_RECEPCION = 2000;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
export const PREFIJO_RECEPCION = "Recepción ";

export type LineaRecepcion = { ean: string; lote: string; vence: string | null; cajas: number; cantidad: number };
export type DatosRecepcion = { bodega: string; documento: string; nit: string | null; estado: string; lineas: LineaRecepcion[]; orden?: number | null };

export async function ubicacionDeRecibo(db: Db | Prisma.TransactionClient, bodega: string) {
  const f = await db.$queryRaw<{ ubicacion: string; seleccion: boolean | null }[]>`
    SELECT c.ubicacion, c.seleccion FROM t_ins_coordenadas c WHERE c.bodegac = ${bodega} AND ${ZONA_RECIBO} ORDER BY c.ubicacion LIMIT 1`;
  return f[0] ?? null;
}

const esFecha = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00.000Z`).toISOString().slice(0, 10) === s;

export async function recibir(db: Db, d: DatosRecepcion) {
  const documento = d.orden ? `OC-${d.orden}` : d.documento.trim();
  if (documento.length < 3 || documento.length > 40) throw new ErrorDeNegocio("El documento (orden de compra, remisión o factura) debe tener entre 3 y 40 caracteres.");
  if (!(ESTADOS_CALIDAD as readonly string[]).includes(d.estado)) throw new ErrorDeNegocio("Elige el estado de calidad de los lotes nuevos.");
  if (d.lineas.length === 0) throw new ErrorDeNegocio("Agrega al menos una línea.");
  if (d.lineas.length > MAX_LINEAS) throw new ErrorDeNegocio(`Una recepción admite hasta ${MAX_LINEAS} líneas.`);
  const totalCajas = d.lineas.reduce((s, l) => s + l.cajas, 0);
  if (totalCajas > MAX_CAJAS_RECEPCION) throw new ErrorDeNegocio(`Una recepción admite hasta ${MAX_CAJAS_RECEPCION} cajas.`);
  const hoy = new Date().toISOString().slice(0, 10);
  d.lineas.forEach((l, i) => {
    const n = i + 1;
    if (!l.ean.trim()) throw new ErrorDeNegocio(`Línea ${n}: falta el código de barras del artículo.`);
    if (!l.lote.trim() || l.lote.trim().length > 30) throw new ErrorDeNegocio(`Línea ${n}: el lote es obligatorio (hasta 30 caracteres).`);
    if (!Number.isInteger(l.cajas) || l.cajas < 1 || l.cajas > 1000) throw new ErrorDeNegocio(`Línea ${n}: el número de cajas debe ser un entero entre 1 y 1000.`);
    if (!Number.isFinite(l.cantidad) || l.cantidad <= 0 || l.cantidad > 1e7) throw new ErrorDeNegocio(`Línea ${n}: la cantidad por caja debe ser mayor que cero.`);
    if (l.vence) {
      if (!esFecha(l.vence)) throw new ErrorDeNegocio(`Línea ${n}: la fecha de vencimiento no es válida.`);
      if (l.vence < hoy) throw new ErrorDeNegocio(`Línea ${n}: el lote ya está vencido (${l.vence}); no se recibe.`);
    }
  });
  const nit = d.orden ? null : d.nit?.trim() || null;
  if (nit && !(await db.clientes.findUnique({ where: { nit }, select: { nit: true } }))) throw new ErrorDeNegocio(`No existe un tercero con el NIT ${nit}.`);

  return db.$transaction(async (tx) => {
    const bod = await tx.insBodega.findUnique({ where: { bodega: d.bodega }, select: { bodega: true, prcierre: true } });
    if (!bod) throw new ErrorDeNegocio(`No existe la bodega «${d.bodega}».`);
    if (bod.prcierre) throw new ErrorDeNegocio(`La bodega ${d.bodega} está cerrada.`);
    let nitUso = nit;
    let tolerancia = 0;
    if (d.orden) {
      const oc = await tx.ordenCompra.findUnique({ where: { numordencompra: d.orden }, select: { proveedor: true } });
      if (!oc) throw new ErrorDeNegocio(`No existe la orden de compra ${d.orden}.`);
      nitUso = oc.proveedor;
      const bo = await tx.$queryRaw<{ bodega: string | null }[]>`SELECT DISTINCT bodega FROM t_detalle_orden_compra WHERE nordencompra = ${d.orden}`;
      if (bo.some((x) => x.bodega && x.bodega !== d.bodega)) throw new ErrorDeNegocio(`La orden ${d.orden} es para la bodega ${bo.map((x) => x.bodega).join(", ")}, no para ${d.bodega}.`);
      const cfg = await tx.configuracion.findUnique({ where: { clave: "recepcion.tolerancia" } });
      const t = cfg && typeof cfg.valor === "object" && cfg.valor ? Number((cfg.valor as { porcentaje?: unknown }).porcentaje) : 0;
      tolerancia = Number.isFinite(t) && t > 0 ? t : 0;
    }
    const rec = await ubicacionDeRecibo(tx, d.bodega);
    if (!rec) throw new ErrorDeNegocio(`La bodega ${d.bodega} no tiene ubicación de recibo: crea una ubicación que se llame RECIBO (o RECEPCION) en esa bodega.`);
    if (rec.seleccion) throw new ErrorDeNegocio(`La ubicación de recibo «${rec.ubicacion}» está bloqueada.`);

    const eans = [...new Set(d.lineas.map((l) => l.ean.trim()))];
    const arts = new Map((await tx.detalleReferencia.findMany({ where: { productoean: { in: eans } }, select: { productoean: true, descripcion: true, um1: true, inventariable: true } })).map((a) => [a.productoean, a]));
    for (const e of eans) {
      const a = arts.get(e);
      if (!a) throw new ErrorDeNegocio(`No existe el artículo ${e}.`);
      if ((a.inventariable ?? 1) === 0) throw new ErrorDeNegocio(`El artículo ${e} no es inventariable.`);
    }
    // Una misma línea repetida (artículo y lote) se suma; el vencimiento de un lote debe ser uno solo.
    const lotes = new Map<string, { ean: string; lote: string; vence: string | null; existe: boolean; estado: string | null }>();
    for (const l of d.lineas) {
      const k = `${l.lote.trim()}|${l.ean.trim()}`;
      const v = l.vence || null;
      const previo = lotes.get(k);
      if (previo && previo.vence !== v) throw new ErrorDeNegocio(`El lote ${l.lote} del artículo ${l.ean} aparece con dos vencimientos distintos.`);
      if (!previo) lotes.set(k, { ean: l.ean.trim(), lote: l.lote.trim(), vence: v, existe: false, estado: null });
    }
    const existentes = await tx.maestroLotePt.findMany({ where: { OR: [...lotes.values()].map((x) => ({ loteproveedor: x.lote, codean: x.ean })) }, select: { loteproveedor: true, codean: true, fechavence: true, confirmacertif: true } });
    for (const e of existentes) {
      const x = lotes.get(`${e.loteproveedor}|${e.codean}`);
      if (!x) continue;
      x.existe = true;
      const venceDb = e.confirmacertif ? null : e.fechavence?.toISOString().slice(0, 10) ?? null;
      if (x.vence && venceDb && x.vence !== venceDb) throw new ErrorDeNegocio(`El lote ${x.lote} ya existe con vencimiento ${venceDb}, no ${x.vence}.`);
      const h = await tx.historiaStatusCalidad.findFirst({ where: { lote: x.lote, productoean: x.ean }, orderBy: { id: "desc" }, select: { estado: true } });
      x.estado = h?.estado ?? d.estado;
    }

    await tx.$executeRaw`LOCK TABLE t_entradas_ras IN EXCLUSIVE MODE`;
    const max = await tx.entradasRas.aggregate({ _max: { cajano: true } });
    let siguiente = Math.floor(max._max.cajano ?? 0) + 1;
    const primera = siguiente;
    const ahora = new Date();
    const saldoNuevo = new Map<string, number>();
    for (const l of d.lineas) {
      const k = `${l.lote.trim()}|${l.ean.trim()}`;
      if (!lotes.get(k)!.existe) saldoNuevo.set(k, (saldoNuevo.get(k) ?? 0) + l.cajas * l.cantidad);
    }
    for (const [k, x] of lotes) {
      if (x.existe) continue;
      await tx.maestroLotePt.create({ data: { loteproveedor: x.lote, nitprov: nitUso ?? "SIN-PROVEEDOR", codean: x.ean, fechaingresa: ahora, fechavence: x.vence ? new Date(`${x.vence}T00:00:00.000Z`) : SIN_VENCIMIENTO, confirmacertif: x.vence ? 0 : 1, numcontrolliberacion: null } });
      await tx.historiaStatusCalidad.create({ data: { lote: x.lote, productoean: x.ean, fecha_registro: ahora, estado: d.estado, id_usuario: 0, saldo: r4(saldoNuevo.get(k) ?? 0) } });
      x.estado = d.estado;
    }
    const entradas: Prisma.EntradasRasCreateManyInput[] = [];
    const pics: Prisma.PicCreateManyInput[] = [];
    let unidades = 0;
    for (const l of d.lineas) {
      const a = arts.get(l.ean.trim())!;
      const k = `${l.lote.trim()}|${l.ean.trim()}`;
      for (let i = 0; i < l.cajas; i++) {
        const caja = siguiente++;
        entradas.push({ cajano: caja, producto: l.ean.trim(), lote_orden: l.lote.trim(), describteetiqueta: `${PREFIJO_RECEPCION}${documento}`.slice(0, 250), cantidadprog: l.cantidad, registra: 0, brecibe: d.bodega, saldoactual: l.cantidad, ubicacionpreasign: rec.ubicacion, operadorras: lotes.get(k)!.estado ?? d.estado, impresa: 0, des_articulo: a.descripcion?.slice(0, 100) ?? null, des_umedida: a.um1 ?? null, fecha: ahora, cajarecargable: 0 });
        pics.push({ cod_producto: l.ean.trim(), bodepicking: d.bodega, cajap: caja, lote: l.lote.trim(), ubicacion: rec.ubicacion, entradas: l.cantidad, salidas: 0, reserva: 0 });
        unidades += l.cantidad;
      }
    }
    for (let i = 0; i < entradas.length; i += 2000) {
      await tx.entradasRas.createMany({ data: entradas.slice(i, i + 2000) });
      await tx.pic.createMany({ data: pics.slice(i, i + 2000) });
    }
    await tx.$executeRaw`
      INSERT INTO tgg_t_reg_movimientosdecaja (caja, ubicacion, fecha, idempleado, transaccion, ubicacion_inicial, saldo, productoean, loteproveedor, bodega_inicial, bodega_final, documentooc)
      SELECT p.cajap, p.ubicacion, now(), 0, 'RECEPCION', NULL, p.entradas, p.cod_producto, p.lote, NULL, p.bodepicking, ${documento}
      FROM t_pic p WHERE p.cajap >= ${primera} AND p.cajap < ${siguiente}`;
    await tx.insCoordenadas.updateMany({ where: { ubicacion: rec.ubicacion }, data: { ocupacion: 1 } });
    let ordenCompleta = false;
    if (d.orden) {
      const porArticulo = new Map<string, number>();
      for (const l of d.lineas) porArticulo.set(l.ean.trim(), r4((porArticulo.get(l.ean.trim()) ?? 0) + l.cajas * l.cantidad));
      ordenCompleta = (await aplicarRecepcion(tx, d.orden, porArticulo, tolerancia)).completa;
    }
    return { ordenCompleta, documento, desde: primera, hasta: siguiente - 1, cajas: entradas.length, unidades: r4(unidades), ubicacion: rec.ubicacion, lotesNuevos: [...lotes.values()].filter((x) => !x.existe).length };
  }, { timeout: 120000, maxWait: 20000 });
}

export async function recepcionesRecientes(db: Db) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT substr(er.describteetiqueta, ${PREFIJO_RECEPCION.length + 1}) AS documento, MIN(er.fecha) AS fecha, MIN(er.brecibe) AS bodega, COUNT(*)::int AS cajas,
           MIN(er.cajano)::bigint AS desde, MAX(er.cajano)::bigint AS hasta, SUM(er.cantidadprog) AS unidades,
           (COUNT(*) FILTER (WHERE EXISTS (SELECT 1 FROM t_pic p JOIN t_ins_coordenadas c ON c.ubicacion = p.ubicacion WHERE p.cajap = er.cajano AND (p.entradas - p.salidas) > 0 AND ${ZONA_RECIBO})))::int AS por_almacenar
    FROM t_entradas_ras er WHERE er.describteetiqueta LIKE ${`${PREFIJO_RECEPCION}%`}
    GROUP BY er.describteetiqueta ORDER BY MIN(er.fecha) DESC LIMIT 30`;
}

// ── Almacenamiento dirigido ───────────────────────────────────────────────────────────────────────────────────────

export type Sugerencia = { ubicacion: string; razon: string };

export async function pendientesAlmacenar(db: Db, bodega: string | null, limite = 50) {
  return db.$queryRaw<Record<string, unknown>[]>`
    SELECT p.cajap::bigint AS caja, p.cod_producto AS ean, d.descripcion AS articulo, p.lote, l.fechavence AS vence, (p.entradas - p.salidas) AS saldo, p.ubicacion, p.bodepicking AS bodega,
           INITCAP(LOWER(er.operadorras)) AS calidad, er.describteetiqueta AS origen
    FROM t_pic p JOIN t_ins_coordenadas c ON c.ubicacion = p.ubicacion LEFT JOIN t_entradas_ras er ON er.cajano = p.cajap
    LEFT JOIN t_detalle_referencia d ON d.productoean = p.cod_producto LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = p.lote AND l.codean = p.cod_producto
    WHERE (p.entradas - p.salidas) > 0 AND ${ZONA_RECIBO} ${bodega ? Prisma.sql`AND p.bodepicking = ${bodega}` : Prisma.empty}
    ORDER BY p.cajap LIMIT ${limite}`;
}

export async function contarPendientes(db: Db) {
  const f = await db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_pic p JOIN t_ins_coordenadas c ON c.ubicacion = p.ubicacion WHERE (p.entradas - p.salidas) > 0 AND ${ZONA_RECIBO}`;
  return f[0]?.n ?? 0;
}

/** Hasta tres ubicaciones para guardar la caja, de la más a la menos recomendable. */
export async function sugerirUbicaciones(db: Db, caja: number): Promise<Sugerencia[]> {
  const c = await db.$queryRaw<{ ean: string; lote: string; bodega: string }[]>`SELECT cod_producto AS ean, lote, bodepicking AS bodega FROM t_pic WHERE cajap = ${caja} LIMIT 1`;
  if (!c[0]) return [];
  const { ean, lote, bodega } = c[0];
  const salida: Sugerencia[] = [];
  const ya = new Set<string>();
  const agregar = (u: string | null | undefined, razon: string) => { if (u && !ya.has(u) && salida.length < 3) { ya.add(u); salida.push({ ubicacion: u, razon }); } };

  // 1. Ubicación fija del artículo en esa bodega.
  const fija = await db.insUbicacionesFijasMp.findFirst({ where: { bodega, eanmaterial: ean } });
  if (fija) {
    const posibles = [fija.codubicacion1, fija.codubicacion2, fija.codubicacion3, fija.codubicacion4, fija.codubicacion5].filter((x): x is string => !!x);
    if (posibles.length) {
      const validas = await db.$queryRaw<{ ubicacion: string }[]>`
        SELECT c.ubicacion FROM t_ins_coordenadas c WHERE c.ubicacion = ANY(${posibles}) AND c.bodegac = ${bodega} AND COALESCE(c.seleccion, false) = false AND NOT (${ZONA_NO_ALMACENAR})`;
      const ok = new Set(validas.map((v) => v.ubicacion));
      for (const u of posibles) if (ok.has(u)) agregar(u, "Ubicación fija del artículo");
    }
  }
  // 2. Donde ya está el mismo lote (se consolida).
  const mismo = await db.$queryRaw<{ ubicacion: string }[]>`
    SELECT c.ubicacion FROM t_pic p JOIN t_ins_coordenadas c ON c.ubicacion = p.ubicacion
    WHERE p.cod_producto = ${ean} AND p.lote = ${lote} AND p.cajap <> ${caja} AND (p.entradas - p.salidas) > 0 AND c.bodegac = ${bodega}
      AND COALESCE(c.seleccion, false) = false AND NOT (${ZONA_NO_ALMACENAR}) AND NOT (c.piso > '1' AND c.prioridadrotacion = '1')
    GROUP BY c.ubicacion, c.nro ORDER BY c.nro NULLS LAST, c.ubicacion LIMIT 2`;
  for (const m of mismo) agregar(m.ubicacion, "Ya hay cajas de este lote");
  // 3. Posición libre más cercana (por la ruta de la bodega).
  const libres = await db.$queryRaw<{ ubicacion: string }[]>`
    SELECT c.ubicacion FROM t_ins_coordenadas c
    WHERE c.bodegac = ${bodega} AND COALESCE(c.seleccion, false) = false AND NOT (${ZONA_NO_ALMACENAR}) AND COALESCE(c.ocupacion, 0) = 0
      AND NOT EXISTS (SELECT 1 FROM t_pic p WHERE p.ubicacion = c.ubicacion AND (p.entradas - p.salidas) > 0)
    ORDER BY c.nro NULLS LAST, c.orden NULLS LAST, c.ubicacion LIMIT 3`;
  for (const l of libres) agregar(l.ubicacion, "Posición libre más cercana");
  return salida;
}

/** Lleva una caja del recibo a su ubicación definitiva. Dice si siguió una de las sugerencias. */
export async function almacenar(db: Db, caja: number, ubicacion: string) {
  const en = await db.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM t_pic p JOIN t_ins_coordenadas c ON c.ubicacion = p.ubicacion WHERE p.cajap = ${caja} AND (p.entradas - p.salidas) > 0 AND ${ZONA_RECIBO}`;
  if ((en[0]?.n ?? 0) === 0) throw new ErrorDeNegocio(`La caja ${caja} no está en el recibo: ya está almacenada o no existe. Para moverla usa «Ubicar caja».`);
  const destino = await db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_ins_coordenadas c WHERE UPPER(c.ubicacion) = UPPER(${ubicacion.trim()}) AND ${ZONA_RECIBO}`;
  if ((destino[0]?.n ?? 0) > 0) throw new ErrorDeNegocio("Esa ubicación también es de recibo: elige la ubicación donde va a quedar la caja.");
  const sugeridas = await sugerirUbicaciones(db, caja);
  const r = await reubicarCaja(db, caja, ubicacion, "ALMACENA DIRIGIDO");
  return { ...r, sugerida: sugeridas.some((s) => s.ubicacion.toUpperCase() === r.hasta.toUpperCase()), sugerencias: sugeridas };
}
