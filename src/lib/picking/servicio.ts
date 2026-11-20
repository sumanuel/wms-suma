import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { ESTADO } from "@/lib/pedidos/estados";
import { CONDICION_PICKEABLE, DESDE_PICKEABLES, LIBRE, VIGENCIA } from "./pickeables";
import { VALIDA_LISTO_PARA_PICKING } from "./estados";

export type Fila = Record<string, unknown>;
export type Orden = { columna: string; dir: "asc" | "desc" };
export type PedidoConsulta = { texto: string; filtros: Record<string, string>; orden: Orden[]; salto: number; cantidad: number };

const r4 = (n: number) => Math.round(n * 10000) / 10000;

function ordenarPor(orden: Orden[], permitidas: Record<string, string>, porDefecto: string) {
  const o = orden[0];
  const expr = o && permitidas[o.columna] ? permitidas[o.columna] : porDefecto;
  return Prisma.raw(`${expr} ${o?.dir === "desc" ? "DESC" : "ASC"} NULLS LAST`);
}
const patron = (t: string) => `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// ── Pedidos listos para picking ───────────────────────────────────────────────────────────────────────────────────

/**
 * Pedidos aprobados sin picking, con cuánto de lo pendiente se puede cubrir hoy (sin reservar). Equivale a
 * spS_ObtenerPedidosPendientesDePrepacking: estado Aprobado, unidades pendientes y artículo inventariable.
 */
export async function pedidosListos(db: Db, q: PedidoConsulta) {
  const cond: Prisma.Sql[] = [Prisma.sql`e.busca_aprobacion IN (${ESTADO.APROBADO}, ${ESTADO.DESPACHO_PARCIAL})`, Prisma.sql`COALESCE(e.idpicking, 0) = 0`];
  if (q.texto) {
    const p = patron(q.texto);
    cond.push(Prisma.sql`(e.npedido ILIKE ${p} OR c.nombrecliente ILIKE ${p} OR e.cliente ILIKE ${p})`);
  }
  if (q.filtros.bodega) cond.push(Prisma.sql`s.bodega = ${q.filtros.bodega}`);
  const base = Prisma.sql`
    FROM t_narth_encabezado_pedido e
    JOIN (
      SELECT numpedido, bodega, ref, (COALESCE(pares, 0) - COALESCE(udsentreg, 0)) AS pend
      FROM t_narth_serie_pedido WHERE (COALESCE(pares, 0) - COALESCE(udsentreg, 0)) > 0 AND ref IS NOT NULL AND bodega IS NOT NULL
    ) s ON s.numpedido = e.npedido
    JOIN t_detalle_referencia dr ON dr.productoean = s.ref AND COALESCE(dr.inventariable, 0) = 1
    LEFT JOIN t_clientes c ON c.nit = e.cliente
    LEFT JOIN (
      SELECT p.cod_producto AS ean, c.bodegac AS bodega, SUM(${LIBRE}) AS disp FROM ${DESDE_PICKEABLES}
      WHERE ${CONDICION_PICKEABLE} GROUP BY p.cod_producto, c.bodegac
    ) d ON d.ean = s.ref AND d.bodega = s.bodega
    WHERE ${Prisma.join(cond, " AND ")}`;
  const agrupar = Prisma.sql`GROUP BY e.npedido, e.fechapedido, e.fechavence, e.prioridad, c.nombrecliente, e.cliente`;
  const orden = ordenarPor(
    q.orden,
    { numero: "e.npedido", fecha: "e.fechapedido", vence: "e.fechavence", cliente: "c.nombrecliente", pendiente: "SUM(s.pend)", prioridad: "e.prioridad" },
    "e.fechapedido",
  );
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT e.npedido AS numero, e.fechapedido AS fecha, e.fechavence AS vence, e.prioridad, COALESCE(c.nombrecliente, e.cliente) AS cliente,
             MIN(s.bodega) AS bodega, COUNT(DISTINCT s.bodega)::int AS bodegas, COUNT(*)::int AS lineas, SUM(s.pend) AS pendiente,
             SUM(LEAST(s.pend, COALESCE(d.disp, 0))) AS cubierto
      ${base} ${agrupar} ORDER BY ${orden}, e.npedido LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM (SELECT 1 ${base} ${agrupar}) t`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

// ── Generar el picking ────────────────────────────────────────────────────────────────────────────────────────────

type Candidata = { cajap: number; bodepicking: string; lote: string; ubicacion: string; libre: Prisma.Decimal; nro: number | null; zonapiso: string | null; vigencia: number; vence: Date | null };

/**
 * Genera el picking de un pedido aprobado: por cada línea asigna cajas del lote que vence primero (FEFO) y, a igual
 * vigencia, de la ubicación que va primero en la ruta (t_ins_coordenadas.nro); reserva esas cajas y deja al pedido
 * apuntando al picking. Lo que no alcanza queda como faltante (no se asigna). Todo o nada.
 */
export async function generarPicking(db: Db, numero: string, p: { pickeador: string | null; transportador: string | null; observaciones: string | null }) {
  return db.$transaction(async (tx) => {
    const e = await tx.narthEncabezadoPedido.findUnique({ where: { npedido: numero } });
    if (!e) throw new ErrorDeNegocio("El pedido ya no existe.");
    if (![ESTADO.APROBADO, ESTADO.DESPACHO_PARCIAL].includes(Number(e.busca_aprobacion ?? 0) as 7 | 4)) throw new ErrorDeNegocio("El pedido debe estar aprobado (o con despacho parcial) para generar su picking.");
    if (Number(e.idpicking ?? 0) > 0) throw new ErrorDeNegocio(`El pedido ya tiene el picking ${e.idpicking}.`);

    const lineas = await tx.narthSeriePedido.findMany({ where: { numpedido: numero }, orderBy: { contador: "asc" } });
    const refs = await tx.detalleReferencia.findMany({ where: { productoean: { in: lineas.map((l) => l.ref ?? "") } }, select: { productoean: true, descripcion: true, codigoreferencia: true, inventariable: true } });
    const info = new Map(refs.map((r) => [r.productoean, r]));
    const pendientes = lineas.filter((l) => l.ref && l.bodega && (l.pares ?? 0) - (l.udsentreg ?? 0) > 0 && (info.get(l.ref)?.inventariable ?? 0) === 1);
    if (pendientes.length === 0) throw new ErrorDeNegocio("El pedido no tiene unidades pendientes de artículos inventariables.");
    const bodegas = [...new Set(pendientes.map((l) => l.bodega!))];
    if (bodegas.length > 1) throw new ErrorDeNegocio(`El pedido tiene líneas en varias bodegas (${bodegas.join(", ")}): un picking es de una sola bodega. Divide el pedido por bodega.`);
    const bodega = bodegas[0];

    await tx.$executeRaw`LOCK TABLE t_encabezado_prepack IN EXCLUSIVE MODE`;
    const max = await tx.encabezadoPrepack.aggregate({ _max: { idmovimiento: true } });
    const id = (max._max.idmovimiento ?? 0) + 1;

    const detalle: Prisma.DetallePrepackCreateManyInput[] = [];
    const faltantes: { ean: string; descripcion: string; faltante: number }[] = [];
    const asignadoPorLinea = new Map<number, number>();
    const ahora = new Date();
    for (const l of pendientes) {
      const ean = l.ref!;
      let falta = r4((l.pares ?? 0) - (l.udsentreg ?? 0));
      // FOR UPDATE: dos pickings simultáneos no pueden quedarse con las mismas cajas.
      const cajas = await tx.$queryRaw<Candidata[]>`
        SELECT p.cajap, p.bodepicking, p.lote, p.ubicacion, ${LIBRE} AS libre, c.nro, c.zonapiso, ${VIGENCIA} AS vigencia, l.fechavence AS vence
        FROM ${DESDE_PICKEABLES}
        WHERE p.cod_producto = ${ean} AND c.bodegac = ${bodega} AND ${CONDICION_PICKEABLE}
        ORDER BY ${VIGENCIA}, c.nro NULLS LAST, p.cajap
        FOR UPDATE OF p`;
      let asignado = 0;
      for (const c of cajas) {
        if (falta <= 0) break;
        const toma = r4(Math.min(falta, Number(c.libre)));
        if (toma <= 0) continue;
        await tx.$executeRaw`UPDATE t_pic SET reserva = COALESCE(reserva, 0) + ${toma} WHERE cajap = ${c.cajap} AND cod_producto = ${ean} AND bodepicking = ${c.bodepicking}`;
        detalle.push({
          numpicking: id, conscaja: String(c.cajap), product: ean, cant: toma, fecha: ahora, lothe: c.lote, origen: `${c.cajap} : ${c.ubicacion}`,
          precioventa: l.precio_unitario ?? 0, bonificacion: Number(l.bonifica ?? 0), diponepick: toma, saldoaduana: 0, bode: bodega, cmv: c.nro ?? 0,
          pedido: numero, estadolinea: 0, alerta: String(c.cajap), descripcion: info.get(ean)?.descripcion ?? null, ref: info.get(ean)?.codigoreferencia ?? null,
          zonapiso: c.zonapiso, ubicacion_asig: c.ubicacion, barcode: ean,
        });
        asignado = r4(asignado + toma);
        falta = r4(falta - toma);
      }
      asignadoPorLinea.set(l.contador, asignado);
      if (falta > 0) faltantes.push({ ean, descripcion: info.get(ean)?.descripcion ?? ean, faltante: falta });
    }
    if (detalle.length === 0) throw new ErrorDeNegocio("No hay existencias disponibles (lotes aprobados, vigentes y ubicados) para ninguna línea del pedido.");

    await tx.encabezadoPrepack.create({
      data: {
        idmovimiento: id, picking: id, fecha: ahora, valida: VALIDA_LISTO_PARA_PICKING, npedid: numero, pedido: "Pedido", bodegapicking: bodega,
        nom_empacador: p.pickeador?.slice(0, 50) ?? null, transportador: p.transportador?.slice(0, 50) ?? null, observpepack: p.observaciones?.slice(0, 250) ?? null,
        nitprepack: e.cliente, ok: 0, facturado: 0, impreso: 0,
      },
    });
    await tx.detallePrepack.createMany({ data: detalle });
    await tx.narthEncabezadoPedido.update({ where: { npedido: numero }, data: { idpicking: id, aprueba_picking: 1 } });
    for (const [contador, asignado] of asignadoPorLinea) await tx.narthSeriePedido.update({ where: { contador }, data: { reserva: asignado } });
    return { picking: id, bodega, lineas: detalle.length, unidades: r4(detalle.reduce((s, d) => s + Number(d.cant), 0)), faltantes };
  });
}

// ── Listado y ficha ───────────────────────────────────────────────────────────────────────────────────────────────

export async function listarPickings(db: Db, q: PedidoConsulta, soloValida?: number) {
  const cond: Prisma.Sql[] = [];
  if (soloValida !== undefined) cond.push(Prisma.sql`COALESCE(ep.valida, 0) = ${soloValida}`);
  if (q.texto) {
    const p = patron(q.texto);
    cond.push(Prisma.sql`(ep.idmovimiento::text ILIKE ${p} OR ep.npedid ILIKE ${p} OR ep.nom_empacador ILIKE ${p} OR c.nombrecliente ILIKE ${p})`);
  }
  if (q.filtros.estado) cond.push(Prisma.sql`COALESCE(ep.valida, 0) = ${Number(q.filtros.estado)}`);
  if (q.filtros.bodega) cond.push(Prisma.sql`ep.bodegapicking = ${q.filtros.bodega}`);
  const donde = cond.length ? Prisma.sql`WHERE ${Prisma.join(cond, " AND ")}` : Prisma.empty;
  const desde = Prisma.sql`FROM t_encabezado_prepack ep
    LEFT JOIN t_narth_encabezado_pedido ne ON ne.npedido = ep.npedid
    LEFT JOIN t_clientes c ON c.nit = ne.cliente
    LEFT JOIN (
      SELECT numpicking, COUNT(*)::int AS lineas, SUM(COALESCE(cant, 0)) AS unidades, COUNT(DISTINCT ubicacion_asig)::int AS ubicaciones,
             (COUNT(*) FILTER (WHERE COALESCE(estadolinea, 0) <> 0))::int AS ejecutadas
      FROM t_detalle_prepack GROUP BY numpicking
    ) d ON d.numpicking = ep.idmovimiento`;
  const orden = ordenarPor(
    q.orden,
    { numero: "ep.idmovimiento", fecha: "ep.fecha", pedido: "ep.npedid", cliente: "c.nombrecliente", bodega: "ep.bodegapicking", estado: "COALESCE(ep.valida, 0)", lineas: "d.lineas", unidades: "d.unidades" },
    "ep.idmovimiento",
  );
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT ep.idmovimiento AS numero, ep.fecha, ep.npedid AS pedido, c.nombrecliente AS cliente, ep.bodegapicking AS bodega,
             ep.nom_empacador AS pickeador, COALESCE(ep.valida, 0) AS estado, COALESCE(d.lineas, 0) AS lineas, COALESCE(d.unidades, 0) AS unidades,
             COALESCE(d.ubicaciones, 0) AS ubicaciones, COALESCE(d.ejecutadas, 0) AS ejecutadas
      ${desde} ${donde} ORDER BY ${orden}, ep.idmovimiento DESC LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n ${desde} ${donde}`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

export async function pickingCompleto(db: Db, id: number) {
  const encabezado = await db.encabezadoPrepack.findUnique({ where: { idmovimiento: id } });
  if (!encabezado) return null;
  const [lineas, pedido, sscc] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT d.iddetpripack AS id, d.ubicacion_asig AS ubicacion, d.zonapiso AS zona, d.conscaja AS caja, d.lothe AS lote, l.fechavence AS vence,
             d.product AS ean, d.descripcion, d.cant AS cantidad, COALESCE(d.estadolinea, 0) AS estado, d.cmv AS ruta
      FROM t_detalle_prepack d LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = d.lothe AND l.codean = d.product
      WHERE d.numpicking = ${id} ORDER BY d.cmv, d.ubicacion_asig, d.product, d.conscaja`,
    encabezado.npedid ? db.narthEncabezadoPedido.findUnique({ where: { npedido: encabezado.npedid }, select: { npedido: true, cliente: true, busca_aprobacion: true, fechavence: true } }) : null,
    db.ssccxcaja.count({ where: { idprepack: id } }),
  ]);
  const cliente = pedido?.cliente ? await db.clientes.findUnique({ where: { nit: pedido.cliente }, select: { nombrecliente: true } }) : null;
  return { encabezado, lineas, pedido, cliente: cliente?.nombrecliente ?? null, sscc };
}

// ── Eliminar ──────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * Anula un picking que no se ha empezado a ejecutar: libera las reservas, borra su detalle y devuelve el pedido a «En
 * espera» sin picking (como spU_EliminarPedidoAntesDePrepacking y usp_EliminarPicking del original).
 */
export async function eliminarPicking(db: Db, id: number) {
  return db.$transaction(async (tx) => {
    const enc = await tx.encabezadoPrepack.findUnique({ where: { idmovimiento: id } });
    if (!enc) return null;
    if (Number(enc.valida ?? 0) !== VALIDA_LISTO_PARA_PICKING) throw new ErrorDeNegocio("El picking ya avanzó (aduana, factura o facturado): no se puede eliminar.");
    const [sscc, guias] = await Promise.all([tx.ssccxcaja.count({ where: { idprepack: id } }), tx.guiasGeneradas.count({ where: { prepackingid: id } })]);
    if (sscc > 0) throw new ErrorDeNegocio("El picking tiene líneas ejecutadas: no se puede eliminar.");
    if (guias > 0) throw new ErrorDeNegocio("El picking tiene guías de despacho generadas: no se puede eliminar.");
    const detalle = await tx.detallePrepack.findMany({ where: { numpicking: id } });
    if (detalle.some((d) => (d.estadolinea ?? 0) !== 0 || Number(d.saldoaduana ?? 0) > 0)) throw new ErrorDeNegocio("El picking tiene líneas ejecutadas o aduanadas: no se puede eliminar.");

    for (const d of detalle) {
      if (!d.conscaja || !d.product) continue;
      await tx.$executeRaw`UPDATE t_pic SET reserva = GREATEST(COALESCE(reserva, 0) - ${Number(d.diponepick ?? 0)}, 0) WHERE cajap = ${Number(d.conscaja)} AND cod_producto = ${d.product}`;
    }
    await tx.detallePrepackXlineapedido.deleteMany({ where: { numpicking: id } });
    await tx.detallePrepack.deleteMany({ where: { numpicking: id } });
    await tx.encabezadoPrepackCargue.deleteMany({ where: { picking: id } });
    await tx.encabezadoPrepackExt.deleteMany({ where: { picking: id } });
    await tx.encabezadoPrepack.delete({ where: { idmovimiento: id } });
    if (enc.npedid) {
      await tx.narthEncabezadoPedido.updateMany({
        where: { npedido: enc.npedid, idpicking: id },
        data: { idpicking: 0, aprueba_picking: 0, busca_aprobacion: ESTADO.EN_ESPERA, personaapruebapedido: null, fecha_cartera: null },
      });
      await tx.narthSeriePedido.updateMany({ where: { numpedido: enc.npedid }, data: { reserva: 0 } });
    }
    return { pedido: enc.npedid, lineas: detalle.length };
  });
}
