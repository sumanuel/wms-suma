import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";

// Aduana: verificación y empaque de un picking ya pickeado (valida 5). Se arman cajas numeradas con su tipo y se mete en ellas,
// artículo por artículo, todo lo pickeado (t_aduana_wms_pos). Nunca se puede empacar más de lo pickeado y solo se termina cuando
// lo empacado de cada artículo iguala lo pickeado; entonces el picking pasa a «Listo para factura» (valida 7). Porta
// spI_T_Aduana_WMS_POS_xPedido, usp_EstableceAutoAduanagMDC2 y usp_TerminarAduanaDePicking_AduanaNew.

export const VALIDA_ADUANA = 5;
export const VALIDA_FACTURA = 7;
const r4 = (n: number) => Math.round(n * 10000) / 10000;
const EPS = 1e-6;

export type Fila = Record<string, unknown>;
export type Orden = { columna: string; dir: "asc" | "desc" };
export type PedidoConsulta = { texto: string; filtros: Record<string, string>; orden: Orden[]; salto: number; cantidad: number };

function ordenarPor(orden: Orden[], permitidas: Record<string, string>, porDefecto: string) {
  const o = orden[0];
  const expr = o && permitidas[o.columna] ? permitidas[o.columna] : porDefecto;
  return Prisma.raw(`${expr} ${o?.dir === "desc" ? "DESC" : "ASC"} NULLS LAST`);
}

// ── Listado ───────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listarAduana(db: Db, q: PedidoConsulta, valida: number) {
  const cond: Prisma.Sql[] = [Prisma.sql`COALESCE(ep.valida, 0) = ${valida}`];
  if (q.texto) {
    const p = `%${q.texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    cond.push(Prisma.sql`(ep.idmovimiento::text ILIKE ${p} OR ep.npedid ILIKE ${p} OR c.nombrecliente ILIKE ${p} OR ep.nom_empacador ILIKE ${p})`);
  }
  if (q.filtros.bodega) cond.push(Prisma.sql`ep.bodegapicking = ${q.filtros.bodega}`);
  const donde = Prisma.sql`WHERE ${Prisma.join(cond, " AND ")}`;
  const desde = Prisma.sql`FROM t_encabezado_prepack ep
    LEFT JOIN t_narth_encabezado_pedido ne ON ne.npedido = ep.npedid
    LEFT JOIN t_clientes c ON c.nit = ne.cliente
    LEFT JOIN (SELECT idprepack, SUM(COALESCE(cantidad, 0)) AS pickeado FROM t_ssccxcaja GROUP BY idprepack) s ON s.idprepack = ep.idmovimiento
    LEFT JOIN (SELECT numpicking, SUM(COALESCE(cantidad, 0)) AS empacado, COUNT(DISTINCT numdecaja)::int AS cajas FROM t_aduana_wms_pos GROUP BY numpicking) a ON a.numpicking = ep.idmovimiento`;
  const orden = ordenarPor(
    q.orden,
    { numero: "ep.idmovimiento", fecha: "ep.fecha", pedido: "ep.npedid", cliente: "c.nombrecliente", bodega: "ep.bodegapicking", pickeado: "s.pickeado", cajas: "a.cajas" },
    "ep.idmovimiento",
  );
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT ep.idmovimiento AS numero, ep.fecha, ep.npedid AS pedido, c.nombrecliente AS cliente, ep.bodegapicking AS bodega, ep.nom_empacador AS pickeador,
             COALESCE(s.pickeado, 0) AS pickeado, COALESCE(a.empacado, 0) AS empacado, COALESCE(a.cajas, 0) AS cajas
      ${desde} ${donde} ORDER BY ${orden}, ep.idmovimiento LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n ${desde} ${donde}`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

// ── Estado de la aduana de un picking ─────────────────────────────────────────────────────────────────────────────

export async function estadoAduana(db: Db, id: number) {
  const encabezado = await db.encabezadoPrepack.findUnique({ where: { idmovimiento: id } });
  if (!encabezado) return null;
  const [productos, items, tipos, cliente] = await Promise.all([
    db.$queryRaw<{ ean: string; descripcion: string | null; pickeado: Prisma.Decimal; empacado: Prisma.Decimal; peso: number | null }[]>`
      SELECT s.eancontenido AS ean, d.descripcion, SUM(COALESCE(s.cantidad, 0)) AS pickeado,
             COALESCE((SELECT SUM(COALESCE(a.cantidad, 0)) FROM t_aduana_wms_pos a WHERE a.numpicking = ${id} AND a.productoean = s.eancontenido), 0) AS empacado,
             MAX(d.hrpeso) AS peso
      FROM t_ssccxcaja s LEFT JOIN t_detalle_referencia d ON d.productoean = s.eancontenido
      WHERE s.idprepack = ${id} GROUP BY s.eancontenido, d.descripcion ORDER BY d.descripcion, s.eancontenido`,
    db.aduanaWmsPos.findMany({ where: { numpicking: id }, orderBy: [{ numdecaja: "asc" }, { id: "asc" }] }),
    db.tiposdecaja.findMany({ select: { tipo_caja: true, descripcioncaja: true, peso: true }, orderBy: { tipo_caja: "asc" } }),
    encabezado.nitprepack ? db.clientes.findUnique({ where: { nit: encabezado.nitprepack }, select: { nombrecliente: true } }) : null,
  ]);
  const nombres = new Map(productos.map((p) => [p.ean, p.descripcion ?? p.ean]));
  const cajas = new Map<number, { numero: number; tipo: string; items: { id: number; ean: string; descripcion: string; cantidad: number; peso: number; lote: string }[] }>();
  for (const i of items) {
    const n = i.numdecaja ?? 0;
    const c = cajas.get(n) ?? { numero: n, tipo: i.tipocaja, items: [] };
    c.items.push({ id: i.id, ean: i.productoean ?? "", descripcion: nombres.get(i.productoean ?? "") ?? i.productoean ?? "", cantidad: i.cantidad ?? 0, peso: Number(i.pesoempacado ?? 0), lote: i.lote ?? "" });
    cajas.set(n, c);
  }
  return {
    encabezado, cliente: cliente?.nombrecliente ?? null, tipos,
    productos: productos.map((p) => ({ ean: p.ean, descripcion: p.descripcion ?? p.ean, pickeado: Number(p.pickeado), empacado: Number(p.empacado), peso: p.peso ?? 0 })),
    cajas: [...cajas.values()],
  };
}

// ── Empacar ───────────────────────────────────────────────────────────────────────────────────────────────────────

async function exigirEnAduana(tx: Prisma.TransactionClient, id: number) {
  const enc = await tx.encabezadoPrepack.findUnique({ where: { idmovimiento: id } });
  if (!enc) throw new ErrorDeNegocio("El picking ya no existe.");
  if (Number(enc.valida ?? 0) !== VALIDA_ADUANA) throw new ErrorDeNegocio("El picking no está en aduana (ya se terminó o todavía no se pickea por completo).");
  return enc;
}

async function pickeadoPorProducto(tx: Prisma.TransactionClient, id: number) {
  const f = await tx.ssccxcaja.groupBy({ by: ["eancontenido"], where: { idprepack: id }, _sum: { cantidad: true } });
  return new Map(f.map((x) => [x.eancontenido ?? "", Number(x._sum.cantidad ?? 0)]));
}
async function empacadoPorProducto(tx: Prisma.TransactionClient, id: number) {
  const f = await tx.aduanaWmsPos.groupBy({ by: ["productoean"], where: { numpicking: id }, _sum: { cantidad: true } });
  return new Map(f.map((x) => [x.productoean ?? "", Number(x._sum.cantidad ?? 0)]));
}

async function agregarAlCaja(tx: Prisma.TransactionClient, enc: { idmovimiento: number; npedid: string | null }, p: { ean: string; numcaja: number; cantidad: number; tipo: string }) {
  if (!Number.isInteger(p.numcaja) || p.numcaja < 1 || p.numcaja > 9999) throw new ErrorDeNegocio("El número de caja debe ser un entero entre 1 y 9999.");
  if (!(p.cantidad > 0)) throw new ErrorDeNegocio("La cantidad debe ser mayor que cero.");
  const tipo = await tx.tiposdecaja.findUnique({ where: { tipo_caja: p.tipo } });
  if (!tipo) throw new ErrorDeNegocio("Elige un tipo de caja de la lista (se crean en Maestros › Tipos de caja).");
  // Una caja tiene un solo tipo.
  const existente = await tx.aduanaWmsPos.findFirst({ where: { numpicking: enc.idmovimiento, numdecaja: p.numcaja } });
  if (existente && existente.tipocaja !== p.tipo) throw new ErrorDeNegocio(`La caja ${p.numcaja} ya es de tipo ${existente.tipocaja}: no se puede mezclar tipos.`);

  const pickeado = (await pickeadoPorProducto(tx, enc.idmovimiento)).get(p.ean);
  if (pickeado === undefined) throw new ErrorDeNegocio("Ese artículo no se pickeó en este picking.");
  const empacado = (await empacadoPorProducto(tx, enc.idmovimiento)).get(p.ean) ?? 0;
  if (empacado + p.cantidad > pickeado + EPS) throw new ErrorDeNegocio(`Se excede lo pickeado: se pickearon ${pickeado}, ya hay ${empacado} empacados y se intentan ${p.cantidad} más.`);

  const peso = (await tx.detalleReferencia.findUnique({ where: { productoean: p.ean }, select: { hrpeso: true } }))?.hrpeso ?? 0;
  const mismo = await tx.aduanaWmsPos.findFirst({ where: { numpicking: enc.idmovimiento, numdecaja: p.numcaja, productoean: p.ean } });
  if (mismo) {
    const cantidad = r4((mismo.cantidad ?? 0) + p.cantidad);
    await tx.aduanaWmsPos.update({ where: { id: mismo.id }, data: { cantidad, pesoempacado: r4(cantidad * peso) } });
    return;
  }
  await tx.aduanaWmsPos.create({
    data: { numpicking: enc.idmovimiento, productoean: p.ean, numdecaja: p.numcaja, cantidad: r4(p.cantidad), tipocaja: p.tipo, pesoempacado: r4(p.cantidad * peso), fecharegistro: new Date(), npedido: enc.npedid?.slice(0, 20) ?? null },
  });
}

export async function empacar(db: Db, id: number, p: { ean: string; numcaja: number; cantidad: number; tipo: string }) {
  return db.$transaction(async (tx) => {
    const enc = await exigirEnAduana(tx, id);
    await agregarAlCaja(tx, enc, p);
  });
}

/** Empaca todo lo que falta de cada artículo en una sola caja nueva (como usp_EstableceAutoAduanagMDC2). */
export async function empacarTodo(db: Db, id: number, tipo: string) {
  return db.$transaction(async (tx) => {
    const enc = await exigirEnAduana(tx, id);
    const pick = await pickeadoPorProducto(tx, id);
    const emp = await empacadoPorProducto(tx, id);
    const max = await tx.aduanaWmsPos.aggregate({ where: { numpicking: id }, _max: { numdecaja: true } });
    const caja = (max._max.numdecaja ?? 0) + 1;
    let lineas = 0;
    for (const [ean, p] of pick) {
      const falta = r4(p - (emp.get(ean) ?? 0));
      if (falta > EPS) {
        await agregarAlCaja(tx, enc, { ean, numcaja: caja, cantidad: falta, tipo });
        lineas++;
      }
    }
    if (lineas === 0) throw new ErrorDeNegocio("No hay nada pendiente por empacar.");
    return { caja, lineas };
  });
}

/** Empaca según las cajas de despacho que se indicaron al pickear (t_ssccxcaja.numcajade). */
export async function empacarComoPickeado(db: Db, id: number, tipo: string) {
  return db.$transaction(async (tx) => {
    const enc = await exigirEnAduana(tx, id);
    const grupos = await tx.ssccxcaja.groupBy({ by: ["eancontenido", "numcajade"], where: { idprepack: id }, _sum: { cantidad: true } });
    grupos.sort((x, y) => (x.numcajade ?? 1) - (y.numcajade ?? 1) || (x.eancontenido ?? "").localeCompare(y.eancontenido ?? ""));
    // Lo ya empacado se compara caja por caja, y nunca se pasa de lo que falta en total de cada artículo.
    const pick = await pickeadoPorProducto(tx, id);
    const emp = await empacadoPorProducto(tx, id);
    const restante = new Map([...pick].map(([e, v]) => [e, r4(v - (emp.get(e) ?? 0))]));
    const yaEnCaja = new Map<string, number>();
    for (const r of await tx.aduanaWmsPos.findMany({ where: { numpicking: id } })) {
      const k = `${r.productoean}|${r.numdecaja}`;
      yaEnCaja.set(k, (yaEnCaja.get(k) ?? 0) + (r.cantidad ?? 0));
    }
    let lineas = 0;
    for (const g of grupos) {
      const ean = g.eancontenido ?? "";
      const caja = g.numcajade ?? 1;
      const total = Number(g._sum.cantidad ?? 0);
      const falta = r4(Math.min(total - (yaEnCaja.get(`${ean}|${caja}`) ?? 0), restante.get(ean) ?? 0));
      if (falta > EPS) {
        await agregarAlCaja(tx, enc, { ean, numcaja: caja, cantidad: falta, tipo });
        restante.set(ean, r4((restante.get(ean) ?? 0) - falta));
        lineas++;
      }
    }
    if (lineas === 0) throw new ErrorDeNegocio("No hay nada pendiente por empacar.");
    return { lineas };
  });
}

export async function quitarItem(db: Db, id: number, idItem: number) {
  return db.$transaction(async (tx) => {
    await exigirEnAduana(tx, id);
    const r = await tx.aduanaWmsPos.deleteMany({ where: { id: idItem, numpicking: id } });
    return r.count > 0;
  });
}

export async function reiniciarAduana(db: Db, id: number) {
  return db.$transaction(async (tx) => {
    await exigirEnAduana(tx, id);
    return (await tx.aduanaWmsPos.deleteMany({ where: { numpicking: id } })).count;
  });
}

// ── Terminar ──────────────────────────────────────────────────────────────────────────────────────────────────────

export async function terminarAduana(db: Db, id: number) {
  return db.$transaction(async (tx) => {
    await exigirEnAduana(tx, id);
    const emp = await empacadoPorProducto(tx, id);
    if ([...emp.values()].every((v) => v <= 0)) throw new ErrorDeNegocio("Este picking no tiene productos empacados todavía.");
    const pick = await pickeadoPorProducto(tx, id);
    const incompletos = [...pick].filter(([ean, p]) => Math.abs(p - (emp.get(ean) ?? 0)) > EPS);
    if (incompletos.length > 0) {
      const nombres = await tx.detalleReferencia.findMany({ where: { productoean: { in: incompletos.map(([e]) => e) } }, select: { productoean: true, descripcion: true } });
      const n = new Map(nombres.map((x) => [x.productoean, x.descripcion ?? x.productoean]));
      throw new ErrorDeNegocio(`Hay cantidades empacadas distintas de lo pickeado: ${incompletos.map(([e, p]) => `${n.get(e) ?? e} (pickeado ${p}, empacado ${emp.get(e) ?? 0})`).join("; ")}.`);
    }
    await tx.$executeRaw`UPDATE t_detalle_prepack SET saldoaduana = COALESCE(diponepick, 0) WHERE numpicking = ${id}`;
    await tx.$executeRaw`UPDATE t_ssccxcaja SET cantidadaduanada = COALESCE(cantidad, 0) WHERE idprepack = ${id}`;
    // Como ActualizaLoteTerminaAduana: cada renglón de caja queda con el o los lotes de lo pickeado de ese artículo.
    const lotes = await tx.$queryRaw<{ ean: string; lotes: string }[]>`
      SELECT product AS ean, string_agg(DISTINCT lothe, ',' ORDER BY lothe) AS lotes FROM t_detalle_prepack WHERE numpicking = ${id} GROUP BY product`;
    for (const l of lotes) await tx.aduanaWmsPos.updateMany({ where: { numpicking: id, productoean: l.ean }, data: { lote: (l.lotes ?? "").slice(0, 50) } });
    await tx.encabezadoPrepack.update({ where: { idmovimiento: id }, data: { valida: VALIDA_FACTURA } });
    const cajas = await tx.aduanaWmsPos.groupBy({ by: ["numdecaja"], where: { numpicking: id } });
    return { cajas: cajas.length };
  });
}
