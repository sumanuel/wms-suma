import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { despachar, VALIDA_FACTURABLE } from "@/lib/despacho/servicio";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";

// Pallets de despacho: agrupan cajas de despacho (las que armó la aduana, t_aduana_wms_pos) para cargarlas juntas. Una caja está en un solo
// pallet. Estados: abierto → cerrado (con medidas y peso) → despachado (con transportador, remesa y placa). Al despachar el pallet se genera la
// guía de cada picking que ya quedó COMPLETO (todas sus cajas en pallets despachados); los pickings partidos esperan a sus otras cajas.

export type Fila = Record<string, unknown>;
export const ESTADOS = { abierto: "Abierto", cerrado: "Cerrado", despachado: "Despachado" } as const;
const r2 = (n: number) => Math.round(n * 100) / 100;
export const MAX_CAJAS_PALLET = 300;

export async function listarPalletsDespacho(db: Db) {
  return db.$queryRaw<Fila[]>`
    SELECT p.id, p.bodega, p.estado, p.creado_en, p.transportador, p.remesa, p.placa, p.peso,
           (SELECT COUNT(*)::int FROM pallet_despacho_caja c WHERE c.pallet_id = p.id) AS cajas,
           (SELECT COUNT(DISTINCT c.picking)::int FROM pallet_despacho_caja c WHERE c.pallet_id = p.id) AS pickings
    FROM pallet_despacho p ORDER BY (p.estado = 'despachado'), p.id DESC LIMIT 100`;
}

export async function crearPalletDespacho(db: Db, bodega: string, usuario: string) {
  const b = await db.insBodega.findUnique({ where: { bodega }, select: { bodega: true, prcierre: true } });
  if (!b) throw new ErrorDeNegocio("Elige una bodega de la lista.");
  if (b.prcierre) throw new ErrorDeNegocio(`La bodega ${bodega} está cerrada.`);
  return (await db.palletDespacho.create({ data: { bodega, creado_por: usuario } })).id;
}

export async function detallePalletDespacho(db: Db, id: number) {
  const p = await db.palletDespacho.findUnique({ where: { id } });
  if (!p) return null;
  const pickings = await db.$queryRaw<Fila[]>`
    SELECT c.picking, ep.npedid AS pedido, cl.nombrecliente AS cliente,
           (COUNT(*))::int AS en_pallet, (SELECT COUNT(DISTINCT a.numdecaja)::int FROM t_aduana_wms_pos a WHERE a.numpicking = c.picking) AS total_cajas,
           (SELECT COALESCE(SUM(a.cantidad), 0) FROM t_aduana_wms_pos a WHERE a.numpicking = c.picking AND a.numdecaja = ANY(ARRAY_AGG(c.caja))) AS unidades,
           (SELECT COALESCE(SUM(a.pesoempacado), 0) FROM t_aduana_wms_pos a WHERE a.numpicking = c.picking AND a.numdecaja = ANY(ARRAY_AGG(c.caja))) AS kilos,
           ARRAY_AGG(c.caja ORDER BY c.caja) AS cajas, ep.valida
    FROM pallet_despacho_caja c LEFT JOIN t_encabezado_prepack ep ON ep.idmovimiento = c.picking
    LEFT JOIN t_narth_encabezado_pedido ne ON ne.npedido = ep.npedid LEFT JOIN t_clientes cl ON cl.nit = ne.cliente
    WHERE c.pallet_id = ${id} GROUP BY c.picking, ep.npedid, cl.nombrecliente, ep.valida ORDER BY c.picking`;
  const listos = p.estado === "abierto"
    ? await db.$queryRaw<Fila[]>`
        SELECT ep.idmovimiento AS picking, ep.npedid AS pedido, cl.nombrecliente AS cliente, COUNT(DISTINCT a.numdecaja)::int AS cajas,
               (COUNT(DISTINCT a.numdecaja) FILTER (WHERE NOT EXISTS (SELECT 1 FROM pallet_despacho_caja c WHERE c.picking = a.numpicking AND c.caja = a.numdecaja)))::int AS libres
        FROM t_encabezado_prepack ep JOIN t_aduana_wms_pos a ON a.numpicking = ep.idmovimiento
        LEFT JOIN t_narth_encabezado_pedido ne ON ne.npedido = ep.npedid LEFT JOIN t_clientes cl ON cl.nit = ne.cliente
        WHERE ep.valida = ${VALIDA_FACTURABLE} AND ep.bodegapicking = ${p.bodega}
        GROUP BY ep.idmovimiento, ep.npedid, cl.nombrecliente
        HAVING COUNT(DISTINCT a.numdecaja) FILTER (WHERE NOT EXISTS (SELECT 1 FROM pallet_despacho_caja c WHERE c.picking = a.numpicking AND c.caja = a.numdecaja)) > 0
        ORDER BY ep.idmovimiento LIMIT 50`
    : [];
  const totales = pickings.reduce((t: { cajas: number; unidades: number; kilos: number }, x) => ({ cajas: t.cajas + Number(x.en_pallet), unidades: t.unidades + Number(x.unidades), kilos: t.kilos + Number(x.kilos) }), { cajas: 0, unidades: 0, kilos: 0 });
  return { pallet: p, pickings, listos, totales: { cajas: totales.cajas, unidades: r2(totales.unidades), kilos: r2(totales.kilos) } };
}

export async function agregarCajasPallet(db: Db, id: number, picking: number, cajas: number[] | null) {
  return db.$transaction(async (tx) => {
    const p = await tx.$queryRaw<{ estado: string; bodega: string }[]>`SELECT estado, bodega FROM pallet_despacho WHERE id = ${id} FOR UPDATE`;
    if (!p[0]) throw new ErrorDeNegocio("El pallet no existe.");
    if (p[0].estado !== "abierto") throw new ErrorDeNegocio(`El pallet ${id} está ${p[0].estado}: ábrelo para agregarle cajas.`);
    const ep = await tx.encabezadoPrepack.findUnique({ where: { idmovimiento: picking }, select: { valida: true, bodegapicking: true } });
    if (!ep) throw new ErrorDeNegocio(`No existe el picking ${picking}.`);
    if (Number(ep.valida ?? 0) !== VALIDA_FACTURABLE) throw new ErrorDeNegocio(`El picking ${picking} no está listo para cargar: debe tener la aduana terminada y no estar despachado.`);
    if (ep.bodegapicking !== p[0].bodega) throw new ErrorDeNegocio(`El picking ${picking} es de la bodega ${ep.bodegapicking}, no de ${p[0].bodega}.`);
    const reales = (await tx.aduanaWmsPos.groupBy({ by: ["numdecaja"], where: { numpicking: picking } })).map((x) => Number(x.numdecaja)).filter((n) => Number.isFinite(n));
    if (reales.length === 0) throw new ErrorDeNegocio(`El picking ${picking} no tiene cajas armadas.`);
    const pedidas = cajas ?? reales;
    const noExisten = pedidas.filter((c) => !reales.includes(c));
    if (noExisten.length) throw new ErrorDeNegocio(`El picking ${picking} no tiene la${noExisten.length === 1 ? "" : "s"} caja${noExisten.length === 1 ? "" : "s"} ${noExisten.join(", ")}.`);
    const ocupadas = await tx.palletDespachoCaja.findMany({ where: { picking, caja: { in: pedidas } }, select: { caja: true, pallet_id: true } });
    const yaEn = ocupadas.filter((o) => o.pallet_id === id).map((o) => o.caja);
    const enOtro = ocupadas.filter((o) => o.pallet_id !== id);
    if (cajas && enOtro.length) throw new ErrorDeNegocio(`La caja ${enOtro[0].caja} del picking ${picking} ya está en el pallet ${enOtro[0].pallet_id}.`);
    const nuevas = pedidas.filter((c) => !ocupadas.some((o) => o.caja === c));
    if (cajas && yaEn.length && nuevas.length === 0) throw new ErrorDeNegocio(`La caja ${yaEn[0]} ya está en este pallet.`);
    if (nuevas.length === 0) throw new ErrorDeNegocio(`Todas las cajas del picking ${picking} ya están en pallets.`);
    const total = await tx.palletDespachoCaja.count({ where: { pallet_id: id } });
    if (total + nuevas.length > MAX_CAJAS_PALLET) throw new ErrorDeNegocio(`Un pallet admite hasta ${MAX_CAJAS_PALLET} cajas.`);
    await tx.palletDespachoCaja.createMany({ data: nuevas.map((caja) => ({ pallet_id: id, picking, caja })) });
    return { agregadas: nuevas.length, omitidas: pedidas.length - nuevas.length };
  });
}

export async function quitarCajaPallet(db: Db, id: number, picking: number, caja: number) {
  return db.$transaction(async (tx) => {
    const p = await tx.$queryRaw<{ estado: string }[]>`SELECT estado FROM pallet_despacho WHERE id = ${id} FOR UPDATE`;
    if (!p[0]) throw new ErrorDeNegocio("El pallet no existe.");
    if (p[0].estado !== "abierto") throw new ErrorDeNegocio(`El pallet ${id} está ${p[0].estado}: ábrelo para sacarle cajas.`);
    const n = await tx.palletDespachoCaja.deleteMany({ where: { pallet_id: id, picking, caja } });
    if (n.count === 0) throw new ErrorDeNegocio("Esa caja no está en el pallet.");
  });
}

const medida = (v: number | null, nombre: string) => {
  if (v === null) return null;
  if (!Number.isFinite(v) || v < 0 || v > 1e6) throw new ErrorDeNegocio(`${nombre} debe ser un número, cero o más.`);
  return r2(v);
};

export async function cerrarPalletDespacho(db: Db, id: number, m: { alto: number | null; ancho: number | null; largo: number | null; peso: number | null }) {
  return db.$transaction(async (tx) => {
    const p = await tx.$queryRaw<{ estado: string; alto: Prisma.Decimal | null; ancho: Prisma.Decimal | null; largo: Prisma.Decimal | null }[]>`SELECT estado, alto, ancho, largo FROM pallet_despacho WHERE id = ${id} FOR UPDATE`;
    if (!p[0]) throw new ErrorDeNegocio("El pallet no existe.");
    if (p[0].estado !== "abierto") throw new ErrorDeNegocio(`El pallet ${id} ya está ${p[0].estado}.`);
    const previo = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));
    m = { ...m, alto: m.alto ?? previo(p[0].alto), ancho: m.ancho ?? previo(p[0].ancho), largo: m.largo ?? previo(p[0].largo) };
    const cajas = await tx.palletDespachoCaja.count({ where: { pallet_id: id } });
    if (cajas === 0) throw new ErrorDeNegocio("El pallet no tiene cajas.");
    const suma = await tx.$queryRaw<{ kilos: Prisma.Decimal }[]>`
      SELECT COALESCE(SUM(a.pesoempacado), 0) AS kilos FROM pallet_despacho_caja c JOIN (SELECT numpicking, numdecaja, SUM(pesoempacado) AS pesoempacado FROM t_aduana_wms_pos GROUP BY numpicking, numdecaja) a ON a.numpicking = c.picking AND a.numdecaja = c.caja WHERE c.pallet_id = ${id}`;
    await tx.palletDespacho.update({ where: { id }, data: { estado: "cerrado", alto: medida(m.alto, "El alto"), ancho: medida(m.ancho, "El ancho"), largo: medida(m.largo, "El largo"), peso: m.peso === null ? r2(Number(suma[0]?.kilos ?? 0)) : medida(m.peso, "El peso") } });
  });
}

export async function reabrirPalletDespacho(db: Db, id: number) {
  const n = await db.palletDespacho.updateMany({ where: { id, estado: "cerrado" }, data: { estado: "abierto" } });
  if (n.count === 0) throw new ErrorDeNegocio("Solo se abre un pallet cerrado (no uno despachado).");
}

export async function eliminarPalletDespacho(db: Db, id: number) {
  const n = await db.palletDespacho.deleteMany({ where: { id, estado: { in: ["abierto", "cerrado"] } } });
  if (n.count === 0) throw new ErrorDeNegocio("El pallet no existe o ya fue despachado.");
}

export type DatosDespachoPallet = { transportador: string; remesa: string | null; placa: string | null; comentario: string | null; nombreEmpresa: string };

/** Despacha el pallet y genera la guía de cada picking que quedó completo. Devuelve qué guías se generaron y cuáles quedaron pendientes. */
export async function despacharPallet(db: Db, id: number, d: DatosDespachoPallet, usuario: string) {
  const trans = await db.transportador.findUnique({ where: { transportador: d.transportador } });
  if (!trans) throw new ErrorDeNegocio("Elige un transportador de la lista.");
  if ((trans.estado ?? 0) !== 1) throw new ErrorDeNegocio("El transportador está inactivo.");
  const marcado = await db.palletDespacho.updateMany({
    where: { id, estado: "cerrado" },
    data: { estado: "despachado", transportador: d.transportador, remesa: d.remesa?.slice(0, 50) || null, placa: d.placa?.slice(0, 20) || null, despachado_en: new Date(), despachado_por: usuario },
  });
  if (marcado.count === 0) throw new ErrorDeNegocio("Solo se despacha un pallet cerrado.");
  // Pickings de este pallet y si ya están completos (todas sus cajas en pallets despachados).
  const pickings = await db.$queryRaw<{ picking: number; total: number; cargadas: number }[]>`
    SELECT c.picking, (SELECT COUNT(DISTINCT a.numdecaja)::int FROM t_aduana_wms_pos a WHERE a.numpicking = c.picking) AS total,
           (SELECT COUNT(*)::int FROM pallet_despacho_caja x JOIN pallet_despacho q ON q.id = x.pallet_id WHERE x.picking = c.picking AND q.estado = 'despachado') AS cargadas
    FROM pallet_despacho_caja c WHERE c.pallet_id = ${id} GROUP BY c.picking ORDER BY c.picking`;
  const guias: { picking: number; numGuia: string }[] = [];
  const pendientes: { picking: number; motivo: string }[] = [];
  const comentario = [d.comentario?.trim(), `Pallet ${id}`, d.remesa ? `remesa ${d.remesa}` : null, d.placa ? `placa ${d.placa}` : null].filter(Boolean).join(" · ");
  for (const p of pickings) {
    if (p.cargadas < p.total) { pendientes.push({ picking: p.picking, motivo: `faltan ${p.total - p.cargadas} caja${p.total - p.cargadas === 1 ? "" : "s"} por cargar en otros pallets` }); continue; }
    try {
      const r = await despachar(db, p.picking, { transportador: d.transportador, factura: null, valorDeclarado: null, total: null, comentario, nombreEmpresa: d.nombreEmpresa });
      guias.push({ picking: p.picking, numGuia: r.numGuia });
    } catch (e) {
      if (e instanceof ErrorDeNegocio) pendientes.push({ picking: p.picking, motivo: e.message });
      else throw e;
    }
  }
  return { guias, pendientes };
}

export async function etiquetaPalletDespacho(db: Db, id: number) {
  const f = await detallePalletDespacho(db, id);
  if (!f) return null;
  return { ...f, destinos: f.pickings.map((x) => ({ picking: Number(x.picking), pedido: String(x.pedido ?? ""), cliente: String(x.cliente ?? ""), cajas: Number(x.en_pallet) })) };
}
