import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio, ESTADOS_CALIDAD } from "@/lib/inventario/calidad";
import { recibir, type LineaRecepcion } from "@/lib/recepcion/servicio";
import { ESTADOS } from "./ordenes";

// Recibo ciego: quien recibe cuenta lo que llegó sin ver lo que se esperaba (cantidades de la orden ocultas). El conteo queda «por conciliar»;
// un aprobador lo compara con la orden y lo AUTORIZA (se crean las cajas y se descuenta de la orden, aunque haya diferencias, con una nota
// que las explique) o lo RECHAZA (no pasa nada, hay que recontar). Mientras no se autorice no hay inventario ni se toca la orden.

export type Fila = Record<string, unknown>;
export const ESTADOS_CIEGO = { por_conciliar: "Por conciliar", autorizado: "Autorizado", rechazado: "Rechazado" } as const;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

export async function registrarCiego(db: Db, orden: number, estadoCalidad: string, lineas: LineaRecepcion[], u: { id: string; nombre: string }) {
  if (!(ESTADOS_CALIDAD as readonly string[]).includes(estadoCalidad)) throw new ErrorDeNegocio("Elige el estado de calidad de los lotes nuevos.");
  if (lineas.length === 0) throw new ErrorDeNegocio("Cuenta al menos una línea.");
  if (lineas.length > 100) throw new ErrorDeNegocio("Un conteo admite hasta 100 líneas.");
  const hoy = new Date().toISOString().slice(0, 10);
  lineas.forEach((l, i) => {
    const n = i + 1;
    if (!l.ean.trim()) throw new ErrorDeNegocio(`Línea ${n}: falta el código de barras.`);
    if (!l.lote.trim() || l.lote.trim().length > 30) throw new ErrorDeNegocio(`Línea ${n}: el lote es obligatorio (hasta 30 caracteres).`);
    if (!Number.isInteger(l.cajas) || l.cajas < 1 || l.cajas > 1000) throw new ErrorDeNegocio(`Línea ${n}: las cajas deben ser un entero entre 1 y 1000.`);
    if (!Number.isFinite(l.cantidad) || l.cantidad <= 0 || l.cantidad > 1e7) throw new ErrorDeNegocio(`Línea ${n}: la cantidad por caja debe ser mayor que cero.`);
    if (l.vence && (!/^\d{4}-\d{2}-\d{2}$/.test(l.vence) || new Date(`${l.vence}T00:00:00.000Z`).toISOString().slice(0, 10) !== l.vence)) throw new ErrorDeNegocio(`Línea ${n}: la fecha de vencimiento no es válida.`);
    if (l.vence && l.vence < hoy) throw new ErrorDeNegocio(`Línea ${n}: el lote ya está vencido (${l.vence}).`);
  });
  const eans = [...new Set(lineas.map((l) => l.ean.trim()))];
  const arts = await db.detalleReferencia.findMany({ where: { productoean: { in: eans } }, select: { productoean: true } });
  const conocidos = new Set(arts.map((a) => a.productoean));
  const falta = eans.find((e) => !conocidos.has(e));
  if (falta) throw new ErrorDeNegocio(`No existe el artículo ${falta}.`);
  return db.$transaction(async (tx) => {
    const o = await tx.ordenCompra.findUnique({ where: { numordencompra: orden } });
    if (!o) throw new ErrorDeNegocio(`No existe la orden de compra ${orden}.`);
    if (o.estado !== ESTADOS.abierta && o.estado !== ESTADOS.parcial) throw new ErrorDeNegocio(`La orden ${orden} está ${String(o.estado ?? "").toLowerCase()}: no admite recibos.`);
    const bo = await tx.$queryRaw<{ bodega: string | null }[]>`SELECT DISTINCT bodega FROM t_detalle_orden_compra WHERE nordencompra = ${orden} AND bodega IS NOT NULL`;
    if (bo.length !== 1) throw new ErrorDeNegocio(`La orden ${orden} no tiene una única bodega de recibo.`);
    const r = await tx.reciboCiego.create({
      data: {
        orden, bodega: bo[0].bodega!, calidad: estadoCalidad, creado_por: u.id, creado_nombre: u.nombre.slice(0, 120),
        lineas: { create: lineas.map((l) => ({ ean: l.ean.trim(), lote: l.lote.trim(), vence: l.vence ? new Date(`${l.vence}T00:00:00.000Z`) : null, cajas: l.cajas, cantidad: l.cantidad })) },
      },
    });
    return r.id;
  });
}

export async function listarCiegos(db: Db, estado: "por_conciliar" | "resueltos") {
  return db.$queryRaw<Fila[]>`
    SELECT r.id, r.orden, r.bodega, r.estado, r.fecha, r.creado_nombre AS contador, r.resuelto_nombre AS resolvio, r.fecha_resolucion, r.nota,
           (SELECT COUNT(*)::int FROM recibo_ciego_linea l WHERE l.recibo_id = r.id) AS lineas,
           (SELECT COALESCE(SUM(l.cajas * l.cantidad), 0) FROM recibo_ciego_linea l WHERE l.recibo_id = r.id) AS unidades
    FROM recibo_ciego r WHERE ${estado === "por_conciliar" ? Prisma.sql`r.estado = 'por_conciliar'` : Prisma.sql`r.estado <> 'por_conciliar'`}
    ORDER BY ${estado === "por_conciliar" ? Prisma.sql`r.id ASC` : Prisma.sql`r.fecha_resolucion DESC NULLS LAST, r.id DESC`} LIMIT 100`;
}

/** El conteo frente a la orden: por artículo, lo pedido, lo que faltaba, lo contado y la diferencia. */
export async function fichaCiego(db: Db, id: number) {
  const r = await db.reciboCiego.findUnique({ where: { id }, include: { lineas: { orderBy: { id: "asc" } } } });
  if (!r) return null;
  const orden = await db.ordenCompra.findUnique({ where: { numordencompra: r.orden }, select: { numordencompra: true, estado: true, proveedor: true } });
  const lineasOc = await db.$queryRaw<{ ean: string; articulo: string | null; pedido: number; recibido: number }[]>`
    SELECT d.eanproveedores AS ean, a.descripcion AS articulo, COALESCE(d.requerido, 0) AS pedido, COALESCE(d.recibidok, 0) AS recibido
    FROM t_detalle_orden_compra d LEFT JOIN t_detalle_referencia a ON a.productoean = d.eanproveedores WHERE d.nordencompra = ${r.orden}`;
  const contado = new Map<string, number>();
  for (const l of r.lineas) contado.set(l.ean, r4((contado.get(l.ean) ?? 0) + l.cajas * Number(l.cantidad)));
  const eans = [...new Set([...lineasOc.map((l) => l.ean), ...contado.keys()])];
  const descr = new Map((await db.detalleReferencia.findMany({ where: { productoean: { in: eans } }, select: { productoean: true, descripcion: true } })).map((a) => [a.productoean, a.descripcion]));
  const comparacion = eans.map((ean) => {
    const o = lineasOc.find((l) => l.ean === ean);
    const pendiente = o ? Math.max(r4(o.pedido - o.recibido), 0) : 0;
    const c = contado.get(ean) ?? 0;
    return { ean, articulo: o?.articulo ?? descr.get(ean) ?? ean, enOrden: !!o, pedido: o?.pedido ?? 0, pendiente, contado: c, diferencia: r4(c - pendiente) };
  });
  return { recibo: r, orden, comparacion, hayDiferencias: comparacion.some((c) => Math.abs(c.diferencia) > 1e-9) };
}

export async function autorizarCiego(db: Db, id: number, u: { id: string; nombre: string }, nota: string) {
  const f = await fichaCiego(db, id);
  if (!f) throw new ErrorDeNegocio("El recibo no existe.");
  if (f.recibo.estado !== "por_conciliar") throw new ErrorDeNegocio("El recibo ya fue resuelto.");
  if (f.hayDiferencias && !nota.trim()) throw new ErrorDeNegocio("Hay diferencias contra la orden: explica en la nota por qué se autoriza.");
  const fuera = f.comparacion.find((c) => !c.enOrden);
  if (fuera) throw new ErrorDeNegocio(`El artículo ${fuera.ean} no está en la orden ${f.recibo.orden}: edita la orden para agregarlo o rechaza el conteo.`);
  const lineas: LineaRecepcion[] = f.recibo.lineas.map((l) => ({ ean: l.ean, lote: l.lote, vence: l.vence ? l.vence.toISOString().slice(0, 10) : null, cajas: l.cajas, cantidad: Number(l.cantidad) }));
  return db.$transaction(async (tx) => {
    const m = await tx.reciboCiego.updateMany({ where: { id, estado: "por_conciliar" }, data: { estado: "autorizado", resuelto_por: u.id, resuelto_nombre: u.nombre.slice(0, 120), fecha_resolucion: new Date(), nota: nota.trim().slice(0, 300) || null } });
    if (m.count === 0) throw new ErrorDeNegocio("El recibo ya fue resuelto.");
    const r = await recibir(db, { bodega: f.recibo.bodega, documento: "", nit: null, estado: f.recibo.calidad, lineas, orden: f.recibo.orden, permitirExceso: true }, tx);
    return { ...r, diferencias: f.hayDiferencias };
  }, { timeout: 120000, maxWait: 20000 });
}

export async function rechazarCiego(db: Db, id: number, u: { id: string; nombre: string }, nota: string) {
  if (!nota.trim()) throw new ErrorDeNegocio("Explica por qué se rechaza el conteo.");
  const m = await db.reciboCiego.updateMany({ where: { id, estado: "por_conciliar" }, data: { estado: "rechazado", resuelto_por: u.id, resuelto_nombre: u.nombre.slice(0, 120), fecha_resolucion: new Date(), nota: nota.trim().slice(0, 300) } });
  if (m.count === 0) throw new ErrorDeNegocio("El recibo ya fue resuelto o no existe.");
}
