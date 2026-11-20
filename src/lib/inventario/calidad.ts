import "server-only";
import type { Db } from "@/lib/tenant";

// Estados de calidad de un lote. Se guardan tal cual en el historial (t_historia_status_calidad).
export const ESTADOS_CALIDAD = ["Cuarentena", "Aprobado", "Rechazado"] as const;
export type EstadoCalidad = (typeof ESTADOS_CALIDAD)[number];

/** Un error que se le explica al usuario (no es una falla del sistema). */
export class ErrorDeNegocio extends Error {}

const igual = (a: string | null | undefined, b: string) => (a ?? "").trim().toLowerCase() === b.toLowerCase();

/**
 * Cambia el estado de calidad de un lote de un artículo. Porta usp_ActualizarStatusCalidadLote con sus mismas reglas:
 *  - un lote rechazado no cambia más;
 *  - el lote debe tener cajas generadas;
 *  - se exige el número de control de liberación;
 *  - un lote aprobado solo puede pasar a rechazado.
 * Todo ocurre en una transacción (el original actualizaba el número de control aunque luego rechazara el cambio).
 */
export async function cambiarEstadoCalidad(
  db: Db,
  p: { lote: string; ean: string; estado: EstadoCalidad; usuarioId: number | null; numControl: string },
) {
  if (!ESTADOS_CALIDAD.includes(p.estado)) throw new ErrorDeNegocio("El estado no es válido.");
  const numControl = p.numControl.trim();
  if (!numControl) throw new ErrorDeNegocio("Debe ingresar un número de control de liberación.");
  if (numControl.length > 20) throw new ErrorDeNegocio("El número de control de liberación admite hasta 20 caracteres.");

  return db.$transaction(async (tx) => {
    const lote = await tx.maestroLotePt.findUnique({ where: { loteproveedor_codean: { loteproveedor: p.lote, codean: p.ean } } });
    if (!lote) throw new ErrorDeNegocio("El lote ya no existe.");

    const ultimo = await tx.historiaStatusCalidad.findFirst({ where: { lote: p.lote, productoean: p.ean }, orderBy: { id: "desc" } });
    const actual = ultimo?.estado ?? null;
    if (actual && !igual(actual, "Cuarentena") && !igual(actual, "Aprobado")) {
      throw new ErrorDeNegocio("No se puede cambiar el estado de un lote rechazado.");
    }
    const cajas = await tx.pic.aggregate({ where: { lote: p.lote, cod_producto: p.ean }, _count: true, _sum: { entradas: true, salidas: true } });
    if (cajas._count === 0) throw new ErrorDeNegocio("No se puede cambiar el estado de un lote sin cajas generadas.");
    if (igual(actual, "Aprobado") && p.estado !== "Rechazado") {
      throw new ErrorDeNegocio("Un lote aprobado solo puede pasar a rechazado.");
    }

    const saldo = Number(cajas._sum.entradas ?? 0) - Number(cajas._sum.salidas ?? 0);
    await tx.maestroLotePt.update({
      where: { loteproveedor_codean: { loteproveedor: p.lote, codean: p.ean } },
      data: { numcontrolliberacion: numControl },
    });
    await tx.historiaStatusCalidad.create({
      data: { lote: p.lote, productoean: p.ean, fecha_registro: new Date(), estado: p.estado, id_usuario: p.usuarioId ?? 0, saldo },
    });
    await tx.entradasRas.updateMany({ where: { lote_orden: p.lote, producto: p.ean }, data: { operadorras: p.estado } });
    return { anterior: actual, nuevo: p.estado, saldo };
  });
}
