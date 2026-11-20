import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";

// Conteo de inventario. Un conteo (t_temporar_encabezado_conteowms) reúne una línea por caja (t_temporal_conteowms) con su
// saldo teórico; se capturan las cantidades contadas y, al aplicarlo, el saldo de cada caja pasa a ser lo contado.
// Estados: encabezado 0 = abierto, 100 = aplicado; línea 0 = pendiente, 1 = contada. Tipo: 1 = conteo, 2 = reconteo.

export const ESTADO_APLICADO = 100;
export const MAX_LINEAS = 20000;

export type Fila = Record<string, unknown>;
export type Orden = { columna: string; dir: "asc" | "desc" };
export type PedidoConsulta = { texto: string; filtros: Record<string, string>; orden: Orden[]; salto: number; cantidad: number };

const redondear = (n: number) => Math.round(n * 10000) / 10000;

function ordenarPor(orden: Orden[], permitidas: Record<string, string>, porDefecto: string) {
  const o = orden[0];
  const expr = o && permitidas[o.columna] ? permitidas[o.columna] : porDefecto;
  return Prisma.raw(`${expr} ${o?.dir === "desc" ? "DESC" : "ASC"} NULLS LAST`);
}

// ── Consultas ─────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listarConteos(db: Db, q: PedidoConsulta) {
  const cond: Prisma.Sql[] = [];
  if (q.texto) {
    const p = `%${q.texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    cond.push(Prisma.sql`(e.idconteo::text ILIKE ${p} OR e.bodega ILIKE ${p} OR e.realiza ILIKE ${p} OR e.programa ILIKE ${p})`);
  }
  if (q.filtros.estado === "abierto") cond.push(Prisma.sql`COALESCE(e.estado, 0) <> ${ESTADO_APLICADO}`);
  if (q.filtros.estado === "aplicado") cond.push(Prisma.sql`e.estado = ${ESTADO_APLICADO}`);
  if (q.filtros.bodega) cond.push(Prisma.sql`e.bodega = ${q.filtros.bodega}`);
  const donde = cond.length ? Prisma.sql`WHERE ${Prisma.join(cond, " AND ")}` : Prisma.empty;
  const orden = ordenarPor(
    q.orden,
    { id: "e.idconteo", fecha: "e.fecha", bodega: "e.bodega", realiza: "e.realiza", estado: "e.estado", lineas: "COUNT(l.idconsecutivo)" },
    "e.idconteo",
  );
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT e.idconteo AS id, e.fecha, e.bodega, e.programa, e.realiza, COALESCE(e.tipoconteo, 1) AS tipo, COALESCE(e.estado, 0) AS estado,
             e.lenguajesql AS alcance, COUNT(l.idconsecutivo)::int AS lineas,
             (COUNT(*) FILTER (WHERE l.estado = 1))::int AS contadas,
             (COUNT(*) FILTER (WHERE l.estado = 1 AND l.cantidadcontab <> l.kantidadteo))::int AS diferencias
      FROM t_temporar_encabezado_conteowms e LEFT JOIN t_temporal_conteowms l ON l.idconteo = e.idconteo
      ${donde} GROUP BY e.idconteo ORDER BY ${orden}, e.idconteo DESC LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_temporar_encabezado_conteowms e ${donde}`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

export const VISTAS = ["todas", "pendientes", "diferencias"] as const;
export type Vista = (typeof VISTAS)[number];
export const POR_PAGINA = 100;

export async function detalleConteo(db: Db, id: number, vista: Vista, pagina: number) {
  const encabezado = await db.temporarEncabezadoConteowms.findUnique({ where: { idconteo: id } });
  if (!encabezado) return null;
  const [res] = await db.$queryRaw<Fila[]>`
    SELECT COUNT(*)::int AS lineas, (COUNT(*) FILTER (WHERE estado = 1))::int AS contadas,
           (COUNT(*) FILTER (WHERE estado = 1 AND cantidadcontab <> kantidadteo))::int AS diferencias,
           COALESCE(SUM(kantidadteo), 0) AS teorico,
           COALESCE(SUM(cantidadcontab) FILTER (WHERE estado = 1), 0) AS contado
    FROM t_temporal_conteowms WHERE idconteo = ${id}`;
  const filtro =
    vista === "pendientes" ? Prisma.sql`AND COALESCE(l.estado, 0) <> 1` : vista === "diferencias" ? Prisma.sql`AND l.estado = 1 AND l.cantidadcontab <> l.kantidadteo` : Prisma.empty;
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT l.idconsecutivo AS id, l.caja, l.prodean AS ean, l.descripcion, l.ubicacion, l.kantidadteo AS teorico,
             l.cantidadcontab AS contado, COALESCE(l.estado, 0) AS estado, l.fechacuenta,
             (p.entradas - p.salidas) AS saldo_actual
      FROM t_temporal_conteowms l LEFT JOIN t_pic p ON p.cajap = l.caja AND p.cod_producto = l.prodean AND p.bodepicking = l.bod
      WHERE l.idconteo = ${id} ${filtro}
      ORDER BY l.ubicacion, l.caja LIMIT ${POR_PAGINA} OFFSET ${(pagina - 1) * POR_PAGINA}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_temporal_conteowms l WHERE l.idconteo = ${id} ${filtro}`,
  ]);
  return { encabezado, resumen: res, filas, total: total[0]?.n ?? 0 };
}

// ── Programar ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type AlcanceConteo = { bodega: string; ean?: string | null; ubicacion?: string | null };

function descripcionAlcance(a: AlcanceConteo) {
  return [a.ean ? `Artículo ${a.ean}` : null, a.ubicacion ? `Ubicaciones que empiezan por ${a.ubicacion}` : null].filter(Boolean).join(" · ") || "Todas las cajas con saldo de la bodega";
}

async function siguienteId(tx: Prisma.TransactionClient) {
  // Evita que dos personas programen a la vez y obtengan el mismo número.
  await tx.$executeRaw`LOCK TABLE t_temporar_encabezado_conteowms IN EXCLUSIVE MODE`;
  const m = await tx.temporarEncabezadoConteowms.aggregate({ _max: { idconteo: true } });
  return (m._max.idconteo ?? 0) + 1;
}

export async function programarConteo(db: Db, p: AlcanceConteo & { programa: string; realiza: string }) {
  return db.$transaction(async (tx) => {
    const id = await siguienteId(tx);
    const patron = p.ubicacion ? `${p.ubicacion.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
    await tx.temporarEncabezadoConteowms.create({
      data: {
        idconteo: id, fecha: new Date(), programa: p.programa.slice(0, 50), realiza: p.realiza.slice(0, 50), tipoconteo: 1,
        productoean: p.ean ?? null, estado: 0, lenguajesql: descripcionAlcance(p).slice(0, 500), bodega: p.bodega,
      },
    });
    const n = await tx.$executeRaw`
      INSERT INTO t_temporal_conteowms (prodean, bod, caja, idconteo, kantidadteo, cantidadcontab, ubicacion, estado, descripcion)
      SELECT pc.cod_producto, pc.bodepicking, pc.cajap, ${id}, (pc.entradas - pc.salidas), NULL, pc.ubicacion, 0, d.descripcion
      FROM t_pic pc LEFT JOIN t_detalle_referencia d ON d.productoean = pc.cod_producto
      WHERE pc.bodepicking = ${p.bodega} AND COALESCE(pc.ubicacion, '') <> '' AND (pc.entradas - pc.salidas) > 0
        AND (${p.ean ?? null}::text IS NULL OR pc.cod_producto = ${p.ean ?? null})
        AND (${patron}::text IS NULL OR pc.ubicacion LIKE ${patron})
      LIMIT ${MAX_LINEAS + 1}`;
    if (n === 0) throw new ErrorDeNegocio("No hay cajas con saldo y ubicación que coincidan con lo elegido.");
    if (n > MAX_LINEAS) throw new ErrorDeNegocio(`El conteo tendría más de ${MAX_LINEAS} cajas. Acota por artículo o por ubicación.`);
    return { id, lineas: n };
  });
}

/** Reconteo: un conteo nuevo con las cajas donde el conteo base dio diferencia. */
export async function programarReconteo(db: Db, idBase: number, p: { programa: string; realiza: string }) {
  return db.$transaction(async (tx) => {
    const base = await tx.temporarEncabezadoConteowms.findUnique({ where: { idconteo: idBase } });
    if (!base) throw new ErrorDeNegocio("El conteo ya no existe.");
    if (base.estado === ESTADO_APLICADO) throw new ErrorDeNegocio("El conteo ya fue aplicado: no admite reconteo.");
    const id = await siguienteId(tx);
    const n = await tx.$executeRaw`
      INSERT INTO t_temporal_conteowms (prodean, bod, caja, idconteo, kantidadteo, cantidadcontab, ubicacion, estado, descripcion)
      SELECT l.prodean, l.bod, l.caja, ${id}, COALESCE(p.entradas - p.salidas, l.kantidadteo), NULL, l.ubicacion, 0, l.descripcion
      FROM t_temporal_conteowms l LEFT JOIN t_pic p ON p.cajap = l.caja AND p.cod_producto = l.prodean AND p.bodepicking = l.bod
      WHERE l.idconteo = ${idBase} AND l.estado = 1 AND l.cantidadcontab <> l.kantidadteo`;
    if (n === 0) throw new ErrorDeNegocio("El conteo no tiene cajas con diferencia: no hace falta un reconteo.");
    await tx.temporarEncabezadoConteowms.create({
      data: {
        idconteo: id, fecha: new Date(), programa: p.programa.slice(0, 50), realiza: p.realiza.slice(0, 50), tipoconteo: 2,
        productoean: base.productoean, estado: 0, lenguajesql: `Reconteo del conteo ${idBase}`, bodega: base.bodega,
      },
    });
    return { id, lineas: n };
  });
}

// ── Capturar cantidades ───────────────────────────────────────────────────────────────────────────────────────────

export async function registrarCantidades(db: Db, id: number, cantidades: { linea: number; cantidad: number }[], empleado: number | null) {
  return db.$transaction(async (tx) => {
    const enc = await tx.temporarEncabezadoConteowms.findUnique({ where: { idconteo: id } });
    if (!enc) throw new ErrorDeNegocio("El conteo ya no existe.");
    if (enc.estado === ESTADO_APLICADO) throw new ErrorDeNegocio("El conteo ya fue aplicado: no se pueden cambiar las cantidades.");
    let cambios = 0;
    for (const c of cantidades) {
      const l = await tx.temporalConteowms.findFirst({ where: { idconsecutivo: c.linea, idconteo: id } });
      if (!l) continue;
      if (l.estado === 1 && l.cantidadcontab === c.cantidad) continue;
      // Como en el original, el teórico se refresca al contar: es el saldo de la caja en ese momento.
      const [saldo] = await tx.$queryRaw<{ saldo: number | null }[]>`
        SELECT (entradas - salidas) AS saldo FROM t_pic WHERE cajap = ${l.caja} AND cod_producto = ${l.prodean} AND bodepicking = ${l.bod}`;
      await tx.temporalConteowms.update({
        where: { idconsecutivo: l.idconsecutivo },
        data: { cantidadcontab: c.cantidad, estado: 1, fechacuenta: new Date(), fechalectura: new Date(), id_empleado: empleado, ...(saldo?.saldo != null ? { kantidadteo: Number(saldo.saldo) } : {}) },
      });
      cambios++;
    }
    return { cambios };
  });
}

// ── Aplicar ───────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Aplica el conteo al inventario: el saldo de cada caja contada pasa a ser lo contado. Las cajas sin contar no se tocan
 * (el original, en ese caso, las dejaba en cero). Cada diferencia queda en t_pic_ajuste. Si lo contado es mayor, sube
 * `entradas`; si es menor, sube `salidas`: nunca quedan salidas negativas. Todo o nada.
 */
export async function aplicarConteo(db: Db, id: number) {
  return db.$transaction(async (tx) => {
    // La actualización condicionada impide aplicar dos veces el mismo conteo aunque se pulse a la vez.
    const marcado = await tx.temporarEncabezadoConteowms.updateMany({ where: { idconteo: id, NOT: { estado: ESTADO_APLICADO } }, data: { estado: ESTADO_APLICADO } });
    if (marcado.count === 0) {
      const existe = await tx.temporarEncabezadoConteowms.findUnique({ where: { idconteo: id } });
      throw new ErrorDeNegocio(existe ? "El conteo ya fue aplicado al inventario." : "El conteo ya no existe.");
    }
    const lineas = await tx.temporalConteowms.findMany({ where: { idconteo: id } });
    const contadas = lineas.filter((l) => l.estado === 1 && l.cantidadcontab !== null);
    if (contadas.length === 0) throw new ErrorDeNegocio("Todavía no hay cantidades contadas para aplicar.");

    const ahora = new Date();
    let ajustadas = 0;
    let sinDiferencia = 0;
    for (const l of contadas) {
      const filas = await tx.$queryRaw<{ entradas: Prisma.Decimal | null; salidas: Prisma.Decimal | null; lote: string }[]>`
        SELECT entradas, salidas, lote FROM t_pic WHERE cajap = ${l.caja} AND cod_producto = ${l.prodean} AND bodepicking = ${l.bod} FOR UPDATE`;
      const caja = filas[0];
      if (!caja) throw new ErrorDeNegocio(`La caja ${l.caja} ya no existe en el inventario.`);
      const saldo = redondear(Number(caja.entradas ?? 0) - Number(caja.salidas ?? 0));
      const contado = redondear(l.cantidadcontab ?? 0);
      const dif = redondear(contado - saldo);
      if (dif !== 0) {
        await tx.$executeRaw`
          UPDATE t_pic SET entradas = entradas + ${dif > 0 ? dif : 0}, salidas = salidas + ${dif < 0 ? -dif : 0}
          WHERE cajap = ${l.caja} AND cod_producto = ${l.prodean} AND bodepicking = ${l.bod}`;
        await tx.picAjuste.create({
          data: {
            caja: l.caja, fecha: ahora, saldoinicial: saldo, qtyentrada: dif > 0 ? dif : 0, qtysale: dif < 0 ? -dif : 0,
            motivoajuste: `Conteo de inventario ${id}`, loteproveedor: caja.lote, numdocumento: String(id), ubicacion_sale: l.ubicacion,
          },
        });
        ajustadas++;
      } else sinDiferencia++;
      await tx.temporalConteowms.update({
        where: { idconsecutivo: l.idconsecutivo },
        data: { fin_qtyteorico: saldo, fin_qtycontabilizado: contado, fin_fecha: ahora, estadoajuste: dif !== 0 ? 1 : 0 },
      });
    }
    return { ajustadas, sinDiferencia, pendientes: lineas.length - contadas.length };
  });
}

export async function eliminarConteo(db: Db, id: number) {
  return db.$transaction(async (tx) => {
    const enc = await tx.temporarEncabezadoConteowms.findUnique({ where: { idconteo: id } });
    if (!enc) return false;
    if (enc.estado === ESTADO_APLICADO) throw new ErrorDeNegocio("Un conteo aplicado no se puede eliminar: dejó ajustes en el inventario.");
    await tx.temporalConteowms.deleteMany({ where: { idconteo: id } });
    await tx.temporalConteowmsMultiproducto.deleteMany({ where: { idconteo: id } });
    await tx.temporarEncabezadoConteowms.delete({ where: { idconteo: id } });
    return true;
  });
}
