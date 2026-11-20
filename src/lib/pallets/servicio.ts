import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";

// Pallets: agrupan cajas de inventario (t_pallets: una fila por pallet y caja). Estado: 0 abierto (admite más cajas), 1 cerrado.
// Reglas del sistema anterior: la caja debe existir y tener ubicación; la primera caja del pallet fija su ubicación y las demás
// se llevan a ella; una caja está en un solo pallet; un pallet cerrado no admite cajas; ubicar el pallet mueve todas sus cajas
// y lo cierra (salvo en RECIBO), y no se puede ubicar en una posición de almacenamiento ocupada.

export type Fila = Record<string, unknown>;
export type Orden = { columna: string; dir: "asc" | "desc" };
export type PedidoConsulta = { texto: string; filtros: Record<string, string>; orden: Orden[]; salto: number; cantidad: number };
export const MAX_CAJAS_PALLET = 500;

const SALDO = Prisma.sql`(p.entradas - p.salidas)`;

function ordenarPor(orden: Orden[], permitidas: Record<string, string>, porDefecto: string) {
  const o = orden[0];
  const expr = o && permitidas[o.columna] ? permitidas[o.columna] : porDefecto;
  return Prisma.raw(`${expr} ${o?.dir === "desc" ? "DESC" : "ASC"} NULLS LAST`);
}

export async function listarPallets(db: Db, q: PedidoConsulta) {
  const cond: Prisma.Sql[] = [];
  if (q.texto) {
    const p = `%${q.texto.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    cond.push(Prisma.sql`(pa.cajapallet::bigint::text ILIKE ${p} OR pa.cajaasociada ILIKE ${p} OR p.ubicacion ILIKE ${p} OR er.producto ILIKE ${p} OR er.lote_orden ILIKE ${p})`);
  }
  const donde = cond.length ? Prisma.sql`WHERE ${Prisma.join(cond, " AND ")}` : Prisma.empty;
  const having: Prisma.Sql[] = [];
  if (q.filtros.estado === "abierto") having.push(Prisma.sql`MAX(COALESCE(pa.estado, 0)) = 0`);
  if (q.filtros.estado === "cerrado") having.push(Prisma.sql`MAX(COALESCE(pa.estado, 0)) > 0`);
  const tener = having.length ? Prisma.sql`HAVING ${Prisma.join(having, " AND ")}` : Prisma.empty;
  const desde = Prisma.sql`FROM t_pallets pa LEFT JOIN t_entradas_ras er ON er.cajano::bigint::text = pa.cajaasociada LEFT JOIN t_pic p ON p.cajap = er.cajano`;
  const orden = ordenarPor(q.orden, { numero: "pa.cajapallet", cajas: "COUNT(DISTINCT pa.cajaasociada)", unidades: "SUM(" + SALDO.sql + ")", fecha: "MIN(pa.fechacrea)", ubicacion: "MIN(p.ubicacion)" }, "pa.cajapallet");
  const [filas, total] = await Promise.all([
    db.$queryRaw<Fila[]>`
      SELECT pa.cajapallet::bigint AS numero, COUNT(DISTINCT pa.cajaasociada)::int AS cajas, COALESCE(SUM(${SALDO}), 0) AS unidades,
             MIN(p.ubicacion) AS ubicacion, COUNT(DISTINCT p.ubicacion)::int AS ubicaciones, MAX(COALESCE(pa.estado, 0))::int AS estado, MIN(pa.fechacrea) AS fecha
      ${desde} ${donde} GROUP BY pa.cajapallet ${tener} ORDER BY ${orden}, pa.cajapallet DESC LIMIT ${q.cantidad} OFFSET ${q.salto}`,
    db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM (SELECT pa.cajapallet ${desde} ${donde} GROUP BY pa.cajapallet ${tener}) x`,
  ]);
  return { filas, total: total[0]?.n ?? 0 };
}

export async function siguienteNumero(db: Db) {
  const f = await db.$queryRaw<{ n: Prisma.Decimal | null }[]>`SELECT MAX(cajapallet) AS n FROM t_pallets`;
  return Math.floor(Number(f[0]?.n ?? 0)) + 1;
}

export async function detallePallet(db: Db, numero: number) {
  const cajas = await db.$queryRaw<Fila[]>`
    SELECT pa.cajaasociada AS caja, er.producto AS ean, COALESCE(d.descripcion, er.des_articulo) AS articulo, er.lote_orden AS lote, l.fechavence AS vence,
           COALESCE(${SALDO}, 0) AS saldo, p.ubicacion, p.bodepicking AS bodega, INITCAP(LOWER(er.operadorras)) AS calidad, COALESCE(pa.estado, 0)::int AS estado, pa.fechacrea AS fecha
    FROM t_pallets pa LEFT JOIN t_entradas_ras er ON er.cajano::bigint::text = pa.cajaasociada LEFT JOIN t_pic p ON p.cajap = er.cajano
    LEFT JOIN t_detalle_referencia d ON d.productoean = er.producto LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = er.lote_orden AND l.codean = er.producto
    WHERE pa.cajapallet = ${numero} ORDER BY pa.idpallet`;
  if (cajas.length === 0) return null;
  const ubicaciones = [...new Set(cajas.map((c) => String(c.ubicacion ?? "")).filter(Boolean))];
  const unidades = cajas.reduce((s, c) => s + Number(c.saldo ?? 0), 0);
  const abierto = cajas.every((c) => Number(c.estado) === 0);
  return { numero, cajas, unidades, ubicaciones, abierto };
}

async function movimiento(tx: Prisma.TransactionClient, caja: number, ubicacion: string, inicial: string | null, saldo: number, ean: string | null, lote: string | null, bodegaIni: string | null, bodegaFin: string | null, pallet: number, transaccion: string) {
  await tx.$executeRaw`
    INSERT INTO tgg_t_reg_movimientosdecaja (caja, ubicacion, fecha, idempleado, transaccion, ubicacion_inicial, saldo, productoean, loteproveedor, bodega_inicial, bodega_final, pallet)
    VALUES (${caja}, ${ubicacion}, now(), 0, ${transaccion}, ${inicial}, ${saldo}, ${ean}, ${lote}, ${bodegaIni}, ${bodegaFin}, ${pallet})`;
}

async function bodegaDe(tx: Prisma.TransactionClient, ubicacion: string) {
  const f = await tx.$queryRaw<{ bodegac: string | null; seleccion: boolean | null }[]>`SELECT bodegac, seleccion FROM t_ins_coordenadas WHERE ubicacion = ${ubicacion}`;
  return f[0] ?? null;
}

/** Agrega una caja al pallet (lo crea si es la primera). Devuelve cuántas cajas tiene ahora. */
export async function agregarCaja(db: Db, pallet: number, caja: number) {
  if (!Number.isInteger(pallet) || pallet <= 0) throw new ErrorDeNegocio("El número de pallet debe ser un entero mayor que cero.");
  if (!Number.isInteger(caja) || caja <= 0) throw new ErrorDeNegocio("El número de caja debe ser un entero mayor que cero.");
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${pallet})`;
    const c = await tx.$queryRaw<{ ean: string; lote: string; bodega: string; ubicacion: string | null; saldo: Prisma.Decimal }[]>`
      SELECT p.cod_producto AS ean, p.lote, p.bodepicking AS bodega, p.ubicacion, (p.entradas - p.salidas) AS saldo FROM t_pic p WHERE p.cajap = ${caja} FOR UPDATE`;
    const existe = await tx.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_entradas_ras WHERE cajano = ${caja}`;
    if ((existe[0]?.n ?? 0) === 0) throw new ErrorDeNegocio(`No existe la caja ${caja}.`);
    const cx = c[0];
    if (!cx || !cx.ubicacion) throw new ErrorDeNegocio(`La caja ${caja} no está ubicada en la bodega: ubícala antes de ponerla en un pallet.`);
    if (Number(cx.saldo) <= 0) throw new ErrorDeNegocio(`La caja ${caja} no tiene saldo.`);

    const otro = await tx.$queryRaw<{ cajapallet: number; estado: number | null }[]>`SELECT cajapallet::bigint::float AS cajapallet, estado FROM t_pallets WHERE cajaasociada = ${String(caja)} LIMIT 1`;
    if (otro[0]) {
      if (Number(otro[0].cajapallet) === pallet) throw new ErrorDeNegocio(`La caja ${caja} ya está en el pallet ${pallet}.`);
      throw new ErrorDeNegocio(`La caja ${caja} ya está en el pallet ${otro[0].cajapallet}: sácala de ese pallet primero.`);
    }
    const actuales = await tx.$queryRaw<{ n: number; cerrado: number; ubicacion: string | null }[]>`
      SELECT COUNT(*)::int AS n, (COUNT(*) FILTER (WHERE COALESCE(pa.estado, 0) > 0))::int AS cerrado, MIN(p.ubicacion) AS ubicacion
      FROM t_pallets pa LEFT JOIN t_pic p ON p.cajap::bigint::text = pa.cajaasociada WHERE pa.cajapallet = ${pallet}`;
    const a = actuales[0] ?? { n: 0, cerrado: 0, ubicacion: null };
    if (a.cerrado > 0) throw new ErrorDeNegocio(`El pallet ${pallet} está cerrado: ábrelo para agregarle cajas.`);
    if (a.n >= MAX_CAJAS_PALLET) throw new ErrorDeNegocio(`Un pallet admite hasta ${MAX_CAJAS_PALLET} cajas.`);

    await tx.$executeRaw`INSERT INTO t_pallets (cajapallet, cajaasociada, estado, fechacrea) VALUES (${pallet}, ${String(caja)}, 0, now())`;
    // La caja se lleva a la ubicación del pallet (la de su primera caja).
    const destino = a.n > 0 && a.ubicacion ? a.ubicacion : cx.ubicacion;
    if (destino !== cx.ubicacion) {
      const b = await bodegaDe(tx, destino);
      await tx.$executeRaw`UPDATE t_pic SET ubicacion = ${destino}, bodepicking = COALESCE(${b?.bodegac ?? null}, bodepicking) WHERE cajap = ${caja}`;
      await movimiento(tx, caja, destino, cx.ubicacion, Number(cx.saldo), cx.ean, cx.lote, cx.bodega, b?.bodegac ?? cx.bodega, pallet, "UBICA CAJA EN PALLET");
    } else {
      await movimiento(tx, caja, destino, cx.ubicacion, Number(cx.saldo), cx.ean, cx.lote, cx.bodega, cx.bodega, pallet, "UBICA CAJA EN PALLET");
    }
    return { cajas: a.n + 1, ubicacion: destino };
  });
}

export async function quitarCaja(db: Db, pallet: number, caja: number) {
  return db.$transaction(async (tx) => {
    const f = await tx.$queryRaw<{ estado: number | null }[]>`SELECT estado FROM t_pallets WHERE cajapallet = ${pallet} AND cajaasociada = ${String(caja)} FOR UPDATE`;
    if (!f[0]) throw new ErrorDeNegocio(`La caja ${caja} no está en el pallet ${pallet}.`);
    if ((f[0].estado ?? 0) > 0) throw new ErrorDeNegocio(`El pallet ${pallet} está cerrado: ábrelo para sacarle cajas.`);
    await tx.$executeRaw`DELETE FROM t_pallets WHERE cajapallet = ${pallet} AND cajaasociada = ${String(caja)}`;
  });
}

export async function cambiarEstado(db: Db, pallet: number, abrir: boolean) {
  const n = await db.$executeRaw`UPDATE t_pallets SET estado = ${abrir ? 0 : 1} WHERE cajapallet = ${pallet}`;
  if (n === 0) throw new ErrorDeNegocio(`No existe el pallet ${pallet}.`);
}

/** Elimina el pallet (no las cajas, que siguen donde están). Solo si está abierto. */
export async function eliminarPallet(db: Db, pallet: number) {
  const f = await db.$queryRaw<{ cerrado: number; n: number }[]>`SELECT (COUNT(*) FILTER (WHERE COALESCE(estado, 0) > 0))::int AS cerrado, COUNT(*)::int AS n FROM t_pallets WHERE cajapallet = ${pallet}`;
  if (!f[0] || f[0].n === 0) throw new ErrorDeNegocio(`No existe el pallet ${pallet}.`);
  if (f[0].cerrado > 0) throw new ErrorDeNegocio(`El pallet ${pallet} está cerrado: ábrelo para eliminarlo.`);
  await db.$executeRaw`DELETE FROM t_pallets WHERE cajapallet = ${pallet}`;
  return f[0].n;
}

/** Lleva todas las cajas del pallet a una ubicación y lo cierra (salvo en RECIBO). */
export async function ubicarPallet(db: Db, pallet: number, ubicacion: string) {
  const ub = ubicacion.trim();
  if (!ub) throw new ErrorDeNegocio("Escribe la ubicación de destino.");
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${pallet})`;
    const u = await bodegaDe(tx, ub);
    if (!u?.bodegac) throw new ErrorDeNegocio(`La ubicación «${ub}» no existe.`);
    if (u.seleccion) throw new ErrorDeNegocio(`La ubicación «${ub}» está bloqueada.`);
    const cajas = await tx.$queryRaw<{ caja: number; ean: string; lote: string; bodega: string; ubicacion: string | null; saldo: Prisma.Decimal }[]>`
      SELECT p.cajap AS caja, p.cod_producto AS ean, p.lote, p.bodepicking AS bodega, p.ubicacion, (p.entradas - p.salidas) AS saldo
      FROM t_pallets pa JOIN t_pic p ON p.cajap::bigint::text = pa.cajaasociada WHERE pa.cajapallet = ${pallet} FOR UPDATE OF p`;
    if (cajas.length === 0) throw new ErrorDeNegocio(`No existe el pallet ${pallet}.`);
    // Posición de almacenamiento (piso mayor a 1 y de rotación 1) ocupada por cajas de otro pallet: no se mezcla.
    const ocupada = await tx.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM t_pic p JOIN t_ins_coordenadas c ON c.ubicacion = p.ubicacion
      WHERE p.ubicacion = ${ub} AND c.piso > '1' AND c.prioridadrotacion = '1' AND (p.entradas - p.salidas) > 0
        AND p.cajap::bigint::text NOT IN (SELECT cajaasociada FROM t_pallets WHERE cajapallet = ${pallet})`;
    if ((ocupada[0]?.n ?? 0) > 0) throw new ErrorDeNegocio(`La posición de almacenamiento «${ub}» está ocupada.`);
    for (const c of cajas) await movimiento(tx, Number(c.caja), ub, c.ubicacion, Number(c.saldo), c.ean, c.lote, c.bodega, u.bodegac, pallet, "UBICA PALLET");
    await tx.$executeRaw`UPDATE t_pic p SET ubicacion = ${ub}, bodepicking = ${u.bodegac} FROM t_pallets pa WHERE pa.cajapallet = ${pallet} AND p.cajap::bigint::text = pa.cajaasociada`;
    if (!ub.toUpperCase().startsWith("RECIBO")) await tx.$executeRaw`UPDATE t_pallets SET estado = 1 WHERE cajapallet = ${pallet}`;
    return { cajas: cajas.length, bodega: u.bodegac };
  });
}
