import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";

// Servicios de la terminal móvil que no existían en las pantallas de escritorio: consulta por lector y reubicación de cajas.
export type Fila = Record<string, unknown>;
export type TipoBusqueda = "auto" | "caja" | "ubicacion" | "articulo" | "pallet";
export const TIPOS: Record<TipoBusqueda, string> = { auto: "Automático", caja: "Caja", ubicacion: "Ubicación", articulo: "Artículo", pallet: "Pallet" };

export type Consulta =
  | { tipo: "caja"; caja: Fila; pallet: number | null }
  | { tipo: "ubicacion"; ubicacion: string; bodega: string | null; bloqueada: boolean; cajas: Fila[] }
  | { tipo: "articulo"; ean: string; descripcion: string | null; total: number; filas: Fila[] }
  | { tipo: "pallet"; pallet: number; cajas: Fila[]; unidades: number }
  | { tipo: "nada" };

const esNumero = (t: string) => /^\d{1,15}$/.test(t);

async function comoCaja(db: Db, n: number): Promise<Consulta | null> {
  const f = await db.$queryRaw<Fila[]>`
    SELECT p.cajap::bigint AS caja, p.cod_producto AS ean, d.descripcion, d.um1 AS unidad, p.lote, l.fechavence AS vence, p.ubicacion, p.bodepicking AS bodega,
           (p.entradas - p.salidas) AS saldo, COALESCE(p.reserva, 0) AS reservado, INITCAP(LOWER(er.operadorras)) AS calidad
    FROM t_pic p LEFT JOIN t_detalle_referencia d ON d.productoean = p.cod_producto LEFT JOIN t_entradas_ras er ON er.cajano = p.cajap
    LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = p.lote AND l.codean = p.cod_producto WHERE p.cajap = ${n} LIMIT 1`;
  if (!f[0]) return null;
  const pa = await db.$queryRaw<{ p: number }[]>`SELECT cajapallet::bigint::float AS p FROM t_pallets WHERE cajaasociada = ${String(n)} LIMIT 1`;
  return { tipo: "caja", caja: f[0], pallet: pa[0] ? Number(pa[0].p) : null };
}

async function comoUbicacion(db: Db, t: string): Promise<Consulta | null> {
  const u = await db.$queryRaw<{ ubicacion: string; bodegac: string | null; seleccion: boolean | null }[]>`SELECT ubicacion, bodegac, seleccion FROM t_ins_coordenadas WHERE UPPER(ubicacion) = UPPER(${t}) LIMIT 1`;
  if (!u[0]) return null;
  const cajas = await db.$queryRaw<Fila[]>`
    SELECT p.cajap::bigint AS caja, p.cod_producto AS ean, d.descripcion, p.lote, (p.entradas - p.salidas) AS saldo
    FROM t_pic p LEFT JOIN t_detalle_referencia d ON d.productoean = p.cod_producto WHERE p.ubicacion = ${u[0].ubicacion} AND (p.entradas - p.salidas) > 0 ORDER BY p.cajap LIMIT 100`;
  return { tipo: "ubicacion", ubicacion: u[0].ubicacion, bodega: u[0].bodegac, bloqueada: !!u[0].seleccion, cajas };
}

async function comoArticulo(db: Db, t: string): Promise<Consulta | null> {
  const a = await db.$queryRaw<{ productoean: string; descripcion: string | null }[]>`
    SELECT productoean, descripcion FROM t_detalle_referencia WHERE productoean = ${t} OR codigoreferencia = ${t} ORDER BY (productoean = ${t}) DESC LIMIT 1`;
  if (!a[0]) return null;
  const filas = await db.$queryRaw<Fila[]>`
    SELECT p.ubicacion, p.lote, l.fechavence AS vence, COUNT(*)::int AS cajas, SUM(p.entradas - p.salidas) AS saldo, INITCAP(LOWER(MIN(er.operadorras))) AS calidad
    FROM t_pic p LEFT JOIN t_entradas_ras er ON er.cajano = p.cajap LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = p.lote AND l.codean = p.cod_producto
    WHERE p.cod_producto = ${a[0].productoean} AND (p.entradas - p.salidas) > 0 GROUP BY p.ubicacion, p.lote, l.fechavence ORDER BY l.fechavence NULLS LAST, p.ubicacion LIMIT 100`;
  return { tipo: "articulo", ean: a[0].productoean, descripcion: a[0].descripcion, total: filas.reduce((s, x) => s + Number(x.saldo ?? 0), 0), filas };
}

async function comoPallet(db: Db, n: number): Promise<Consulta | null> {
  const cajas = await db.$queryRaw<Fila[]>`
    SELECT pa.cajaasociada AS caja, p.cod_producto AS ean, d.descripcion, p.lote, (p.entradas - p.salidas) AS saldo, p.ubicacion
    FROM t_pallets pa LEFT JOIN t_pic p ON p.cajap::bigint::text = pa.cajaasociada LEFT JOIN t_detalle_referencia d ON d.productoean = p.cod_producto
    WHERE pa.cajapallet = ${n} ORDER BY pa.idpallet`;
  if (cajas.length === 0) return null;
  return { tipo: "pallet", pallet: n, cajas, unidades: cajas.reduce((s, x) => s + Number(x.saldo ?? 0), 0) };
}

export async function consultar(db: Db, texto: string, tipo: TipoBusqueda): Promise<Consulta> {
  const t = texto.trim();
  if (!t) return { tipo: "nada" };
  const n = esNumero(t) ? Number(t) : null;
  if (tipo === "caja") return (n !== null ? await comoCaja(db, n) : null) ?? { tipo: "nada" };
  if (tipo === "ubicacion") return (await comoUbicacion(db, t)) ?? { tipo: "nada" };
  if (tipo === "articulo") return (await comoArticulo(db, t)) ?? { tipo: "nada" };
  if (tipo === "pallet") return (n !== null ? await comoPallet(db, n) : null) ?? { tipo: "nada" };
  // Automático: ubicación, caja, artículo y, al final, pallet.
  return (await comoUbicacion(db, t)) ?? (n !== null ? await comoCaja(db, n) : null) ?? (await comoArticulo(db, t)) ?? (n !== null ? await comoPallet(db, n) : null) ?? { tipo: "nada" };
}

/** Lleva una caja a otra ubicación (como «Ubicar caja» del lector). La saca del pallet si estaba en uno. */
export async function reubicarCaja(db: Db, caja: number, ubicacion: string, transaccion = "UBICAR CAJA") {
  const ub = ubicacion.trim();
  if (!Number.isInteger(caja) || caja <= 0) throw new ErrorDeNegocio("Lee o escribe el número de la caja.");
  if (!ub) throw new ErrorDeNegocio("Lee o escribe la ubicación de destino.");
  return db.$transaction(async (tx) => {
    const c = await tx.$queryRaw<{ ean: string; lote: string; bodega: string; ubicacion: string | null; saldo: Prisma.Decimal }[]>`
      SELECT cod_producto AS ean, lote, bodepicking AS bodega, ubicacion, (entradas - salidas) AS saldo FROM t_pic WHERE cajap = ${caja} FOR UPDATE`;
    const cx = c[0];
    if (!cx) throw new ErrorDeNegocio(`La caja ${caja} no existe en el inventario.`);
    const u = await tx.$queryRaw<{ ubicacion: string; bodegac: string | null; seleccion: boolean | null }[]>`SELECT ubicacion, bodegac, seleccion FROM t_ins_coordenadas WHERE UPPER(ubicacion) = UPPER(${ub})`;
    if (!u[0]?.bodegac) throw new ErrorDeNegocio(`La ubicación «${ub}» no existe.`);
    const destino = u[0].ubicacion;
    if (u[0].seleccion) throw new ErrorDeNegocio(`La ubicación «${destino}» está bloqueada.`);
    if (destino === cx.ubicacion) throw new ErrorDeNegocio(`La caja ya está en «${destino}».`);
    const ocupada = await tx.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM t_pic p JOIN t_ins_coordenadas c ON c.ubicacion = p.ubicacion
      WHERE p.ubicacion = ${destino} AND c.piso > '1' AND c.prioridadrotacion = '1' AND (p.entradas - p.salidas) > 0 AND p.cajap <> ${caja}`;
    if ((ocupada[0]?.n ?? 0) > 0) throw new ErrorDeNegocio(`La posición de almacenamiento «${destino}» está ocupada.`);
    const bi = cx.ubicacion ? await tx.$queryRaw<{ bodegac: string | null }[]>`SELECT bodegac FROM t_ins_coordenadas WHERE ubicacion = ${cx.ubicacion}` : [];
    await tx.$executeRaw`DELETE FROM t_pallets WHERE cajaasociada = ${String(caja)}`;
    await tx.$executeRaw`UPDATE t_pic SET ubicacion = ${destino}, bodepicking = ${u[0].bodegac} WHERE cajap = ${caja}`;
    await tx.$executeRaw`
      INSERT INTO tgg_t_reg_movimientosdecaja (caja, ubicacion, fecha, idempleado, transaccion, ubicacion_inicial, saldo, productoean, loteproveedor, bodega_inicial, bodega_final)
      VALUES (${caja}, ${destino}, now(), 0, ${transaccion}, ${cx.ubicacion}, ${Number(cx.saldo)}, ${cx.ean}, ${cx.lote}, ${bi[0]?.bodegac ?? cx.bodega}, ${u[0].bodegac})`;
    await tx.$executeRaw`UPDATE t_ins_coordenadas SET ocupacion = 1 WHERE ubicacion = ${destino}`;
    if (cx.ubicacion) {
      const quedan = await tx.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_pic WHERE ubicacion = ${cx.ubicacion} AND (entradas - salidas) > 0`;
      if ((quedan[0]?.n ?? 0) === 0) await tx.$executeRaw`UPDATE t_ins_coordenadas SET ocupacion = 0 WHERE ubicacion = ${cx.ubicacion}`;
    }
    return { desde: cx.ubicacion, hasta: destino, saldo: Number(cx.saldo) };
  });
}

export async function pickingsPendientes(db: Db) {
  return db.$queryRaw<Fila[]>`
    SELECT ep.idmovimiento AS id, ep.npedid AS pedido, ep.bodegapicking AS bodega, ep.fecha, COUNT(d.iddetpripack)::int AS lineas,
           (COUNT(*) FILTER (WHERE COALESCE(d.estadolinea, 0) = 3))::int AS pickeadas
    FROM t_encabezado_prepack ep JOIN t_detalle_prepack d ON d.numpicking = ep.idmovimiento
    WHERE ep.valida = 3 GROUP BY ep.idmovimiento ORDER BY ep.idmovimiento`;
}

export async function conteosAbiertos(db: Db) {
  return db.$queryRaw<Fila[]>`
    SELECT e.idconteo AS id, e.fecha, e.bodega, COALESCE(e.tipoconteo, 1) AS tipo, COUNT(l.idconsecutivo)::int AS lineas, (COUNT(*) FILTER (WHERE l.estado = 1))::int AS contadas
    FROM t_temporar_encabezado_conteowms e LEFT JOIN t_temporal_conteowms l ON l.idconteo = e.idconteo
    WHERE COALESCE(e.estado, 0) <> 100 GROUP BY e.idconteo ORDER BY e.idconteo`;
}
