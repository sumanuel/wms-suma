import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { ESTADO } from "@/lib/pedidos/estados";

// Despacho y guías. Un picking aduanado (valida 7) se despacha: se genera su guía con el consecutivo del transportador
// (t_guias_generadas), se descuentan las unidades entregadas del pedido y el pedido pasa a «Despacho total» o «Despacho parcial».
// El picking queda «Despachado» (valida 1). Porta usp_RegistroDeGuiaGenerada y spU_ActualizarCantidadesFacturadas, sin la
// contabilidad del ERP: el número de factura, si lo hay, se registra como dato.

export const VALIDA_FACTURABLE = 7;
export const VALIDA_DESPACHADO = 1;
const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const EPS = 1e-6;

export type Fila = Record<string, unknown>;
export type Orden = { columna: string; dir: "asc" | "desc" };
export type PedidoConsulta = { texto: string; filtros: Record<string, string>; orden: Orden[]; salto: number; cantidad: number };
const patron = (t: string) => `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

function ordenarPor(orden: Orden[], permitidas: Record<string, string>, porDefecto: string) {
  const o = orden[0];
  const expr = o && permitidas[o.columna] ? permitidas[o.columna] : porDefecto;
  return Prisma.raw(`${expr} ${o?.dir === "desc" ? "DESC" : "ASC"} NULLS LAST`);
}

export type EstadoGuia = "generada" | "enviada" | "entregada" | "anulada";
export function estadoDeGuia(g: { anulada: number | null; enviado: boolean | null; fecha_entregacliente: Date | null }): EstadoGuia {
  if ((g.anulada ?? 0) === 1) return "anulada";
  if (g.fecha_entregacliente) return "entregada";
  if (g.enviado) return "enviada";
  return "generada";
}

// ── Listas ────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listarPorDespachar(db: Db, q: PedidoConsulta) {
  const cond: Prisma.Sql[] = [
    Prisma.sql`ep.valida = ${VALIDA_FACTURABLE}`,
    Prisma.sql`NOT EXISTS (SELECT 1 FROM t_guias_generadas g WHERE g.prepackingid = ep.idmovimiento AND COALESCE(g.anulada, 0) = 0)`,
  ];
  if (q.texto) {
    const p = patron(q.texto);
    cond.push(Prisma.sql`(ep.idmovimiento::text ILIKE ${p} OR ep.npedid ILIKE ${p} OR c.nombrecliente ILIKE ${p})`);
  }
  if (q.filtros.bodega) cond.push(Prisma.sql`ep.bodegapicking = ${q.filtros.bodega}`);
  const donde = Prisma.sql`WHERE ${Prisma.join(cond, " AND ")}`;
  const desde = Prisma.sql`FROM t_encabezado_prepack ep
    LEFT JOIN t_narth_encabezado_pedido ne ON ne.npedido = ep.npedid
    LEFT JOIN t_clientes c ON c.nit = ne.cliente
    LEFT JOIN (SELECT numpicking, COUNT(DISTINCT numdecaja)::int AS cajas, SUM(COALESCE(cantidad, 0)) AS unidades, SUM(COALESCE(pesoempacado, 0)) AS kilos
               FROM t_aduana_wms_pos GROUP BY numpicking) a ON a.numpicking = ep.idmovimiento`;
  const orden = ordenarPor(q.orden, { numero: "ep.idmovimiento", fecha: "ep.fecha", pedido: "ep.npedid", cliente: "c.nombrecliente", bodega: "ep.bodegapicking", cajas: "a.cajas", unidades: "a.unidades" }, "ep.fecha");
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT ep.idmovimiento AS numero, ep.fecha, ep.npedid AS pedido, c.nombrecliente AS cliente, ep.bodegapicking AS bodega, ep.transportador,
             COALESCE(a.cajas, 0) AS cajas, COALESCE(a.unidades, 0) AS unidades, COALESCE(a.kilos, 0) AS kilos
      ${desde} ${donde} ORDER BY ${orden}, ep.idmovimiento LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n ${desde} ${donde}`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

export async function listarGuias(db: Db, q: PedidoConsulta) {
  const cond: Prisma.Sql[] = [];
  if (q.texto) {
    const p = patron(q.texto);
    cond.push(Prisma.sql`(g.num_guia ILIKE ${p} OR g.pedido ILIKE ${p} OR g.destinatario ILIKE ${p} OR g.factura ILIKE ${p} OR g.prepackingid::text ILIKE ${p})`);
  }
  if (q.filtros.transportador) cond.push(Prisma.sql`g.transportador = ${q.filtros.transportador}`);
  const est = q.filtros.estado;
  if (est === "anulada") cond.push(Prisma.sql`COALESCE(g.anulada, 0) = 1`);
  if (est === "entregada") cond.push(Prisma.sql`COALESCE(g.anulada, 0) = 0 AND g.fecha_entregacliente IS NOT NULL`);
  if (est === "enviada") cond.push(Prisma.sql`COALESCE(g.anulada, 0) = 0 AND g.fecha_entregacliente IS NULL AND COALESCE(g.enviado, false) = true`);
  if (est === "generada") cond.push(Prisma.sql`COALESCE(g.anulada, 0) = 0 AND g.fecha_entregacliente IS NULL AND COALESCE(g.enviado, false) = false`);
  const donde = cond.length ? Prisma.sql`WHERE ${Prisma.join(cond, " AND ")}` : Prisma.empty;
  const orden = ordenarPor(q.orden, { guia: "g.num_guia", fecha: "g.fecha_despacho", transportador: "g.transportador", pedido: "g.pedido", destinatario: "g.destinatario", unidades: "g.unidades", total: "g.total" }, "g.fecha_despacho");
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT g.auto AS id, g.num_guia AS guia, g.fecha_despacho AS fecha, g.transportador, g.pedido, g.prepackingid AS picking, g.destinatario, g.ciudad_destino AS ciudad,
             g.unidades, g.kilos, g.total, g.factura, COALESCE(g.anulada, 0) AS anulada, COALESCE(g.enviado, false) AS enviado, g.fecha_entregacliente AS entregada
      FROM t_guias_generadas g ${donde} ORDER BY ${orden}, g.auto DESC LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_guias_generadas g ${donde}`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

// ── Datos para despachar ──────────────────────────────────────────────────────────────────────────────────────────

export async function resumenDespacho(db: Db, picking: number) {
  const enc = await db.encabezadoPrepack.findUnique({ where: { idmovimiento: picking } });
  if (!enc) return null;
  const [pedido, cajas, valor, guia, transportadores] = await Promise.all([
    enc.npedid ? db.narthEncabezadoPedido.findUnique({ where: { npedido: enc.npedid } }) : null,
    db.$queryRaw<{ cajas: number; unidades: Prisma.Decimal; kilos: Prisma.Decimal; volumen: Prisma.Decimal }[]>`
      SELECT COUNT(DISTINCT a.numdecaja)::int AS cajas, COALESCE(SUM(a.cantidad), 0) AS unidades, COALESCE(SUM(a.pesoempacado), 0) AS kilos,
             COALESCE((SELECT SUM(COALESCE(t.volumen, 0)) FROM (SELECT DISTINCT numdecaja, tipocaja FROM t_aduana_wms_pos WHERE numpicking = ${picking}) x JOIN tiposdecaja t ON t.tipo_caja = x.tipocaja), 0) AS volumen
      FROM t_aduana_wms_pos a WHERE a.numpicking = ${picking}`,
    db.$queryRaw<{ valor: Prisma.Decimal | null }[]>`
      SELECT SUM(COALESCE(s.cantidad, 0) * COALESCE(d.precioventa, 0)) AS valor FROM t_ssccxcaja s JOIN t_detalle_prepack d ON d.iddetpripack = s.id WHERE s.idprepack = ${picking}`,
    db.guiasGeneradas.findFirst({ where: { prepackingid: picking, anulada: { not: 1 } } }),
    db.transportador.findMany({ where: { estado: 1 }, select: { transportador: true }, orderBy: { transportador: "asc" } }),
  ]);
  const cliente = pedido?.cliente ? await db.clientes.findUnique({ where: { nit: pedido.cliente }, select: { nit: true, nombrecliente: true, depto: true } }) : null;
  const sede = pedido?.nitvble != null ? await db.clientesDirecciones.findUnique({ where: { item: pedido.nitvble }, select: { nombrecliente: true, direccion: true, telefono: true, ciudad: true } }) : null;
  const c = cajas[0];
  return {
    encabezado: enc, pedido, cliente, sede, guiaActiva: guia, transportadores: transportadores.map((t) => t.transportador),
    cajas: c?.cajas ?? 0, unidades: Number(c?.unidades ?? 0), kilos: Number(c?.kilos ?? 0), volumen: Number(c?.volumen ?? 0), valorMercancia: Number(valor[0]?.valor ?? 0),
  };
}

type Remitente = { nit?: string; nombre?: string; ciudad?: string; codCiudad?: string; comentario?: string };
async function remitente(db: Prisma.TransactionClient): Promise<Remitente> {
  const c = await db.configuracion.findUnique({ where: { clave: "guia.remitente" } });
  return c && typeof c.valor === "object" && c.valor ? (c.valor as Remitente) : {};
}

// ── Despachar ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type DatosDespacho = { transportador: string; factura: string | null; valorDeclarado: number | null; total: number | null; comentario: string | null; nombreEmpresa: string };

export async function despachar(db: Db, picking: number, d: DatosDespacho) {
  return db.$transaction(async (tx) => {
    // La actualización condicionada impide despachar dos veces el mismo picking.
    const marcado = await tx.encabezadoPrepack.updateMany({ where: { idmovimiento: picking, valida: VALIDA_FACTURABLE }, data: { valida: VALIDA_DESPACHADO, facturado: 1 } });
    if (marcado.count === 0) throw new ErrorDeNegocio("El picking no está listo para despachar (debe tener la aduana terminada y no estar despachado).");
    const enc = await tx.encabezadoPrepack.findUniqueOrThrow({ where: { idmovimiento: picking } });
    if (await tx.guiasGeneradas.findFirst({ where: { prepackingid: picking, anulada: { not: 1 } } })) throw new ErrorDeNegocio("Este picking ya tiene una guía.");
    if (!enc.npedid) throw new ErrorDeNegocio("El picking no tiene pedido.");
    const pedido = await tx.narthEncabezadoPedido.findUnique({ where: { npedido: enc.npedid } });
    if (!pedido) throw new ErrorDeNegocio("El pedido del picking ya no existe.");

    const trans = await tx.transportador.findUnique({ where: { transportador: d.transportador } });
    if (!trans) throw new ErrorDeNegocio("Elige un transportador de la lista.");
    if ((trans.estado ?? 0) !== 1) throw new ErrorDeNegocio("El transportador está inactivo.");

    // Consecutivo de guía del transportador: se bloquea su fila para que dos despachos no tomen el mismo número.
    const f = await tx.$queryRaw<{ num_guia: string | null }[]>`SELECT num_guia FROM t_transportador WHERE transportador = ${d.transportador} FOR UPDATE`;
    const actual = (f[0]?.num_guia ?? "0").trim() || "0";
    if (!/^\d{1,15}$/.test(actual)) throw new ErrorDeNegocio(`El consecutivo de guía del transportador («${actual}») no es numérico: corrígelo en Maestros › Transportadores.`);
    const numGuia = String(BigInt(actual) + BigInt(1));
    await tx.$executeRaw`UPDATE t_transportador SET num_guia = ${numGuia} WHERE transportador = ${d.transportador}`;

    const [cajasRes, valorRes, pesoRes] = await Promise.all([
      tx.$queryRaw<{ cajas: number; unidades: Prisma.Decimal; kilos: Prisma.Decimal }[]>`
        SELECT COUNT(DISTINCT numdecaja)::int AS cajas, COALESCE(SUM(cantidad), 0) AS unidades, COALESCE(SUM(pesoempacado), 0) AS kilos FROM t_aduana_wms_pos WHERE numpicking = ${picking}`,
      tx.$queryRaw<{ valor: Prisma.Decimal | null }[]>`SELECT SUM(COALESCE(s.cantidad, 0) * COALESCE(d.precioventa, 0)) AS valor FROM t_ssccxcaja s JOIN t_detalle_prepack d ON d.iddetpripack = s.id WHERE s.idprepack = ${picking}`,
      tx.$queryRaw<{ volumen: Prisma.Decimal }[]>`
        SELECT COALESCE(SUM(COALESCE(t.volumen, 0)), 0) AS volumen FROM (SELECT DISTINCT numdecaja, tipocaja FROM t_aduana_wms_pos WHERE numpicking = ${picking}) x JOIN tiposdecaja t ON t.tipo_caja = x.tipocaja`,
    ]);
    const unidades = Number(cajasRes[0]?.unidades ?? 0);
    if (unidades <= 0) throw new ErrorDeNegocio("El picking no tiene unidades empacadas.");
    const valorMcia = r2(Number(valorRes[0]?.valor ?? 0));

    const cliente = pedido.cliente ? await tx.clientes.findUnique({ where: { nit: pedido.cliente }, select: { nit: true, nombrecliente: true, depto: true } }) : null;
    const sede = pedido.nitvble != null ? await tx.clientesDirecciones.findUnique({ where: { item: pedido.nitvble }, select: { nombrecliente: true, direccion: true, telefono: true, ciudad: true, item: true } }) : null;
    const rem = await remitente(tx);
    const guia = await tx.guiasGeneradas.create({
      data: {
        num_guia: numGuia, transportador: d.transportador, remitente: (rem.nombre ?? d.nombreEmpresa).slice(0, 100), nit_remitente: rem.nit?.slice(0, 50) ?? null,
        ciudad_origen: rem.ciudad?.slice(0, 50) ?? null, cod_ciud_origen: rem.codCiudad?.slice(0, 50) ?? null, fecha_despacho: new Date(),
        destinatario: (sede?.nombrecliente ?? cliente?.nombrecliente ?? "").slice(0, 100), nit_destinatario: cliente?.nit ?? pedido.cliente, direccion: (pedido.direcciondeenvio ?? sede?.direccion ?? "").slice(0, 100),
        telefono: sede?.telefono?.slice(0, 50) ?? null, cod_cliente: sede?.item ?? 0, ciudad_destino: sede?.ciudad?.slice(0, 50) ?? null, departamento: cliente?.depto?.slice(0, 50) ?? null,
        unidades, kilos: r2(Number(cajasRes[0]?.kilos ?? 0)), volumen: r4(Number(pesoRes[0]?.volumen ?? 0)), valor_mercancia: valorMcia, valor_declarado: d.valorDeclarado ?? valorMcia,
        total: d.total ?? 0, anulada: 0, impresa: 0, comentario: (d.comentario ?? rem.comentario ?? "").slice(0, 500) || null, pedido: enc.npedid, caja1: cajasRes[0]?.cajas ?? 0,
        prepackingid: picking, factura: d.factura?.slice(0, 50) ?? null, enviado: false,
      },
    });

    // Lo despachado se descuenta de lo pendiente del pedido (spU_ActualizarCantidadesFacturadas).
    const porProducto = await tx.aduanaWmsPos.groupBy({ by: ["productoean"], where: { numpicking: picking }, _sum: { cantidad: true } });
    for (const p of porProducto) {
      const q = Number(p._sum.cantidad ?? 0);
      if (!p.productoean || q <= 0) continue;
      await tx.$executeRaw`
        UPDATE t_narth_serie_pedido SET udsentreg = COALESCE(udsentreg, 0) + ${q}, reserva = GREATEST(COALESCE(reserva, 0) - ${q}, 0)
        WHERE numpedido = ${enc.npedid} AND ref = ${p.productoean} AND bodega = ${enc.bodegapicking}`;
    }
    const estado = await recalcularEstadoPedido(tx, enc.npedid, true);
    return { guia: guia.auto, numGuia, picking, unidades, estadoPedido: estado };
  });
}

/** Despacho total si todo lo pedido se entregó; parcial si se entregó algo (el picking ya terminó: el resto puede tener otro); si no, vuelve a Aprobado. */
async function recalcularEstadoPedido(tx: Prisma.TransactionClient, numero: string, despachado: boolean) {
  const lineas = await tx.narthSeriePedido.findMany({ where: { numpedido: numero }, select: { pares: true, udsentreg: true } });
  const algo = lineas.some((l) => (l.udsentreg ?? 0) > EPS);
  const todo = lineas.length > 0 && lineas.every((l) => (l.udsentreg ?? 0) >= (l.pares ?? 0) - EPS);
  const estado = todo ? ESTADO.DESPACHO_TOTAL : algo ? ESTADO.DESPACHO_PARCIAL : ESTADO.APROBADO;
  await tx.narthEncabezadoPedido.update({ where: { npedido: numero }, data: { busca_aprobacion: estado, despachado: despachado ? 1 : 0, ...(despachado ? { idpicking: 0 } : {}) } });
  return estado;
}

// ── Ficha y seguimiento ───────────────────────────────────────────────────────────────────────────────────────────

export async function guiaCompleta(db: Db, auto: number) {
  const g = await db.guiasGeneradas.findUnique({ where: { auto } });
  if (!g) return null;
  const [lineas, cajas] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT a.productoean AS ean, d.descripcion, SUM(a.cantidad) AS cantidad, MIN(a.lote) AS lote FROM t_aduana_wms_pos a LEFT JOIN t_detalle_referencia d ON d.productoean = a.productoean
      WHERE a.numpicking = ${g.prepackingid} GROUP BY a.productoean, d.descripcion ORDER BY d.descripcion`,
    db.$queryRaw<Fila[]>`
      SELECT numdecaja AS numero, MIN(tipocaja) AS tipo, SUM(cantidad) AS unidades, SUM(pesoempacado) AS kilos FROM t_aduana_wms_pos WHERE numpicking = ${g.prepackingid} GROUP BY numdecaja ORDER BY numdecaja`,
  ]);
  return { guia: g, estado: estadoDeGuia(g), lineas, cajas };
}

async function guiaVigente(tx: Prisma.TransactionClient, auto: number) {
  const g = await tx.guiasGeneradas.findUnique({ where: { auto } });
  if (!g) throw new ErrorDeNegocio("La guía ya no existe.");
  if ((g.anulada ?? 0) === 1) throw new ErrorDeNegocio("La guía está anulada.");
  return g;
}

export async function marcarEnviada(db: Db, auto: number) {
  return db.$transaction(async (tx) => {
    const g = await guiaVigente(tx, auto);
    if (g.enviado) throw new ErrorDeNegocio("La guía ya está marcada como enviada.");
    await tx.guiasGeneradas.update({ where: { auto }, data: { enviado: true } });
  });
}

export async function marcarEntregada(db: Db, auto: number) {
  return db.$transaction(async (tx) => {
    const g = await guiaVigente(tx, auto);
    if (!g.enviado) throw new ErrorDeNegocio("Primero marca la guía como enviada.");
    if (g.fecha_entregacliente) throw new ErrorDeNegocio("La guía ya está entregada.");
    await tx.guiasGeneradas.update({ where: { auto }, data: { fecha_entregacliente: new Date() } });
  });
}

/** Anula una guía que todavía no salió: devuelve lo entregado al pedido y deja el picking listo para despachar de nuevo. */
export async function anularGuia(db: Db, auto: number) {
  return db.$transaction(async (tx) => {
    const g = await guiaVigente(tx, auto);
    if (g.enviado) throw new ErrorDeNegocio("La guía ya fue enviada: no se puede anular.");
    const enc = await tx.encabezadoPrepack.findUnique({ where: { idmovimiento: g.prepackingid } });
    if (!enc || !enc.npedid) throw new ErrorDeNegocio("El picking de la guía ya no existe.");
    const porProducto = await tx.aduanaWmsPos.groupBy({ by: ["productoean"], where: { numpicking: g.prepackingid }, _sum: { cantidad: true } });
    for (const p of porProducto) {
      const q = Number(p._sum.cantidad ?? 0);
      if (!p.productoean || q <= 0) continue;
      await tx.$executeRaw`
        UPDATE t_narth_serie_pedido SET udsentreg = GREATEST(COALESCE(udsentreg, 0) - ${q}, 0)
        WHERE numpedido = ${enc.npedid} AND ref = ${p.productoean} AND bodega = ${enc.bodegapicking}`;
    }
    await tx.guiasGeneradas.update({ where: { auto }, data: { anulada: 1 } });
    await tx.encabezadoPrepack.update({ where: { idmovimiento: g.prepackingid }, data: { valida: VALIDA_FACTURABLE, facturado: 0 } });
    // El picking vuelve a estar asignado al pedido (se había liberado si el despacho fue total).
    await tx.narthEncabezadoPedido.update({ where: { npedido: enc.npedid }, data: { idpicking: g.prepackingid } });
    await recalcularEstadoPedido(tx, enc.npedid, false);
    return { picking: g.prepackingid };
  });
}
