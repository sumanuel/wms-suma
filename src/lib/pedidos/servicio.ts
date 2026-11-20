import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { CONDICION_PICKEABLE, DESDE_PICKEABLES, LIBRE } from "@/lib/picking/pickeables";
import { ESTADO, TRANSICIONES, esEditable } from "./estados";

export type Fila = Record<string, unknown>;
export type Orden = { columna: string; dir: "asc" | "desc" };
export type PedidoConsulta = { texto: string; filtros: Record<string, string>; orden: Orden[]; salto: number; cantidad: number };

const redondear = (n: number) => Math.round(n * 100) / 100;

function ordenarPor(orden: Orden[], permitidas: Record<string, string>, porDefecto: string) {
  const o = orden[0];
  const expr = o && permitidas[o.columna] ? permitidas[o.columna] : porDefecto;
  return Prisma.raw(`${expr} ${o?.dir === "desc" ? "DESC" : "ASC"} NULLS LAST`);
}

// ── Existencias disponibles ───────────────────────────────────────────────────────────────────────────────────────

/**
 * Unidades que se pueden comprometer de un artículo en una bodega: las cajas pickeables (ver lib/picking/pickeables.ts).
 * (La función del original, ufn_T_Narth_Serie_Pedido_ObtenerExistencias, no está en los scripts entregados.)
 */
export async function disponiblePorArticulo(db: Db, pares: { ean: string; bodega: string }[]) {
  if (pares.length === 0) return new Map<string, number>();
  const eans = [...new Set(pares.map((p) => p.ean))];
  const filas = await db.$queryRaw<{ ean: string; bodega: string; disponible: Prisma.Decimal | null }[]>`
    SELECT p.cod_producto AS ean, c.bodegac AS bodega, SUM(${LIBRE}) AS disponible
    FROM ${DESDE_PICKEABLES}
    WHERE p.cod_producto IN (${Prisma.join(eans)}) AND ${CONDICION_PICKEABLE}
    GROUP BY p.cod_producto, c.bodegac`;
  return new Map(filas.map((f) => [`${f.ean}|${f.bodega}`, Number(f.disponible ?? 0)]));
}

// ── Consultas ─────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listarPedidos(db: Db, q: PedidoConsulta) {
  const cond: Prisma.Sql[] = [];
  if (q.texto) {
    const p = `%${q.texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    cond.push(Prisma.sql`(e.npedido ILIKE ${p} OR c.nombrecliente ILIKE ${p} OR e.cliente ILIKE ${p} OR s.nombrecliente ILIKE ${p} OR e.ocompra ILIKE ${p})`);
  }
  if (q.filtros.estado) cond.push(Prisma.sql`COALESCE(e.busca_aprobacion, 0) = ${Number(q.filtros.estado)}`);
  if (q.filtros.vence === "vencidos") cond.push(Prisma.sql`e.fechavence < now() AND COALESCE(e.busca_aprobacion, 0) NOT IN (3)`);
  if (q.filtros.pendiente === "si") cond.push(Prisma.sql`COALESCE(l.pendiente, 0) > 0`);
  const donde = cond.length ? Prisma.sql`WHERE ${Prisma.join(cond, " AND ")}` : Prisma.empty;
  const desde = Prisma.sql`FROM t_narth_encabezado_pedido e
    LEFT JOIN t_clientes c ON c.nit = e.cliente
    LEFT JOIN t_clientes_direcciones s ON s.item = e.nitvble
    LEFT JOIN (
      SELECT numpedido, COUNT(*)::int AS lineas, SUM(COALESCE(pares, 0)) AS pedido, SUM(COALESCE(udsentreg, 0)) AS entregado,
             SUM(COALESCE(reserva, 0)) AS reservado, SUM(COALESCE(pares, 0) - COALESCE(udsentreg, 0)) AS pendiente
      FROM t_narth_serie_pedido GROUP BY numpedido
    ) l ON l.numpedido = e.npedido`;
  const orden = ordenarPor(
    q.orden,
    { numero: "e.npedido", fecha: "e.fechapedido", vence: "e.fechavence", cliente: "c.nombrecliente", estado: "COALESCE(e.busca_aprobacion, 0)", lineas: "l.lineas", pedido: "l.pedido", pendiente: "l.pendiente" },
    "e.fechapedido",
  );
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT e.npedido AS numero, e.fechapedido AS fecha, e.fechavence AS vence, e.cliente AS nit, c.nombrecliente AS cliente,
             s.nombrecliente AS sede, COALESCE(e.busca_aprobacion, 0) AS estado, e.ocompra,
             COALESCE(l.lineas, 0) AS lineas, COALESCE(l.pedido, 0) AS pedido, COALESCE(l.entregado, 0) AS entregado,
             COALESCE(l.reservado, 0) AS reservado, COALESCE(l.pendiente, 0) AS pendiente
      ${desde} ${donde} ORDER BY ${orden}, e.npedido DESC LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n ${desde} ${donde}`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

export async function pedidoCompleto(db: Db, numero: string) {
  const e = await db.narthEncabezadoPedido.findUnique({ where: { npedido: numero } });
  if (!e) return null;
  const [cliente, sede, lineas] = await Promise.all([
    e.cliente ? db.clientes.findUnique({ where: { nit: e.cliente }, select: { nit: true, nombrecliente: true } }) : null,
    e.nitvble != null ? db.clientesDirecciones.findUnique({ where: { item: e.nitvble }, select: { item: true, nombrecliente: true, direccion: true, ciudad: true, telefono: true } }) : null,
    db.narthSeriePedido.findMany({ where: { numpedido: numero }, orderBy: { contador: "asc" } }),
  ]);
  const nombres = await db.detalleReferencia.findMany({ where: { productoean: { in: lineas.map((l) => l.ref ?? "") } }, select: { productoean: true, descripcion: true, um1: true } });
  const porEan = new Map(nombres.map((n) => [n.productoean, n]));
  const disp = await disponiblePorArticulo(db, lineas.filter((l) => l.ref && l.bodega).map((l) => ({ ean: l.ref!, bodega: l.bodega! })));
  return {
    encabezado: e,
    cliente,
    sede,
    lineas: lineas.map((l) => ({
      ...l,
      descripcion: porEan.get(l.ref ?? "")?.descripcion ?? null,
      unidad: porEan.get(l.ref ?? "")?.um1 ?? null,
      disponible: disp.get(`${l.ref}|${l.bodega}`) ?? 0,
    })),
  };
}

// ── Crear y editar ────────────────────────────────────────────────────────────────────────────────────────────────

async function siguienteAuto(tx: Prisma.TransactionClient) {
  await tx.$executeRaw`LOCK TABLE t_narth_encabezado_pedido IN EXCLUSIVE MODE`;
  const m = await tx.narthEncabezadoPedido.aggregate({ _max: { autonped: true } });
  return (m._max.autonped ?? 0) + 1;
}

export type DatosPedido = {
  npedido?: string | null;
  sede: number;
  fechapedido: Date | null;
  fechavence: Date | null;
  ocompra: string | null;
  tipoventa: string | null;
  prioridad: number | null;
  direcciondeenvio: string | null;
  personasolicitapedido: string | null;
  requisitos: string | null;
  registradopor: string;
};

async function sedeConCliente(db: Db | Prisma.TransactionClient, item: number) {
  const s = await db.clientesDirecciones.findUnique({ where: { item }, select: { item: true, nit: true } });
  if (!s || !s.nit) throw new ErrorDeNegocio("La sede elegida no existe o no tiene cliente.");
  return s;
}

export async function crearPedido(db: Db, d: DatosPedido) {
  return db.$transaction(async (tx) => {
    const sede = await sedeConCliente(tx, d.sede);
    const auto = await siguienteAuto(tx);
    const numero = d.npedido?.trim() || `PED-${String(auto).padStart(6, "0")}`;
    if (await tx.narthEncabezadoPedido.findUnique({ where: { npedido: numero } })) throw new ErrorDeNegocio(`Ya existe el pedido ${numero}.`);
    await tx.narthEncabezadoPedido.create({
      data: {
        autonped: auto, npedido: numero, cliente: sede.nit, nitvble: sede.item, fechapedido: d.fechapedido ?? new Date(), fechavence: d.fechavence,
        ocompra: d.ocompra, tipoventa: d.tipoventa, prioridad: d.prioridad, direcciondeenvio: d.direcciondeenvio,
        personasolicitapedido: d.personasolicitapedido, requisitos: d.requisitos, registradopor: d.registradopor.slice(0, 50), busca_aprobacion: ESTADO.EN_ELABORACION,
      },
    });
    return numero;
  });
}

async function exigirEditable(tx: Prisma.TransactionClient, numero: string) {
  const e = await tx.narthEncabezadoPedido.findUnique({ where: { npedido: numero } });
  if (!e) throw new ErrorDeNegocio("El pedido ya no existe.");
  if (!esEditable(e.busca_aprobacion)) throw new ErrorDeNegocio("El pedido ya no se puede modificar: está aprobado, congelado o despachado.");
  return e;
}

export async function actualizarCabecera(db: Db, numero: string, d: Omit<DatosPedido, "npedido" | "registradopor">) {
  return db.$transaction(async (tx) => {
    const antes = await exigirEditable(tx, numero);
    const sede = await sedeConCliente(tx, d.sede);
    await tx.narthEncabezadoPedido.update({
      where: { npedido: numero },
      data: {
        cliente: sede.nit, nitvble: sede.item, fechapedido: d.fechapedido, fechavence: d.fechavence, ocompra: d.ocompra, tipoventa: d.tipoventa,
        prioridad: d.prioridad, direcciondeenvio: d.direcciondeenvio, personasolicitapedido: d.personasolicitapedido, requisitos: d.requisitos,
      },
    });
    return antes;
  });
}

export async function eliminarPedido(db: Db, numero: string) {
  return db.$transaction(async (tx) => {
    const e = await tx.narthEncabezadoPedido.findUnique({ where: { npedido: numero } });
    if (!e) return false;
    if (Number(e.busca_aprobacion ?? 0) !== ESTADO.EN_ELABORACION && Number(e.busca_aprobacion ?? 0) !== 0) {
      throw new ErrorDeNegocio("Solo se elimina un pedido que sigue en elaboración. Si ya no se necesita, congélalo.");
    }
    if (Number(e.idpicking ?? 0) > 0) throw new ErrorDeNegocio("El pedido ya tiene un picking asignado.");
    if ((e.despachado ?? 0) > 0) throw new ErrorDeNegocio("El pedido ya tiene despachos.");
    const entregadas = await tx.narthSeriePedido.count({ where: { numpedido: numero, udsentreg: { gt: 0 } } });
    if (entregadas > 0) throw new ErrorDeNegocio("El pedido ya tiene unidades entregadas.");
    await tx.narthSeriePedido.deleteMany({ where: { numpedido: numero } });
    await tx.narthEncabezadoPedido.delete({ where: { npedido: numero } });
    return true;
  });
}

// ── Líneas ────────────────────────────────────────────────────────────────────────────────────────────────────────

export type DatosLinea = { ean: string; bodega: string; cantidad: number; precio: number; observaciones: string | null };

export async function agregarLinea(db: Db, numero: string, l: DatosLinea) {
  return db.$transaction(async (tx) => {
    await exigirEditable(tx, numero);
    const art = await tx.detalleReferencia.findUnique({ where: { productoean: l.ean }, select: { productoean: true, inventariable: true } });
    if (!art) throw new ErrorDeNegocio("No existe un artículo con ese código de barras.");
    if (!(await tx.insBodega.findUnique({ where: { bodega: l.bodega }, select: { bodega: true } }))) throw new ErrorDeNegocio("No existe esa bodega.");
    if (await tx.narthSeriePedido.findFirst({ where: { numpedido: numero, ref: l.ean, bodega: l.bodega } })) {
      throw new ErrorDeNegocio("Ese artículo ya está en el pedido para esa bodega: edita su cantidad.");
    }
    const creada = await tx.narthSeriePedido.create({
      data: { numpedido: numero, ref: l.ean, bodega: l.bodega, pares: l.cantidad, precio_unitario: l.precio, observaciones: l.observaciones, f_ing_orden: new Date(), udsentreg: 0, reserva: 0, ordenpdn: 0 },
    });
    return creada.contador;
  });
}

export async function guardarLineas(db: Db, numero: string, cambios: { contador: number; cantidad: number; precio: number }[]) {
  return db.$transaction(async (tx) => {
    await exigirEditable(tx, numero);
    let n = 0;
    for (const c of cambios) {
      const l = await tx.narthSeriePedido.findFirst({ where: { contador: c.contador, numpedido: numero } });
      if (!l) continue;
      if (c.cantidad < (l.udsentreg ?? 0)) throw new ErrorDeNegocio(`La línea ${l.ref} ya tiene ${l.udsentreg} entregadas: la cantidad no puede ser menor.`);
      if (l.pares === c.cantidad && l.precio_unitario === c.precio) continue;
      // Cambiar la cantidad invalida la reserva calculada: se vuelve a reservar.
      await tx.narthSeriePedido.update({ where: { contador: l.contador }, data: { pares: c.cantidad, precio_unitario: c.precio, reserva: Math.min(l.reserva ?? 0, c.cantidad) } });
      n++;
    }
    return n;
  });
}

export async function quitarLinea(db: Db, numero: string, contador: number) {
  return db.$transaction(async (tx) => {
    await exigirEditable(tx, numero);
    const l = await tx.narthSeriePedido.findFirst({ where: { contador, numpedido: numero } });
    if (!l) return null;
    if ((l.udsentreg ?? 0) > 0) throw new ErrorDeNegocio("La línea ya tiene unidades entregadas.");
    await tx.narthSeriePedido.delete({ where: { contador } });
    return l;
  });
}

// ── Estado y reserva ──────────────────────────────────────────────────────────────────────────────────────────────

export async function cambiarEstado(db: Db, numero: string, nuevo: number, persona: string) {
  return db.$transaction(async (tx) => {
    const e = await tx.narthEncabezadoPedido.findUnique({ where: { npedido: numero } });
    if (!e) throw new ErrorDeNegocio("El pedido ya no existe.");
    const actual = Number(e.busca_aprobacion ?? 0);
    const t = (TRANSICIONES[actual] ?? []).find((x) => x.a === nuevo);
    if (!t) throw new ErrorDeNegocio("Ese cambio de estado no está permitido desde el estado actual.");
    if (actual === ESTADO.APROBADO && Number(e.idpicking ?? 0) > 0) throw new ErrorDeNegocio("El pedido ya tiene un picking asignado: no se puede devolver.");
    if (nuevo === ESTADO.APROBADO) {
      const lineas = await tx.narthSeriePedido.findMany({ where: { numpedido: numero } });
      if (lineas.length === 0) throw new ErrorDeNegocio("El pedido no tiene líneas.");
      if (lineas.some((l) => !((l.pares ?? 0) > 0))) throw new ErrorDeNegocio("Hay líneas sin cantidad: corrígelas o quítalas antes de aprobar.");
      if (!e.nitvble) throw new ErrorDeNegocio("El pedido no tiene sede de entrega.");
    }
    await tx.narthEncabezadoPedido.update({
      where: { npedido: numero },
      data: {
        busca_aprobacion: nuevo,
        // Como en el original: al aprobar queda quién y cuándo; al salir de aprobado se limpia.
        personaapruebapedido: nuevo === ESTADO.APROBADO ? persona.slice(0, 50) : null,
        fecha_cartera: nuevo === ESTADO.APROBADO ? new Date() : null,
      },
    });
    return { anterior: actual, nuevo };
  });
}

/** Reserva en cada línea lo que se puede cumplir hoy: el menor entre lo pendiente y lo disponible (aprobado y vigente). */
export async function reservarExistencias(db: Db, numero: string) {
  return db.$transaction(async (tx) => {
    await exigirEditableOAprobado(tx, numero);
    const lineas = await tx.narthSeriePedido.findMany({ where: { numpedido: numero } });
    const disp = await disponiblePorArticulo(tx as unknown as Db, lineas.filter((l) => l.ref && l.bodega).map((l) => ({ ean: l.ref!, bodega: l.bodega! })));
    let total = 0;
    for (const l of lineas) {
      const pendiente = Math.max((l.pares ?? 0) - (l.udsentreg ?? 0), 0);
      const reserva = redondear(Math.min(pendiente, disp.get(`${l.ref}|${l.bodega}`) ?? 0));
      if (reserva !== (l.reserva ?? 0)) await tx.narthSeriePedido.update({ where: { contador: l.contador }, data: { reserva } });
      total += reserva;
    }
    return { lineas: lineas.length, reservado: redondear(total) };
  });
}

async function exigirEditableOAprobado(tx: Prisma.TransactionClient, numero: string) {
  const e = await tx.narthEncabezadoPedido.findUnique({ where: { npedido: numero } });
  if (!e) throw new ErrorDeNegocio("El pedido ya no existe.");
  if ([1, 3].includes(Number(e.busca_aprobacion ?? 0))) throw new ErrorDeNegocio("No se puede reservar en un pedido congelado o despachado.");
}
