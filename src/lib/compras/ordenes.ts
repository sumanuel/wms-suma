import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { MAXIMO_FILAS, leerArchivo, leerFecha, leerNumero, normalizar } from "@/lib/pedidos/importacion";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";

// Órdenes de compra a proveedores (t_orden_compra + t_detalle_orden_compra, las tablas del sistema anterior). Una orden dice qué se
// espera recibir de un proveedor; la recepción (lib/recepcion) descuenta lo recibido de cada línea y la orden pasa de Abierta a
// Parcial y a Cerrada cuando no queda nada pendiente. Se puede cerrar antes (con una razón) o anular mientras no se haya recibido nada.

export const ESTADOS = { abierta: "Abierta", parcial: "Parcial", cerrada: "Cerrada", anulada: "Anulada" } as const;
export const MAX_LINEAS_ORDEN = 200;
export type Fila = Record<string, unknown>;
export type Orden = { orden: number; bodega: string; nit: string; esperada: string | null; observaciones: string | null; lineas: { ean: string; cantidad: number; precio: number | null }[] };

const r4 = (n: number) => Math.round(n * 10000) / 10000;
const esFecha = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T00:00:00.000Z`).toISOString().slice(0, 10) === s;

// ── Consultas ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type PedidoConsulta = { texto: string; filtros: Record<string, string>; orden: { columna: string; dir: "asc" | "desc" }[]; salto: number; cantidad: number };

export async function listarOrdenes(db: Db, q: PedidoConsulta) {
  const cond: Prisma.Sql[] = [];
  if (q.texto) {
    const p = `%${q.texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    cond.push(Prisma.sql`(o.numordencompra::text ILIKE ${p} OR o.proveedor ILIKE ${p} OR c.nombrecliente ILIKE ${p} OR o.observacionescompra ILIKE ${p})`);
  }
  if (q.filtros.estado) cond.push(Prisma.sql`o.estado = ${q.filtros.estado}`);
  const donde = cond.length ? Prisma.sql`WHERE ${Prisma.join(cond, " AND ")}` : Prisma.empty;
  const permitidas: Record<string, string> = { numero: "o.numordencompra", fecha: "o.fechacompra", proveedor: "c.nombrecliente", estado: "o.estado", pedido: "SUM(d.requerido)" };
  const o = q.orden[0];
  const orden = Prisma.raw(`${o && permitidas[o.columna] ? permitidas[o.columna] : "o.numordencompra"} ${o?.dir === "asc" ? "ASC" : "DESC"} NULLS LAST`);
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT o.numordencompra AS numero, o.fechacompra AS fecha, o.proveedor AS nit, c.nombrecliente AS proveedor, MIN(d.bodega) AS bodega, o.estado,
             COUNT(d.iddetordcomppra)::int AS lineas, COALESCE(SUM(d.requerido), 0) AS pedido, COALESCE(SUM(d.recibidok), 0) AS recibido
      FROM t_orden_compra o LEFT JOIN t_clientes c ON c.nit = o.proveedor LEFT JOIN t_detalle_orden_compra d ON d.nordencompra = o.numordencompra
      ${donde} GROUP BY o.numordencompra, c.nombrecliente ORDER BY ${orden}, o.numordencompra DESC LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_orden_compra o LEFT JOIN t_clientes c ON c.nit = o.proveedor ${donde}`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

export async function fichaOrden(db: Db, numero: number) {
  const o = await db.ordenCompra.findUnique({ where: { numordencompra: numero } });
  if (!o) return null;
  const [proveedor, lineas, recepciones] = await Promise.all([
    o.proveedor ? db.clientes.findUnique({ where: { nit: o.proveedor }, select: { nit: true, nombrecliente: true } }) : null,
    db.$queryRaw<Fila[]>`
      SELECT d.iddetordcomppra AS id, d.eanproveedores AS ean, r.descripcion AS articulo, d.requerido AS pedido, COALESCE(d.recibidok, 0) AS recibido,
             GREATEST(COALESCE(d.requerido, 0) - COALESCE(d.recibidok, 0), 0) AS pendiente, d.precioentra AS precio, d.bodega, d.fechaprometidad AS esperada
      FROM t_detalle_orden_compra d LEFT JOIN t_detalle_referencia r ON r.productoean = d.eanproveedores WHERE d.nordencompra = ${numero} ORDER BY d.iddetordcomppra`,
    db.$queryRaw<Fila[]>`
      SELECT MIN(er.fecha) AS fecha, COUNT(*)::int AS cajas, SUM(er.cantidadprog) AS unidades, MIN(er.cajano)::bigint AS desde, MAX(er.cajano)::bigint AS hasta
      FROM t_entradas_ras er WHERE er.describteetiqueta LIKE ${`Recepción OC-${numero}`} GROUP BY er.fecha::date ORDER BY MIN(er.fecha) DESC`,
  ]);
  return { orden: o, proveedor, lineas, recepciones };
}

/** Órdenes que todavía esperan mercancía (para elegir al recibir). */
export async function ordenesPorRecibir(db: Db) {
  return db.$queryRaw<Fila[]>`
    SELECT o.numordencompra AS numero, c.nombrecliente AS proveedor, o.estado, MIN(d.bodega) AS bodega,
           COALESCE(SUM(GREATEST(COALESCE(d.requerido, 0) - COALESCE(d.recibidok, 0), 0)), 0) AS pendiente
    FROM t_orden_compra o LEFT JOIN t_clientes c ON c.nit = o.proveedor JOIN t_detalle_orden_compra d ON d.nordencompra = o.numordencompra
    WHERE o.estado IN ('Abierta', 'Parcial') AND COALESCE(o.anulado, 0) = 0 GROUP BY o.numordencompra, c.nombrecliente HAVING SUM(GREATEST(COALESCE(d.requerido, 0) - COALESCE(d.recibidok, 0), 0)) > 0
    ORDER BY o.numordencompra DESC LIMIT 50`;
}

// ── Crear, cerrar, anular ─────────────────────────────────────────────────────────────────────────────────────────

async function validar(tx: Db | Prisma.TransactionClient, o: Orden) {
  if (!o.nit.trim()) throw new ErrorDeNegocio("Falta el NIT del proveedor.");
  if (!(await tx.clientes.findUnique({ where: { nit: o.nit.trim() }, select: { nit: true } }))) throw new ErrorDeNegocio(`No existe un tercero con el NIT ${o.nit}.`);
  const bod = await tx.insBodega.findUnique({ where: { bodega: o.bodega }, select: { bodega: true, prcierre: true } });
  if (!bod) throw new ErrorDeNegocio(`No existe la bodega «${o.bodega}».`);
  if (bod.prcierre) throw new ErrorDeNegocio(`La bodega ${o.bodega} está cerrada.`);
  if (o.esperada && !esFecha(o.esperada)) throw new ErrorDeNegocio("La fecha esperada no es válida.");
  if (o.lineas.length === 0) throw new ErrorDeNegocio("La orden necesita al menos una línea.");
  if (o.lineas.length > MAX_LINEAS_ORDEN) throw new ErrorDeNegocio(`Una orden admite hasta ${MAX_LINEAS_ORDEN} líneas.`);
  const vistos = new Set<string>();
  const arts = new Map((await tx.detalleReferencia.findMany({ where: { productoean: { in: o.lineas.map((l) => l.ean) } }, select: { productoean: true, descripcion: true, inventariable: true } })).map((a) => [a.productoean, a]));
  o.lineas.forEach((l, i) => {
    const n = i + 1;
    const a = arts.get(l.ean);
    if (!a) throw new ErrorDeNegocio(`Línea ${n}: no existe el artículo ${l.ean || "(sin código)"}.`);
    if ((a.inventariable ?? 1) === 0) throw new ErrorDeNegocio(`Línea ${n}: el artículo ${l.ean} no es inventariable.`);
    if (vistos.has(l.ean)) throw new ErrorDeNegocio(`Línea ${n}: el artículo ${l.ean} está repetido; suma las cantidades en una sola línea.`);
    vistos.add(l.ean);
    if (!Number.isFinite(l.cantidad) || l.cantidad <= 0 || l.cantidad > 1e9) throw new ErrorDeNegocio(`Línea ${n}: la cantidad debe ser mayor que cero.`);
    if (l.precio !== null && (!Number.isFinite(l.precio) || l.precio < 0)) throw new ErrorDeNegocio(`Línea ${n}: el precio debe ser cero o más.`);
  });
  return arts;
}

async function insertar(tx: Prisma.TransactionClient, o: Orden, usuario: string, numero: number, descripciones: Map<string, { descripcion: string | null }>) {
  await tx.ordenCompra.create({
    data: { numordencompra: numero, fechacompra: new Date(), proveedor: o.nit.trim(), observacionescompra: o.observaciones?.trim().slice(0, 500) || null, elabora: usuario.slice(0, 50), estado: ESTADOS.abierta, anulado: 0, tipooc: "WMS" },
  });
  await tx.detalleOrdenCompra.createMany({
    data: o.lineas.map((l) => ({
      nordencompra: numero, eanproveedores: l.ean, requerido: l.cantidad, recibidok: 0, cantpendientexrecib: l.cantidad, precioentra: l.precio, bodega: o.bodega, provasignado: o.nit.trim().slice(0, 15),
      fechaprometidad: o.esperada ? new Date(`${o.esperada}T00:00:00.000Z`) : null, descrive: descripciones.get(l.ean)?.descripcion?.slice(0, 150) ?? null, cumplido: 0,
    })),
  });
}

export async function crearOrden(db: Db, o: Orden, usuario: string) {
  return db.$transaction(async (tx) => {
    const arts = await validar(tx, o);
    await tx.$executeRaw`LOCK TABLE t_orden_compra IN EXCLUSIVE MODE`;
    const max = await tx.ordenCompra.aggregate({ _max: { numordencompra: true } });
    const numero = (max._max.numordencompra ?? 0) + 1;
    await insertar(tx, o, usuario, numero, arts);
    return numero;
  });
}

export async function cerrarOrden(db: Db, numero: number, razon: string) {
  if (!razon.trim()) throw new ErrorDeNegocio("Explica por qué se cierra la orden con lo que falta.");
  const n = await db.ordenCompra.updateMany({
    where: { numordencompra: numero, estado: { in: [ESTADOS.abierta, ESTADOS.parcial] } },
    data: { estado: ESTADOS.cerrada, fecharecibe: new Date(), observacionesrecibo: `Cerrada con pendiente: ${razon.trim()}`.slice(0, 500) },
  });
  if (n.count === 0) throw new ErrorDeNegocio("La orden ya está cerrada o anulada.");
}

export async function anularOrden(db: Db, numero: number, razon: string) {
  if (!razon.trim()) throw new ErrorDeNegocio("Explica por qué se anula la orden.");
  return db.$transaction(async (tx) => {
    const o = await tx.ordenCompra.findUnique({ where: { numordencompra: numero } });
    if (!o) throw new ErrorDeNegocio("La orden no existe.");
    if (o.estado === ESTADOS.anulada) throw new ErrorDeNegocio("La orden ya está anulada.");
    const rec = await tx.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_detalle_orden_compra WHERE nordencompra = ${numero} AND COALESCE(recibidok, 0) > 0`;
    if ((rec[0]?.n ?? 0) > 0) throw new ErrorDeNegocio("La orden ya recibió mercancía: no se anula, ciérrala con lo que falta.");
    await tx.ordenCompra.update({ where: { numordencompra: numero }, data: { estado: ESTADOS.anulada, anulado: 1, observacionesrecibo: `Anulada: ${razon.trim()}`.slice(0, 500) } });
  });
}

// ── Importar desde una planilla (la vía para traer las órdenes del ERP) ────────────────────────────────────────────

export const COLUMNAS = [
  { campo: "orden", titulo: "Orden", otros: ["numero", "numero de orden", "oc", "orden de compra"], obligatoria: true },
  { campo: "nit", titulo: "NIT proveedor", otros: ["nit", "proveedor"], obligatoria: true },
  { campo: "bodega", titulo: "Bodega", otros: [], obligatoria: true },
  { campo: "esperada", titulo: "Fecha esperada", otros: ["fecha", "fecha de entrega", "entrega"], obligatoria: false },
  { campo: "ean", titulo: "Código de barras", otros: ["ean", "codigo", "articulo", "sku"], obligatoria: true },
  { campo: "cantidad", titulo: "Cantidad", otros: ["cant", "unidades"], obligatoria: true },
  { campo: "precio", titulo: "Precio", otros: ["precio unitario", "costo"], obligatoria: false },
  { campo: "observaciones", titulo: "Observaciones", otros: ["nota", "notas", "observacion"], obligatoria: false },
] as const;
type Campo = (typeof COLUMNAS)[number]["campo"];

export type OrdenAnalizada = { clave: string; nit: string; bodega: string; esperada: string | null; observaciones: string | null; lineas: { fila: number; ean: string; articulo: string; cantidad: number; precio: number | null }[]; errores: string[] };
export type AnalisisOrdenes = { error?: string; ordenes: OrdenAnalizada[]; filas: number; ignoradas: string[] };

export async function analizarOrdenes(db: Db, archivo: File): Promise<AnalisisOrdenes> {
  const vacio = { ordenes: [], filas: 0, ignoradas: [] as string[] };
  const leido = await leerArchivo(archivo);
  if ("error" in leido) return { ...vacio, error: leido.error };
  const [encabezado = [], ...resto] = leido.celdas;
  const titulos = encabezado.map((t) => normalizar(t.replace(/\s*\*+\s*$/, "")));
  const pos = Object.fromEntries(COLUMNAS.map((c) => [c.campo, titulos.findIndex((t) => t === normalizar(c.titulo) || (c.otros as readonly string[]).includes(t))])) as Record<Campo, number>;
  const faltan = COLUMNAS.filter((c) => c.obligatoria && pos[c.campo] === -1).map((c) => c.titulo);
  if (faltan.length > 0) return { ...vacio, error: `A la planilla le faltan columnas obligatorias: ${faltan.join(", ")}. Descarga la planilla modelo.` };
  const usadas = new Set(Object.values(pos).filter((p) => p >= 0));
  const ignoradas = encabezado.filter((t, i) => t !== "" && !usadas.has(i));
  const filas = resto.map((celdas, i) => ({ fila: i + 2, v: Object.fromEntries(COLUMNAS.map((c) => [c.campo, pos[c.campo] >= 0 ? (celdas[pos[c.campo]] ?? "").trim() : ""])) as Record<Campo, string> })).filter((f) => Object.values(f.v).some((x) => x !== ""));
  if (filas.length === 0) return { ...vacio, ignoradas, error: "La planilla no tiene filas con datos." };
  if (filas.length > MAXIMO_FILAS) return { ...vacio, ignoradas, error: `La planilla tiene ${filas.length} filas: el máximo es ${MAXIMO_FILAS}.` };

  const nits = [...new Set(filas.map((f) => f.v.nit).filter(Boolean))];
  const eans = [...new Set(filas.map((f) => f.v.ean).filter(Boolean))];
  const bodegas = [...new Set(filas.map((f) => f.v.bodega).filter(Boolean))];
  const [cl, ar, bo] = await Promise.all([
    db.clientes.findMany({ where: { nit: { in: nits } }, select: { nit: true } }),
    db.detalleReferencia.findMany({ where: { productoean: { in: eans } }, select: { productoean: true, descripcion: true, inventariable: true } }),
    db.insBodega.findMany({ where: { bodega: { in: bodegas } }, select: { bodega: true, prcierre: true } }),
  ]);
  const nitOk = new Set(cl.map((c) => c.nit));
  const art = new Map(ar.map((a) => [a.productoean, a]));
  const bod = new Map(bo.map((b) => [b.bodega, b]));

  const grupos = new Map<string, typeof filas>();
  for (const f of filas) grupos.set(f.v.orden || "(sin número)", [...(grupos.get(f.v.orden || "(sin número)") ?? []), f]);
  const ordenes: OrdenAnalizada[] = [];
  for (const [clave, fs] of grupos) {
    const errores: string[] = [];
    const p = fs[0].v;
    if (clave === "(sin número)") errores.push("Hay filas sin número de orden.");
    if (!nitOk.has(p.nit)) errores.push(`No existe un tercero con el NIT ${p.nit || "(vacío)"}.`);
    if (!bod.has(p.bodega)) errores.push(`No existe la bodega «${p.bodega || "(vacía)"}».`);
    else if (bod.get(p.bodega)!.prcierre) errores.push(`La bodega ${p.bodega} está cerrada.`);
    for (const f of fs) {
      if (f.v.nit !== p.nit || f.v.bodega !== p.bodega) errores.push(`Fila ${f.fila}: el proveedor o la bodega difiere del resto de la orden.`);
    }
    let esperada: string | null = null;
    if (p.esperada) { esperada = leerFecha(p.esperada); if (!esperada) errores.push("La fecha esperada no es válida (usa AAAA-MM-DD o DD/MM/AAAA)."); }
    const lineas: OrdenAnalizada["lineas"] = [];
    const vistos = new Set<string>();
    for (const f of fs) {
      const a = art.get(f.v.ean);
      const cant = leerNumero(f.v.cantidad);
      const precio = f.v.precio ? leerNumero(f.v.precio) : null;
      if (!a) errores.push(`Fila ${f.fila}: no existe el artículo ${f.v.ean || "(vacío)"}.`);
      else if ((a.inventariable ?? 1) === 0) errores.push(`Fila ${f.fila}: el artículo ${f.v.ean} no es inventariable.`);
      else if (vistos.has(f.v.ean)) errores.push(`Fila ${f.fila}: el artículo ${f.v.ean} está repetido en la orden.`);
      vistos.add(f.v.ean);
      if (cant === null || cant <= 0) errores.push(`Fila ${f.fila}: la cantidad debe ser mayor que cero.`);
      if (f.v.precio && (precio === null || precio < 0)) errores.push(`Fila ${f.fila}: el precio no es válido.`);
      lineas.push({ fila: f.fila, ean: f.v.ean, articulo: a?.descripcion ?? "", cantidad: cant ?? 0, precio });
    }
    if (lineas.length > MAX_LINEAS_ORDEN) errores.push(`La orden tiene ${lineas.length} líneas: el máximo es ${MAX_LINEAS_ORDEN}.`);
    ordenes.push({ clave, nit: p.nit, bodega: p.bodega, esperada, observaciones: fs.map((f) => f.v.observaciones).find(Boolean) ?? null, lineas, errores: [...new Set(errores)] });
  }
  return { ordenes, filas: filas.length, ignoradas };
}

/** Crea las órdenes sin errores (cada una en su transacción). Devuelve el número asignado a cada una de la planilla. */
export async function importarOrdenes(db: Db, a: AnalisisOrdenes, usuario: string) {
  const creadas: { clave: string; numero: number; lineas: number }[] = [];
  const omitidas: { clave: string; motivo: string }[] = [];
  for (const o of a.ordenes) {
    if (o.errores.length > 0) { omitidas.push({ clave: o.clave, motivo: o.errores[0] }); continue; }
    try {
      const numero = await crearOrden(db, { orden: 0, bodega: o.bodega, nit: o.nit, esperada: o.esperada, observaciones: o.observaciones ? `${o.observaciones} (planilla: ${o.clave})` : `Planilla: ${o.clave}`, lineas: o.lineas.map((l) => ({ ean: l.ean, cantidad: l.cantidad, precio: l.precio })) }, usuario);
      creadas.push({ clave: o.clave, numero, lineas: o.lineas.length });
    } catch (e) {
      if (e instanceof ErrorDeNegocio) omitidas.push({ clave: o.clave, motivo: e.message });
      else throw e;
    }
  }
  return { creadas, omitidas };
}

// ── Lo que usa la recepción ───────────────────────────────────────────────────────────────────────────────────────

/** Descuenta lo recibido de las líneas de la orden (dentro de la transacción de la recepción) y actualiza su estado. */
export async function aplicarRecepcion(tx: Prisma.TransactionClient, numero: number, porArticulo: Map<string, number>, tolerancia: number) {
  const o = await tx.ordenCompra.findUnique({ where: { numordencompra: numero } });
  if (!o) throw new ErrorDeNegocio(`No existe la orden de compra ${numero}.`);
  if (o.estado !== ESTADOS.abierta && o.estado !== ESTADOS.parcial) throw new ErrorDeNegocio(`La orden ${numero} está ${String(o.estado ?? "").toLowerCase()}: no admite más recepciones.`);
  const lineas = await tx.$queryRaw<{ id: number; ean: string; requerido: number; recibido: number }[]>`
    SELECT iddetordcomppra AS id, eanproveedores AS ean, COALESCE(requerido, 0) AS requerido, COALESCE(recibidok, 0) AS recibido FROM t_detalle_orden_compra WHERE nordencompra = ${numero} FOR UPDATE`;
  const porEan = new Map(lineas.map((l) => [l.ean, l]));
  for (const [ean, q] of porArticulo) {
    const l = porEan.get(ean);
    if (!l) throw new ErrorDeNegocio(`El artículo ${ean} no está en la orden ${numero}.`);
    const pendiente = r4(l.requerido - l.recibido);
    const permitido = r4(pendiente * (1 + tolerancia / 100));
    if (q > permitido + 1e-9) throw new ErrorDeNegocio(`El artículo ${ean}: se reciben ${r4(q)} pero a la orden le faltan ${Math.max(pendiente, 0)}${tolerancia > 0 ? ` (tolerancia ${tolerancia}%)` : ""}.`);
    await tx.$executeRaw`
      UPDATE t_detalle_orden_compra SET recibidok = COALESCE(recibidok, 0) + ${q}, cantpendientexrecib = GREATEST(COALESCE(requerido, 0) - COALESCE(recibidok, 0) - ${q}, 0),
             cumplido = CASE WHEN COALESCE(requerido, 0) - COALESCE(recibidok, 0) - ${q} <= 0 THEN 1 ELSE 0 END WHERE iddetordcomppra = ${l.id}`;
  }
  const f = await tx.$queryRaw<{ pendientes: number }[]>`SELECT (COUNT(*) FILTER (WHERE COALESCE(requerido, 0) - COALESCE(recibidok, 0) > 1e-9))::int AS pendientes FROM t_detalle_orden_compra WHERE nordencompra = ${numero}`;
  const completa = (f[0]?.pendientes ?? 0) === 0;
  await tx.ordenCompra.update({ where: { numordencompra: numero }, data: { estado: completa ? ESTADOS.cerrada : ESTADOS.parcial, ...(completa ? { fecharecibe: new Date() } : {}) } });
  return { proveedor: o.proveedor, completa };
}
