import "server-only";
import type { Db } from "@/lib/tenant";
import { resumenDespacho } from "@/lib/despacho/servicio";
import { sscc } from "@/lib/etiquetas/codigos";

type L = { caja: number; ean: string; articulo: string | null; presentacion: string | null; cantidad: unknown; lote: string | null; vence: Date | null; tipo: string | null };

/** Cajas de despacho de un picking (las que armó la aduana), con su destino y su SSCC. */
export async function etiquetasDespacho(db: Db, picking: number) {
  const r = await resumenDespacho(db, picking);
  if (!r) return null;
  const lineas = await db.$queryRaw<L[]>`
    SELECT a.numdecaja AS caja, a.productoean AS ean, d.descripcion AS articulo, d.um1 AS presentacion, a.cantidad, a.lote, l.fechavence AS vence, a.tipocaja AS tipo
    FROM t_aduana_wms_pos a LEFT JOIN t_detalle_referencia d ON d.productoean = a.productoean
    LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = a.lote AND l.codean = a.productoean
    WHERE a.numpicking = ${picking} ORDER BY a.numdecaja, a.id`;
  const nombre = r.sede?.nombrecliente ?? r.cliente?.nombrecliente ?? "";
  const cajas = [...new Set(lineas.map((x) => Number(x.caja)))].map((n) => ({
    numero: n,
    sscc: sscc(picking, n),
    lineas: lineas.filter((x) => Number(x.caja) === n).map((x) => ({ ean: x.ean, articulo: x.articulo ?? x.ean, presentacion: x.presentacion ?? "", cantidad: Number(x.cantidad ?? 0), lote: x.lote ?? "", vence: x.vence, tipo: x.tipo ?? "" })),
  }));
  return {
    picking, pedido: r.pedido?.npedido ?? "", cliente: nombre, direccion: r.sede?.direccion ?? "", ciudad: r.sede?.ciudad ?? "", telefono: r.sede?.telefono ?? "",
    total: cajas.length, cajas,
  };
}

export type CajaInventario = { caja: number; ean: string; articulo: string; lote: string; vence: Date | null; cantidad: number; ubicacion: string; impresa: number };

/** Etiquetas de cajas de inventario (entradas) en un rango de números de caja. */
export async function etiquetasCajas(db: Db, desde: number, hasta: number): Promise<CajaInventario[]> {
  const f = await db.$queryRaw<{ caja: number; ean: string; articulo: string | null; lote: string | null; vence: Date | null; cantidad: unknown; ubicacion: string | null; impresa: number | null }[]>`
    SELECT er.cajano::bigint AS caja, er.producto AS ean, COALESCE(d.descripcion, er.des_articulo) AS articulo, er.lote_orden AS lote, l.fechavence AS vence,
           COALESCE(p.entradas - p.salidas, er.saldoactual, er.cantidadprog, 0) AS cantidad, p.ubicacion, er.impresa
    FROM t_entradas_ras er LEFT JOIN t_pic p ON p.cajap = er.cajano LEFT JOIN t_detalle_referencia d ON d.productoean = er.producto
    LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = er.lote_orden AND l.codean = er.producto
    WHERE er.cajano >= ${desde} AND er.cajano <= ${hasta} ORDER BY er.cajano LIMIT 200`;
  return f.map((x) => ({ caja: Number(x.caja), ean: x.ean, articulo: x.articulo ?? x.ean, lote: x.lote ?? "", vence: x.vence, cantidad: Number(x.cantidad ?? 0), ubicacion: x.ubicacion ?? "", impresa: x.impresa ?? 0 }));
}

export async function registrarImpresion(db: Db, cajas: number[]) {
  if (cajas.length === 0) return;
  await db.$executeRaw`UPDATE t_entradas_ras SET impresa = COALESCE(impresa, 0) + 1 WHERE cajano = ANY(${cajas}::float8[])`;
}
