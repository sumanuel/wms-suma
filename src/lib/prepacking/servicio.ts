import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { CONDICION_PICKEABLE, DESDE_PICKEABLES, LIBRE } from "@/lib/picking/pickeables";

// Ejecución del picking (prepacking). Cada línea del picking (t_detalle_prepack) se confirma con la caja de la que de verdad se
// sacó y la cantidad. Porta spI_T_SSCCxCaja_Customized2: descuenta el saldo de la caja, libera la reserva, deja un registro SSCC
// (t_ssccxcaja) y marca la línea como pickeada (estadolinea = 3). Con todas las líneas pickeadas, el picking pasa a «Listo para
// aduana» (valida = 5). Todo en una transacción; las cajas se bloquean mientras se modifican.

export const LINEA_PICKEADA = 3;
export const VALIDA_PICKING = 3;
export const VALIDA_ADUANA = 5;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

type Caja = { cajap: number; entradas: Prisma.Decimal | null; salidas: Prisma.Decimal | null; reserva: Prisma.Decimal | null; ubicacion: string | null; lote: string };

async function bloquearCaja(tx: Prisma.TransactionClient, caja: number, ean: string, bodega: string) {
  const f = await tx.$queryRaw<Caja[]>`
    SELECT cajap, entradas, salidas, reserva, ubicacion, lote FROM t_pic
    WHERE cajap = ${caja} AND cod_producto = ${ean} AND bodepicking = ${bodega} FOR UPDATE`;
  return f[0] ?? null;
}
const saldoDe = (c: Caja) => r4(Number(c.entradas ?? 0) - Number(c.salidas ?? 0));

export async function registrarPickeo(db: Db, idPicking: number, idLinea: number, p: { caja: number; cantidad: number; cajaDespacho: number }) {
  return db.$transaction(async (tx) => {
    const enc = await tx.encabezadoPrepack.findUnique({ where: { idmovimiento: idPicking } });
    if (!enc) throw new ErrorDeNegocio("El picking ya no existe.");
    if (Number(enc.valida ?? 0) !== VALIDA_PICKING) throw new ErrorDeNegocio("El picking ya no está en la etapa de picking.");
    const det = await tx.detallePrepack.findFirst({ where: { iddetpripack: idLinea, numpicking: idPicking } });
    if (!det || !det.product) throw new ErrorDeNegocio("La línea ya no existe.");
    if ((det.estadolinea ?? 0) !== 0) throw new ErrorDeNegocio("Esa línea ya fue pickeada.");
    if (await tx.ssccxcaja.findUnique({ where: { id: idLinea } })) throw new ErrorDeNegocio("Esa línea ya tiene su registro de picking.");

    const planeada = Number(det.cant ?? 0);
    if (!(p.cantidad > 0)) throw new ErrorDeNegocio("La cantidad debe ser mayor que cero.");
    if (p.cantidad > planeada + 1e-9) throw new ErrorDeNegocio(`No se puede pickear más de lo planeado (${planeada}).`);
    if (!Number.isInteger(p.cajaDespacho) || p.cajaDespacho < 1 || p.cajaDespacho > 9999) throw new ErrorDeNegocio("El número de caja de despacho debe ser un entero entre 1 y 9999.");
    const bodega = det.bode ?? enc.bodegapicking;
    const asignada = Number(det.alerta ?? det.conscaja);
    const q = r4(p.cantidad);

    const caja = await bloquearCaja(tx, p.caja, det.product, bodega);
    if (!caja) throw new ErrorDeNegocio(`La caja ${p.caja} no tiene este artículo en la bodega ${bodega}.`);
    if (saldoDe(caja) < q) throw new ErrorDeNegocio(`La caja ${p.caja} solo tiene ${saldoDe(caja)} y se pidieron ${q}.`);

    if (p.caja !== asignada) {
      // Otra caja que la asignada: debe poder pickearse y tener libre lo que se saca (la asignada se libera abajo).
      const ok = await tx.$queryRaw<{ libre: Prisma.Decimal }[]>`
        SELECT ${LIBRE} AS libre FROM ${DESDE_PICKEABLES} WHERE p.cajap = ${p.caja} AND p.cod_producto = ${det.product} AND c.bodegac = ${bodega} AND ${CONDICION_PICKEABLE}`;
      if (!ok[0] || Number(ok[0].libre) < q) throw new ErrorDeNegocio(`La caja ${p.caja} no se puede usar: debe estar ubicada, aprobada, vigente y con ${q} libres.`);
      // Se libera la reserva de la caja asignada originalmente.
      await tx.$executeRaw`UPDATE t_pic SET reserva = GREATEST(COALESCE(reserva, 0) - ${planeada}, 0) WHERE cajap = ${asignada} AND cod_producto = ${det.product} AND bodepicking = ${bodega}`;
      await tx.$executeRaw`UPDATE t_pic SET salidas = COALESCE(salidas, 0) + ${q} WHERE cajap = ${p.caja} AND cod_producto = ${det.product} AND bodepicking = ${bodega}`;
    } else {
      // Se libera toda la reserva de la línea (también lo que no se alcanzó a pickear) y se descuenta lo sacado.
      await tx.$executeRaw`UPDATE t_pic SET salidas = COALESCE(salidas, 0) + ${q}, reserva = GREATEST(COALESCE(reserva, 0) - ${planeada}, 0)
        WHERE cajap = ${p.caja} AND cod_producto = ${det.product} AND bodepicking = ${bodega}`;
    }

    // Caja vaciada: sin reserva y, si no es recargable, sale de su ubicación (como el original). Ubicación sin cajas: libre.
    const despues = (await bloquearCaja(tx, p.caja, det.product, bodega))!;
    const origen = caja.ubicacion;
    if (saldoDe(despues) <= 0) {
      const er = await tx.entradasRas.findUnique({ where: { cajano: p.caja }, select: { cajarecargable: true } });
      await tx.$executeRaw`UPDATE t_pic SET reserva = 0, ordenestiba = -1, ubicacion = ${(er?.cajarecargable ?? 0) === 0 ? "" : origen ?? ""} WHERE cajap = ${p.caja} AND cod_producto = ${det.product} AND bodepicking = ${bodega}`;
    }
    if (origen) {
      const restantes = await tx.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_pic WHERE ubicacion = ${origen} AND (entradas - salidas) > 0`;
      if ((restantes[0]?.n ?? 0) === 0) await tx.insCoordenadas.updateMany({ where: { ubicacion: origen }, data: { ocupacion: 0 } });
    }

    const lote = await tx.maestroLotePt.findUnique({ where: { loteproveedor_codean: { loteproveedor: caja.lote, codean: det.product } }, select: { pedproveedor: true } });
    await tx.ssccxcaja.create({
      data: {
        idprepack: idPicking, eancontenido: det.product, numcajade: p.cajaDespacho, cantidad: q, id: idLinea, lote: lote?.pedproveedor ?? caja.lote,
        idcaja: p.caja, sscc: 0, marca: "0", ubicacion: "DESPACHO", ubicacion_sale: origen, fecharegistro: new Date(),
      },
    });
    await tx.detallePrepack.update({ where: { iddetpripack: idLinea }, data: { estadolinea: LINEA_PICKEADA, diponepick: q, origen: String(p.caja) } });

    const pendientes = await tx.detallePrepack.count({ where: { numpicking: idPicking, NOT: { estadolinea: LINEA_PICKEADA } } });
    if (pendientes === 0) await tx.encabezadoPrepack.update({ where: { idmovimiento: idPicking }, data: { valida: VALIDA_ADUANA } });
    return { completo: pendientes === 0, pendientes };
  });
}

/** Pickea todas las líneas pendientes tal como se planearon (misma caja y cantidad), en una caja de despacho. */
export async function pickearTodo(db: Db, idPicking: number, cajaDespacho: number) {
  const pendientes = await db.detallePrepack.findMany({ where: { numpicking: idPicking, NOT: { estadolinea: LINEA_PICKEADA } }, orderBy: [{ cmv: "asc" }, { iddetpripack: "asc" }] });
  if (pendientes.length === 0) throw new ErrorDeNegocio("No hay líneas pendientes.");
  let hechas = 0;
  for (const l of pendientes) {
    // Cada línea en su propia transacción: si una falla, las anteriores ya quedaron y se informa cuál.
    try {
      await registrarPickeo(db, idPicking, l.iddetpripack, { caja: Number(l.alerta ?? l.conscaja), cantidad: Number(l.cant ?? 0), cajaDespacho });
      hechas++;
    } catch (e) {
      if (e instanceof ErrorDeNegocio) throw new ErrorDeNegocio(`Se pickearon ${hechas} líneas. La línea de ${l.descripcion ?? l.product} se detuvo: ${e.message}`);
      throw e;
    }
  }
  return { hechas };
}

/** Deshace el pickeo de una línea (error del operario): devuelve el saldo, vuelve a reservar y borra el registro SSCC. */
export async function revertirPickeo(db: Db, idPicking: number, idLinea: number) {
  return db.$transaction(async (tx) => {
    const enc = await tx.encabezadoPrepack.findUnique({ where: { idmovimiento: idPicking } });
    if (!enc) throw new ErrorDeNegocio("El picking ya no existe.");
    if (![VALIDA_PICKING, VALIDA_ADUANA].includes(Number(enc.valida ?? 0))) throw new ErrorDeNegocio("El picking ya avanzó más allá de la aduana: no se puede revertir.");
    if ((await tx.aduanaWmsPos.count({ where: { numpicking: idPicking } })) > 0) throw new ErrorDeNegocio("El picking ya tiene cajas aduanadas: no se puede revertir.");
    const det = await tx.detallePrepack.findFirst({ where: { iddetpripack: idLinea, numpicking: idPicking } });
    const ss = await tx.ssccxcaja.findUnique({ where: { id: idLinea } });
    if (!det || !det.product || (det.estadolinea ?? 0) !== LINEA_PICKEADA || !ss || ss.idcaja == null) throw new ErrorDeNegocio("La línea no está pickeada.");
    const bodega = det.bode ?? enc.bodegapicking;
    const asignada = Number(det.alerta ?? det.conscaja);
    const planeada = Number(det.cant ?? 0);
    const q = Number(ss.cantidad ?? 0);

    const usada = await bloquearCaja(tx, ss.idcaja, det.product, bodega);
    if (!usada) throw new ErrorDeNegocio("La caja que se pickeó ya no existe en el inventario.");
    await tx.$executeRaw`UPDATE t_pic SET salidas = GREATEST(COALESCE(salidas, 0) - ${q}, 0), ubicacion = CASE WHEN COALESCE(ubicacion, '') = '' THEN ${ss.ubicacion_sale ?? ""} ELSE ubicacion END
      WHERE cajap = ${ss.idcaja} AND cod_producto = ${det.product} AND bodepicking = ${bodega}`;
    if (ss.idcaja !== asignada) {
      const a = await bloquearCaja(tx, asignada, det.product, bodega);
      if (!a || saldoDe(a) - Number(a.reserva ?? 0) < planeada) throw new ErrorDeNegocio(`La caja asignada originalmente (${asignada}) ya no tiene ${planeada} libres: no se puede volver a reservar.`);
    }
    await tx.$executeRaw`UPDATE t_pic SET reserva = COALESCE(reserva, 0) + ${planeada} WHERE cajap = ${asignada} AND cod_producto = ${det.product} AND bodepicking = ${bodega}`;
    await tx.ssccxcaja.delete({ where: { id: idLinea } });
    await tx.detallePrepack.update({ where: { iddetpripack: idLinea }, data: { estadolinea: 0, diponepick: planeada, origen: `${asignada} : ${det.ubicacion_asig ?? ""}` } });
    await tx.encabezadoPrepack.update({ where: { idmovimiento: idPicking }, data: { valida: VALIDA_PICKING } });
    return { caja: ss.idcaja, cantidad: q };
  });
}

// ── Consulta de la ficha ──────────────────────────────────────────────────────────────────────────────────────────

export async function ejecucionPicking(db: Db, id: number) {
  const enc = await db.encabezadoPrepack.findUnique({ where: { idmovimiento: id } });
  if (!enc) return null;
  const lineas = await db.$queryRaw<Record<string, unknown>[]>`
    SELECT d.iddetpripack AS id, d.ubicacion_asig AS ubicacion, d.zonapiso AS zona, d.alerta AS asignada, d.product AS ean, d.descripcion, d.lothe AS lote,
           d.cant AS planeada, COALESCE(d.estadolinea, 0) AS estado, s.idcaja AS caja_usada, s.cantidad AS pickeada, s.numcajade AS caja_despacho, s.fecharegistro
    FROM t_detalle_prepack d LEFT JOIN t_ssccxcaja s ON s.id = d.iddetpripack
    WHERE d.numpicking = ${id} ORDER BY d.cmv, d.ubicacion_asig, d.product, d.iddetpripack`;
  const aduana = await db.aduanaWmsPos.count({ where: { numpicking: id } });
  return { encabezado: enc, lineas, aduana };
}
