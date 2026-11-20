import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { reubicarCajaTx } from "@/lib/movil/servicio";

// Resurtido: mantiene abiertas las ubicaciones de picking. Una regla dice, para un artículo en una ubicación de picking, el mínimo
// y el máximo que debe haber. Cuando lo libre (saldo menos reservado, más lo que ya viene en tareas pendientes) baja al mínimo, se
// generan tareas para traer cajas completas del almacenamiento —primero las que vencen antes (FEFO)— hasta cubrir el máximo.
// Solo se traen cajas aprobadas, vigentes, sin reservas y de ubicaciones de almacenamiento no bloqueadas.

export type Fila = Record<string, unknown>;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
export const MAX_TAREAS_POR_GENERACION = 500;

// ── Reglas ────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listarReglas(db: Db) {
  return db.$queryRaw<Fila[]>`
    SELECT r.id, r.bodega, r.ean, d.descripcion AS articulo, r.ubicacion, r.minimo, r.maximo,
           COALESCE((SELECT SUM(p.entradas - p.salidas - COALESCE(p.reserva, 0)) FROM t_pic p WHERE p.ubicacion = r.ubicacion AND p.cod_producto = r.ean AND (p.entradas - p.salidas) > 0), 0) AS libre,
           COALESCE((SELECT SUM(t.cantidad) FROM resurtido_tarea t WHERE t.regla_id = r.id AND t.estado = 'pendiente'), 0) AS en_camino
    FROM resurtido_regla r LEFT JOIN t_detalle_referencia d ON d.productoean = r.ean ORDER BY r.bodega, r.ubicacion, r.ean`;
}

export async function crearRegla(db: Db, d: { bodega: string; ean: string; ubicacion: string; minimo: number; maximo: number }) {
  const ean = d.ean.trim(), ubicacion = d.ubicacion.trim(), bodega = d.bodega.trim();
  if (!Number.isFinite(d.minimo) || d.minimo < 0 || !Number.isFinite(d.maximo) || d.maximo <= 0) throw new ErrorDeNegocio("El mínimo debe ser cero o más y el máximo mayor que cero.");
  if (d.maximo <= d.minimo) throw new ErrorDeNegocio("El máximo debe ser mayor que el mínimo.");
  if (!(await db.detalleReferencia.findUnique({ where: { productoean: ean }, select: { productoean: true } }))) throw new ErrorDeNegocio(`No existe el artículo ${ean}.`);
  const u = await db.insCoordenadas.findFirst({ where: { ubicacion }, select: { ubicacion: true, bodegac: true } });
  if (!u) throw new ErrorDeNegocio(`No existe la ubicación «${ubicacion}».`);
  if (u.bodegac !== bodega) throw new ErrorDeNegocio(`La ubicación ${u.ubicacion} es de la bodega ${u.bodegac}, no de ${bodega}.`);
  try {
    return await db.resurtidoRegla.create({ data: { bodega, ean, ubicacion: u.ubicacion, minimo: d.minimo, maximo: d.maximo } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ErrorDeNegocio("Ya hay una regla para ese artículo en esa ubicación.");
    throw e;
  }
}

export async function eliminarRegla(db: Db, id: number) {
  const n = await db.$transaction(async (tx) => {
    await tx.resurtidoTarea.updateMany({ where: { regla_id: id, estado: "pendiente" }, data: { estado: "cancelada", nota: "Se eliminó la regla" } });
    return tx.resurtidoRegla.deleteMany({ where: { id } });
  });
  if (n.count === 0) throw new ErrorDeNegocio("La regla ya no existe.");
}

// ── Generar tareas ────────────────────────────────────────────────────────────────────────────────────────────────

type Candidata = { caja: number; saldo: Prisma.Decimal; ubicacion: string };

async function candidatas(tx: Db | Prisma.TransactionClient, bodega: string, ean: string): Promise<Candidata[]> {
  return tx.$queryRaw<Candidata[]>`
    SELECT p.cajap AS caja, (p.entradas - p.salidas) AS saldo, p.ubicacion
    FROM t_pic p JOIN t_ins_coordenadas c ON c.ubicacion = p.ubicacion JOIN t_entradas_ras er ON er.cajano = p.cajap
    LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = p.lote AND l.codean = p.cod_producto
    WHERE p.cod_producto = ${ean} AND p.bodepicking = ${bodega} AND (p.entradas - p.salidas) > 0 AND COALESCE(p.reserva, 0) = 0
      AND c.bodegac = ${bodega} AND COALESCE(c.seleccion, false) = false AND c.prioridadrotacion = '1'
      AND NOT (UPPER(c.ubicacion) ~ '^(RECIBO|RECEPCION|DESPACHO|AVERIADOS|AJUSTE|RECLAMO|NOV)')
      AND LOWER(COALESCE(er.operadorras, '')) = 'aprobado'
      AND (COALESCE(l.confirmacertif, 0) <> 0 OR l.fechavence IS NULL OR l.fechavence >= now())
      AND NOT EXISTS (SELECT 1 FROM resurtido_tarea t WHERE t.caja = p.cajap AND t.estado = 'pendiente')
    ORDER BY (CASE WHEN COALESCE(l.confirmacertif, 0) = 0 AND l.fechavence IS NOT NULL THEN l.fechavence::date - CURRENT_DATE ELSE 10000 END), c.nro NULLS LAST, p.cajap`;
}

export type Necesidad = { regla: number; bodega: string; ean: string; ubicacion: string; libre: number; enCamino: number; falta: number; cajas: Candidata[]; cubre: number };

/** Calcula, sin escribir, qué reglas necesitan resurtido y con qué cajas. */
export async function calcularNecesidades(db: Db | Prisma.TransactionClient): Promise<Necesidad[]> {
  const reglas = await db.$queryRaw<{ id: number; bodega: string; ean: string; ubicacion: string; minimo: Prisma.Decimal; maximo: Prisma.Decimal; libre: Prisma.Decimal; en_camino: Prisma.Decimal }[]>`
    SELECT r.id, r.bodega, r.ean, r.ubicacion, r.minimo, r.maximo,
           COALESCE((SELECT SUM(p.entradas - p.salidas - COALESCE(p.reserva, 0)) FROM t_pic p WHERE p.ubicacion = r.ubicacion AND p.cod_producto = r.ean AND (p.entradas - p.salidas) > 0), 0) AS libre,
           COALESCE((SELECT SUM(t.cantidad) FROM resurtido_tarea t WHERE t.regla_id = r.id AND t.estado = 'pendiente'), 0) AS en_camino
    FROM resurtido_regla r ORDER BY r.bodega, r.ubicacion, r.ean`;
  const usadas = new Set<number>();
  const salida: Necesidad[] = [];
  for (const r of reglas) {
    const libre = Number(r.libre), enCamino = Number(r.en_camino), min = Number(r.minimo), max = Number(r.maximo);
    if (libre + enCamino > min + 1e-9) continue;
    const falta = r4(max - libre - enCamino);
    if (falta <= 0) continue;
    const cajas: Candidata[] = [];
    let suma = 0;
    for (const c of await candidatas(db, r.bodega, r.ean)) {
      if (suma >= falta - 1e-9) break;
      if (usadas.has(Number(c.caja)) || c.ubicacion === r.ubicacion) continue;
      cajas.push(c);
      usadas.add(Number(c.caja));
      suma += Number(c.saldo);
    }
    salida.push({ regla: r.id, bodega: r.bodega, ean: r.ean, ubicacion: r.ubicacion, libre, enCamino, falta, cajas, cubre: r4(suma) });
  }
  return salida;
}

export async function generarTareas(db: Db, usuario: string) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7001)`;
    const necesidades = await calcularNecesidades(tx);
    let creadas = 0, sinCajas = 0;
    for (const n of necesidades) {
      if (n.cajas.length === 0) { sinCajas++; continue; }
      for (const c of n.cajas) {
        if (creadas >= MAX_TAREAS_POR_GENERACION) break;
        await tx.resurtidoTarea.create({ data: { regla_id: n.regla, bodega: n.bodega, ean: n.ean, caja: Number(c.caja), cantidad: Number(c.saldo), ubicacion_origen: c.ubicacion, ubicacion_destino: n.ubicacion, creada_por: usuario } });
        creadas++;
      }
    }
    return { reglas: necesidades.length, tareas: creadas, sinCajas };
  });
}

// ── Tareas ────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listarTareas(db: Db, estado: "pendiente" | "resueltas") {
  return db.$queryRaw<Fila[]>`
    SELECT t.id, t.bodega, t.ean, d.descripcion AS articulo, t.caja::bigint AS caja, t.cantidad, t.ubicacion_origen AS origen, t.ubicacion_destino AS destino, t.estado, t.creada_en,
           t.hecha_en, t.nota, p.lote, l.fechavence AS vence, c.nro AS ruta
    FROM resurtido_tarea t LEFT JOIN t_detalle_referencia d ON d.productoean = t.ean LEFT JOIN t_pic p ON p.cajap = t.caja
    LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = p.lote AND l.codean = p.cod_producto LEFT JOIN t_ins_coordenadas c ON c.ubicacion = t.ubicacion_origen
    WHERE ${estado === "pendiente" ? Prisma.sql`t.estado = 'pendiente'` : Prisma.sql`t.estado <> 'pendiente'`}
    ORDER BY ${estado === "pendiente" ? Prisma.sql`c.nro NULLS LAST, t.id` : Prisma.sql`COALESCE(t.hecha_en, t.creada_en) DESC, t.id DESC`} LIMIT 200`;
}

export async function contarTareas(db: Db) {
  return db.resurtidoTarea.count({ where: { estado: "pendiente" } });
}

/** Cumple la tarea: lleva la caja a la ubicación de picking y cierra la tarea, todo junto. `cajaLeida` (lector) debe coincidir con la de la tarea. */
export async function completarTarea(db: Db, id: number, usuario: string, cajaLeida?: number) {
  return db.$transaction(async (tx) => {
    const f = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM resurtido_tarea WHERE id = ${id} AND estado = 'pendiente' FOR UPDATE`;
    if (!f[0]) throw new ErrorDeNegocio("La tarea ya fue resuelta o no existe.");
    const t = await tx.resurtidoTarea.findUniqueOrThrow({ where: { id } });
    if (cajaLeida !== undefined && cajaLeida !== Number(t.caja)) throw new ErrorDeNegocio(`Esa no es la caja de la tarea: debes tomar la caja ${Number(t.caja)}.`);
    const c = await tx.$queryRaw<{ ubicacion: string | null; reserva: Prisma.Decimal | null; saldo: Prisma.Decimal }[]>`SELECT ubicacion, reserva, (entradas - salidas) AS saldo FROM t_pic WHERE cajap = ${t.caja} FOR UPDATE`;
    if (!c[0] || Number(c[0].saldo) <= 0) throw new ErrorDeNegocio(`La caja ${Number(t.caja)} ya no tiene saldo: cancela la tarea y genera otras.`);
    if (Number(c[0].reserva ?? 0) > 0) throw new ErrorDeNegocio(`La caja ${Number(t.caja)} quedó reservada en un picking: cancela la tarea y genera otras.`);
    const r = await reubicarCajaTx(tx, Number(t.caja), t.ubicacion_destino, "RESURTIDO");
    await tx.resurtidoTarea.update({ where: { id }, data: { estado: "hecha", hecha_en: new Date(), hecha_por: usuario } });
    return { caja: Number(t.caja), desde: r.desde, hasta: r.hasta, cantidad: Number(t.cantidad) };
  });
}

export async function cancelarTarea(db: Db, id: number, nota: string) {
  const n = await db.resurtidoTarea.updateMany({ where: { id, estado: "pendiente" }, data: { estado: "cancelada", nota: nota.trim().slice(0, 200) || "Cancelada" } });
  if (n.count === 0) throw new ErrorDeNegocio("La tarea ya fue resuelta o no existe.");
}
