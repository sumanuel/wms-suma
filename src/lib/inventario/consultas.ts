import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";

// Consultas de inventario. El stock del WMS son las cajas (t_pic): saldo = entradas − salidas (en el sistema anterior era
// una columna calculada). Una caja cuenta como existencia si tiene ubicación y saldo positivo, igual que en
// usp_ObtenerDsInventariosxEANWms. Se usa SQL directo porque agrega y calcula; todo valor del usuario va como parámetro y
// el orden sale de listas cerradas, nunca de texto libre.

export type Orden = { columna: string; dir: "asc" | "desc" };
export type PedidoConsulta = { texto: string; filtros: Record<string, string>; orden: Orden[]; salto: number; cantidad: number };
export type Fila = Record<string, unknown>;

const SALDO = Prisma.sql`(p.entradas - p.salidas)`;

function ordenarPor(orden: Orden[], permitidas: Record<string, string>, porDefecto: string) {
  const o = orden[0];
  const expr = o && permitidas[o.columna] ? permitidas[o.columna] : porDefecto;
  return Prisma.raw(`${expr} ${o?.dir === "desc" ? "DESC" : "ASC"} NULLS LAST`);
}

function buscar(texto: string, columnas: string[]) {
  if (!texto) return null;
  const patron = `%${texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return Prisma.sql`(${Prisma.join(columnas.map((c) => Prisma.sql`${Prisma.raw(c)}::text ILIKE ${patron}`), " OR ")})`;
}

function donde(condiciones: (Prisma.Sql | null)[]) {
  const c = condiciones.filter((x): x is Prisma.Sql => x !== null);
  return c.length ? Prisma.sql`WHERE ${Prisma.join(c, " AND ")}` : Prisma.empty;
}

const EXISTENCIA = Prisma.sql`COALESCE(p.ubicacion, '') <> '' AND ${SALDO} > 0`;

export async function bodegasConStock(db: Db) {
  const f = await db.insBodega.findMany({ select: { bodega: true, descripcion: true }, orderBy: { bodega: "asc" } });
  return f.map((b) => ({ valor: b.bodega, etiqueta: `${b.bodega}${b.descripcion ? ` · ${b.descripcion}` : ""}` }));
}

// ── Existencias por artículo ──────────────────────────────────────────────────────────────────────────────────────

export async function existenciasPorArticulo(db: Db, q: PedidoConsulta) {
  const where = donde([
    EXISTENCIA,
    buscar(q.texto, ["p.cod_producto", "d.descripcion", "d.codigoreferencia"]),
    q.filtros.bodega ? Prisma.sql`p.bodepicking = ${q.filtros.bodega}` : null,
  ]);
  const base = Prisma.sql`FROM t_pic p LEFT JOIN t_detalle_referencia d ON d.productoean = p.cod_producto ${where}`;
  const orden = ordenarPor(
    q.orden,
    { ean: "p.cod_producto", descripcion: "MAX(d.descripcion)", cajas: "COUNT(*)", saldo: `SUM(p.entradas - p.salidas)`, reserva: "SUM(COALESCE(p.reserva, 0))" },
    "MAX(d.descripcion)",
  );
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT p.cod_producto AS ean, MAX(d.descripcion) AS descripcion, MAX(d.um1) AS unidad, MAX(d.codigoreferencia) AS referencia,
             COUNT(*)::int AS cajas, COUNT(DISTINCT p.lote)::int AS lotes,
             SUM(p.entradas - p.salidas) AS saldo, SUM(COALESCE(p.reserva, 0)) AS reserva,
             SUM(p.entradas - p.salidas) - SUM(COALESCE(p.reserva, 0)) AS disponible
      ${base} GROUP BY p.cod_producto ORDER BY ${orden}, p.cod_producto LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM (SELECT 1 ${base} GROUP BY p.cod_producto) t`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

// ── Cajas con saldo ───────────────────────────────────────────────────────────────────────────────────────────────

export async function cajasConSaldo(db: Db, q: PedidoConsulta) {
  const where = donde([
    EXISTENCIA,
    buscar(q.texto, ["p.cajap", "p.cod_producto", "d.descripcion", "p.lote", "p.ubicacion"]),
    q.filtros.bodega ? Prisma.sql`p.bodepicking = ${q.filtros.bodega}` : null,
    q.filtros.estado ? Prisma.sql`LOWER(COALESCE(e.operadorras, '')) = ${q.filtros.estado}` : null,
    q.filtros.vence === "vencidas" ? Prisma.sql`l.fechavence < now()` : null,
    q.filtros.vence === "30" ? Prisma.sql`l.fechavence >= now() AND l.fechavence < now() + interval '30 days'` : null,
  ]);
  const base = Prisma.sql`FROM t_pic p
    LEFT JOIN t_detalle_referencia d ON d.productoean = p.cod_producto
    LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = p.lote AND l.codean = p.cod_producto
    LEFT JOIN t_entradas_ras e ON e.cajano = p.cajap ${where}`;
  const orden = ordenarPor(
    q.orden,
    { caja: "p.cajap", ean: "p.cod_producto", descripcion: "d.descripcion", lote: "p.lote", ubicacion: "p.ubicacion", bodega: "p.bodepicking", saldo: "(p.entradas - p.salidas)", vence: "l.fechavence", estado: "e.operadorras" },
    "l.fechavence",
  );
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT p.cajap AS caja, p.cod_producto AS ean, d.descripcion, d.um1 AS unidad, p.lote, p.ubicacion, p.bodepicking AS bodega,
             (p.entradas - p.salidas) AS saldo, COALESCE(p.reserva, 0) AS reserva, l.fechavence AS vence, e.operadorras AS estado
      ${base} ORDER BY ${orden}, p.ubicacion, p.cajap LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n ${base}`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

// ── Lotes ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const LOTES_DESDE = Prisma.sql`FROM t_maestro_lote_pt l
  LEFT JOIN t_detalle_referencia d ON d.productoean = l.codean
  LEFT JOIN LATERAL (
    SELECT h.estado FROM t_historia_status_calidad h
    WHERE h.lote = l.loteproveedor AND h.productoean = l.codean ORDER BY h.id DESC LIMIT 1
  ) h ON true
  LEFT JOIN (
    SELECT p.lote, p.cod_producto, SUM(p.entradas - p.salidas) AS saldo, COUNT(*)::int AS cajas
    FROM t_pic p GROUP BY p.lote, p.cod_producto
  ) s ON s.lote = l.loteproveedor AND s.cod_producto = l.codean`;

export async function lotes(db: Db, q: PedidoConsulta) {
  const where = donde([
    buscar(q.texto, ["l.loteproveedor", "l.codean", "d.descripcion", "l.nitprov", "l.numcontrolliberacion"]),
    q.filtros.estado === "sin" ? Prisma.sql`h.estado IS NULL` : q.filtros.estado ? Prisma.sql`LOWER(h.estado) = ${q.filtros.estado}` : null,
    q.filtros.vence === "vencidos" ? Prisma.sql`l.fechavence < now()` : null,
    q.filtros.vence === "30" ? Prisma.sql`l.fechavence >= now() AND l.fechavence < now() + interval '30 days'` : null,
    q.filtros.saldo === "con" ? Prisma.sql`COALESCE(s.saldo, 0) > 0` : null,
  ]);
  const orden = ordenarPor(
    q.orden,
    { lote: "l.loteproveedor", ean: "l.codean", descripcion: "d.descripcion", ingreso: "l.fechaingresa", vence: "l.fechavence", estado: "h.estado", saldo: "COALESCE(s.saldo, 0)", cajas: "COALESCE(s.cajas, 0)" },
    "l.fechaingresa",
  );
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT l.idlote, l.loteproveedor AS lote, l.codean AS ean, d.descripcion, l.nitprov AS proveedor, l.fechaingresa AS ingreso,
             l.fechavence AS vence, l.numcontrolliberacion AS control, h.estado, COALESCE(s.saldo, 0) AS saldo, COALESCE(s.cajas, 0) AS cajas
      ${LOTES_DESDE} ${where} ORDER BY ${orden}, l.idlote DESC LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n ${LOTES_DESDE} ${where}`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

/** Un lote con su estado actual y su saldo, por el número interno (idlote). */
export async function loteCompleto(db: Db, idlote: number) {
  const r = await db.$queryRaw<Fila[]>`
    SELECT l.idlote, l.loteproveedor AS lote, l.codean AS ean, d.descripcion, d.um1 AS unidad, l.nitprov AS proveedor,
           l.fechaingresa AS ingreso, l.fechavence AS vence, l.numcontrolliberacion AS control, l.pedproveedor, l.ord_no,
           h.estado, COALESCE(s.saldo, 0) AS saldo, COALESCE(s.cajas, 0) AS cajas
    ${LOTES_DESDE} WHERE l.idlote = ${idlote}`;
  return r[0] ?? null;
}

export async function cajasDelLote(db: Db, lote: string, ean: string) {
  return db.$queryRaw<Fila[]>`
    SELECT p.cajap AS caja, p.ubicacion, p.bodepicking AS bodega, (p.entradas - p.salidas) AS saldo, COALESCE(p.reserva, 0) AS reserva,
           e.operadorras AS estado, e.tipocaja AS tipo
    FROM t_pic p LEFT JOIN t_entradas_ras e ON e.cajano = p.cajap
    WHERE p.lote = ${lote} AND p.cod_producto = ${ean} ORDER BY p.cajap LIMIT 500`;
}
