import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "./calidad";

// Ajuste manual del saldo de una caja (t_pic_ajuste). Corrige una diferencia puntual —un faltante, un sobrante, una avería— con
// su motivo, sin pasar por un conteo. Deja el registro del ajuste con el saldo de antes y la entrada o salida, y mueve el saldo
// de la caja: si sube, aumentan las entradas; si baja, aumentan las salidas (nunca quedan salidas negativas). No deja el saldo por
// debajo de lo reservado ni por debajo de cero. Es el mismo registro que usan el conteo y la carga inicial, distinguido por su motivo.

export const PREFIJO_MANUAL = "Ajuste manual";
import { MODOS, MOTIVOS, type Modo, type Motivo } from "./ajustes-tipos";
export { MODOS, MOTIVOS, type Modo, type Motivo };
const r4 = (n: number) => Math.round(n * 10000) / 10000;

export type Fila = Record<string, unknown>;
export type Orden = { columna: string; dir: "asc" | "desc" };
export type PedidoConsulta = { texto: string; filtros: Record<string, string>; orden: Orden[]; salto: number; cantidad: number };

export type CajaAjustable = {
  caja: number; ean: string; descripcion: string | null; unidad: string | null; bodega: string; lote: string; ubicacion: string | null; saldo: number; reservado: number; estado: string | null;
};

/** Las cajas con ese número (normalmente una). */
export async function buscarCaja(db: Db, numero: number): Promise<CajaAjustable[]> {
  const f = await db.$queryRaw<{ caja: number; ean: string; descripcion: string | null; unidad: string | null; bodega: string; lote: string; ubicacion: string | null; saldo: Prisma.Decimal; reservado: Prisma.Decimal | null; estado: string | null }[]>`
    SELECT p.cajap AS caja, p.cod_producto AS ean, d.descripcion, d.um1 AS unidad, p.bodepicking AS bodega, p.lote, p.ubicacion,
           (p.entradas - p.salidas) AS saldo, p.reserva AS reservado, er.operadorras AS estado
    FROM t_pic p LEFT JOIN t_detalle_referencia d ON d.productoean = p.cod_producto LEFT JOIN t_entradas_ras er ON er.cajano = p.cajap
    WHERE p.cajap = ${numero} ORDER BY p.cod_producto`;
  return f.map((x) => ({ ...x, saldo: Number(x.saldo), reservado: Number(x.reservado ?? 0) }));
}

export type DatosAjuste = { caja: number; ean: string; bodega: string; modo: Modo; cantidad: number; motivo: Motivo; detalle: string | null; soporte: string | null };

export async function ajustarCaja(db: Db, d: DatosAjuste) {
  if (!(MOTIVOS as readonly string[]).includes(d.motivo)) throw new ErrorDeNegocio("Elige un motivo de la lista.");
  if (d.motivo === "Otro" && !d.detalle?.trim()) throw new ErrorDeNegocio("Con el motivo «Otro» explica qué pasó en el detalle.");
  if (!Number.isFinite(d.cantidad) || d.cantidad < 0 || d.cantidad > 1e9) throw new ErrorDeNegocio("La cantidad debe ser un número, cero o más.");
  if (d.modo !== "fijar" && d.cantidad === 0) throw new ErrorDeNegocio("La cantidad a sumar o restar debe ser mayor que cero.");

  return db.$transaction(async (tx) => {
    const f = await tx.$queryRaw<{ entradas: Prisma.Decimal | null; salidas: Prisma.Decimal | null; reserva: Prisma.Decimal | null; lote: string; ubicacion: string | null }[]>`
      SELECT entradas, salidas, reserva, lote, ubicacion FROM t_pic WHERE cajap = ${d.caja} AND cod_producto = ${d.ean} AND bodepicking = ${d.bodega} FOR UPDATE`;
    const c = f[0];
    if (!c) throw new ErrorDeNegocio("La caja ya no existe en el inventario.");
    const saldo = r4(Number(c.entradas ?? 0) - Number(c.salidas ?? 0));
    const reservado = Number(c.reserva ?? 0);
    const nuevo = r4(d.modo === "fijar" ? d.cantidad : d.modo === "sumar" ? saldo + d.cantidad : saldo - d.cantidad);
    const dif = r4(nuevo - saldo);
    if (nuevo < 0) throw new ErrorDeNegocio(`No se puede dejar la caja en ${nuevo}: solo tiene ${saldo}.`);
    if (dif === 0) throw new ErrorDeNegocio("No hay diferencia: el saldo ya es ese.");
    if (nuevo + 1e-9 < reservado) throw new ErrorDeNegocio(`La caja tiene ${reservado} reservados (en un picking): el saldo no puede quedar por debajo. Libera o elimina el picking primero.`);

    await tx.$executeRaw`
      UPDATE t_pic SET entradas = entradas + ${dif > 0 ? dif : 0}, salidas = salidas + ${dif < 0 ? -dif : 0}
      WHERE cajap = ${d.caja} AND cod_producto = ${d.ean} AND bodepicking = ${d.bodega}`;
    // Caja vaciada: como al pickearla, sin reserva y, si no es recargable, deja su ubicación.
    if (nuevo <= 0) {
      const er = await tx.entradasRas.findUnique({ where: { cajano: d.caja }, select: { cajarecargable: true } });
      await tx.$executeRaw`UPDATE t_pic SET reserva = 0, ordenestiba = -1, ubicacion = ${(er?.cajarecargable ?? 0) === 0 ? "" : c.ubicacion ?? ""} WHERE cajap = ${d.caja} AND cod_producto = ${d.ean} AND bodepicking = ${d.bodega}`;
      if (c.ubicacion) {
        const quedan = await tx.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_pic WHERE ubicacion = ${c.ubicacion} AND (entradas - salidas) > 0`;
        if ((quedan[0]?.n ?? 0) === 0) await tx.insCoordenadas.updateMany({ where: { ubicacion: c.ubicacion }, data: { ocupacion: 0 } });
      }
    }
    const motivo = `${PREFIJO_MANUAL} · ${d.motivo}${d.detalle?.trim() ? `: ${d.detalle.trim()}` : ""}`.slice(0, 500);
    const ajuste = await tx.picAjuste.create({
      data: {
        caja: d.caja, fecha: new Date(), saldoinicial: saldo, qtyentrada: dif > 0 ? dif : 0, qtysale: dif < 0 ? -dif : 0, motivoajuste: motivo, loteproveedor: c.lote.slice(0, 20),
        numdocumento: d.soporte?.trim().slice(0, 50) || null, ubicacion_sale: c.ubicacion?.slice(0, 20) ?? null,
      },
    });
    return { id: ajuste.id, antes: saldo, despues: nuevo, diferencia: dif, motivo };
  });
}

// ── Lista ─────────────────────────────────────────────────────────────────────────────────────────────────────────

function ordenarPor(orden: Orden[], permitidas: Record<string, string>, porDefecto: string) {
  const o = orden[0];
  const expr = o && permitidas[o.columna] ? permitidas[o.columna] : porDefecto;
  return Prisma.raw(`${expr} ${o?.dir === "desc" ? "DESC" : "ASC"} NULLS LAST`);
}

export async function listarAjustes(db: Db, q: PedidoConsulta) {
  const cond: Prisma.Sql[] = [];
  if (q.texto) {
    const p = `%${q.texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    cond.push(Prisma.sql`(a.caja::text ILIKE ${p} OR a.loteproveedor ILIKE ${p} OR a.motivoajuste ILIKE ${p} OR a.numdocumento ILIKE ${p} OR d.descripcion ILIKE ${p} OR er.producto ILIKE ${p})`);
  }
  const origen = Prisma.sql`(CASE WHEN a.motivoajuste LIKE ${`${PREFIJO_MANUAL}%`} THEN 'manual' WHEN a.motivoajuste LIKE 'Conteo%' THEN 'conteo' WHEN a.motivoajuste LIKE 'Carga de inventario%' THEN 'carga' ELSE 'otro' END)`;
  if (q.filtros.origen) cond.push(Prisma.sql`${origen} = ${q.filtros.origen}`);
  if (q.filtros.sentido === "entrada") cond.push(Prisma.sql`COALESCE(a.qtyentrada, 0) > 0`);
  if (q.filtros.sentido === "salida") cond.push(Prisma.sql`COALESCE(a.qtysale, 0) > 0`);
  const donde = cond.length ? Prisma.sql`WHERE ${Prisma.join(cond, " AND ")}` : Prisma.empty;
  const desde = Prisma.sql`FROM t_pic_ajuste a LEFT JOIN t_entradas_ras er ON er.cajano = a.caja LEFT JOIN t_detalle_referencia d ON d.productoean = er.producto`;
  const orden = ordenarPor(q.orden, { fecha: "a.fecha", caja: "a.caja", lote: "a.loteproveedor", articulo: "d.descripcion", entrada: "a.qtyentrada", salida: "a.qtysale" }, "a.fecha");
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT a.id, a.fecha, a.caja, er.producto AS ean, d.descripcion AS articulo, a.loteproveedor AS lote, a.ubicacion_sale AS ubicacion, a.saldoinicial AS antes,
             COALESCE(a.qtyentrada, 0) AS entrada, COALESCE(a.qtysale, 0) AS salida, (COALESCE(a.saldoinicial, 0) + COALESCE(a.qtyentrada, 0) - COALESCE(a.qtysale, 0)) AS despues,
             ${origen} AS origen, a.motivoajuste AS motivo, a.numdocumento AS soporte
      ${desde} ${donde} ORDER BY ${orden}, a.id DESC LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n ${desde} ${donde}`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}
