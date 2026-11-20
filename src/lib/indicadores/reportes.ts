import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ESTADOS_PEDIDO } from "@/lib/pedidos/estados";
import type { Rango } from "./rango";

// Reportes de indicadores. Cada uno es una consulta que devuelve filas planas; la misma definición dibuja la tabla en pantalla y
// arma el Excel. Los rangos son de días completos. Salvo los que dicen «foto de hoy», todos respetan el rango de fechas, y los
// que se pueden ubicar en una bodega respetan el filtro de bodega.

export type TipoColumna = "texto" | "numero" | "porcentaje" | "fecha" | "fechaHora" | "hora";
export type Columna = { id: string; titulo: string; tipo: TipoColumna };
export type Fila = Record<string, unknown>;
export type Reporte = {
  id: string;
  grupo: "operacion" | "inventario" | "ajustes";
  titulo: string;
  descripcion: string;
  columnas: Columna[];
  cargar: (db: Db, r: Rango) => Promise<Fila[]>;
  // Gráfico de barras sobre una columna de categoría y una de valor.
  grafico?: { categoria: string; valor: string; unidad?: string };
  fotoDeHoy?: boolean;
};

const col = (id: string, titulo: string, tipo: TipoColumna = "texto"): Columna => ({ id, titulo, tipo });
const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const redondear = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

// Condiciones comunes (se pasan como fragmentos SQL).
export const enRango = (campo: Prisma.Sql, r: Rango) => Prisma.sql`${campo}::date >= ${r.desde}::date AND ${campo}::date <= ${r.hasta}::date`;
export const deBodega = (campo: Prisma.Sql, r: Rango) => (r.bodega ? Prisma.sql`AND ${campo} = ${r.bodega}` : Prisma.empty);

// Cajas con saldo y ubicación (las que de verdad están en la bodega), con su ubicación y su lote.
const STOCK = Prisma.sql`t_pic p
  JOIN t_ins_coordenadas c ON c.ubicacion = p.ubicacion
  LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = p.lote AND l.codean = p.cod_producto
  LEFT JOIN t_detalle_referencia d ON d.productoean = p.cod_producto`;
const CON_SALDO = Prisma.sql`COALESCE(p.ubicacion, '') <> '' AND (p.entradas - p.salidas) > 0`;

export const REPORTES: Reporte[] = [
  // ── Operación ─────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "picking-pickeador", grupo: "operacion", titulo: "Productividad de picking por pickeador",
    descripcion: "Líneas y unidades pickeadas por cada pickeador en el rango, y su ritmo por hora entre su primer y su último registro (solo si trabajó más de 10 minutos en el rango).",
    columnas: [col("pickeador", "Pickeador"), col("pickings", "Pickings", "numero"), col("lineas", "Líneas", "numero"), col("unidades", "Unidades", "numero"), col("primero", "Primer registro", "fechaHora"), col("ultimo", "Último registro", "fechaHora"), col("por_hora", "Líneas por hora", "numero")],
    grafico: { categoria: "pickeador", valor: "lineas", unidad: "líneas" },
    cargar: async (db, r) => {
      const f = await db.$queryRaw<Fila[]>`
        SELECT COALESCE(NULLIF(TRIM(ep.nom_empacador), ''), 'Sin asignar') AS pickeador, COUNT(DISTINCT ep.idmovimiento)::int AS pickings, COUNT(*)::int AS lineas,
               COALESCE(SUM(s.cantidad), 0) AS unidades, MIN(s.fecharegistro) AS primero, MAX(s.fecharegistro) AS ultimo,
               CASE WHEN MAX(s.fecharegistro) >= MIN(s.fecharegistro) + interval '10 minutes' THEN COUNT(*) / (EXTRACT(EPOCH FROM (MAX(s.fecharegistro) - MIN(s.fecharegistro))) / 3600.0) END AS por_hora
        FROM t_ssccxcaja s JOIN t_encabezado_prepack ep ON ep.idmovimiento = s.idprepack
        WHERE ${enRango(Prisma.sql`s.fecharegistro`, r)} ${deBodega(Prisma.sql`ep.bodegapicking`, r)}
        GROUP BY 1 ORDER BY lineas DESC, pickeador`;
      return f.map((x) => ({ ...x, por_hora: x.por_hora === null ? null : redondear(num(x.por_hora)) }));
    },
  },
  {
    id: "picking-hora", grupo: "operacion", titulo: "Líneas pickeadas por hora del día",
    descripcion: "A qué horas se concentra el pickeo en el rango.",
    columnas: [col("hora", "Hora", "hora"), col("lineas", "Líneas", "numero"), col("unidades", "Unidades", "numero")],
    grafico: { categoria: "hora", valor: "lineas", unidad: "líneas" },
    cargar: (db, r) => db.$queryRaw<Fila[]>`
      SELECT EXTRACT(HOUR FROM s.fecharegistro)::int AS hora, COUNT(*)::int AS lineas, COALESCE(SUM(s.cantidad), 0) AS unidades
      FROM t_ssccxcaja s JOIN t_encabezado_prepack ep ON ep.idmovimiento = s.idprepack
      WHERE ${enRango(Prisma.sql`s.fecharegistro`, r)} ${deBodega(Prisma.sql`ep.bodegapicking`, r)} GROUP BY 1 ORDER BY 1`,
  },
  {
    id: "aduana-dia", grupo: "operacion", titulo: "Productividad de aduana por día",
    descripcion: "Cajas armadas y unidades empacadas en la aduana cada día.",
    columnas: [col("dia", "Día", "fecha"), col("pickings", "Pickings", "numero"), col("cajas", "Cajas", "numero"), col("unidades", "Unidades", "numero"), col("kilos", "Peso", "numero")],
    grafico: { categoria: "dia", valor: "cajas", unidad: "cajas" },
    cargar: (db, r) => db.$queryRaw<Fila[]>`
      SELECT a.fecharegistro::date AS dia, COUNT(DISTINCT a.numpicking)::int AS pickings, COUNT(DISTINCT (a.numpicking, a.numdecaja))::int AS cajas,
             COALESCE(SUM(a.cantidad), 0) AS unidades, COALESCE(SUM(a.pesoempacado), 0) AS kilos
      FROM t_aduana_wms_pos a LEFT JOIN t_encabezado_prepack ep ON ep.idmovimiento = a.numpicking
      WHERE ${enRango(Prisma.sql`a.fecharegistro`, r)} ${deBodega(Prisma.sql`ep.bodegapicking`, r)} GROUP BY 1 ORDER BY 1`,
  },
  {
    id: "despachos-dia", grupo: "operacion", titulo: "Despachos por día y cumplimiento",
    descripcion: "Guías generadas por día, con cuántas salieron a tiempo (hasta la fecha de vencimiento del pedido) y cuántas tarde. No cuenta las guías anuladas.",
    columnas: [col("dia", "Día", "fecha"), col("guias", "Guías", "numero"), col("unidades", "Unidades", "numero"), col("kilos", "Peso", "numero"), col("valor", "Valor mercancía", "numero"), col("a_tiempo", "A tiempo", "numero"), col("tarde", "Tarde", "numero"), col("cumplimiento", "Cumplimiento", "porcentaje")],
    grafico: { categoria: "dia", valor: "guias", unidad: "guías" },
    cargar: async (db, r) => {
      const f = await db.$queryRaw<Fila[]>`
        SELECT g.fecha_despacho::date AS dia, COUNT(*)::int AS guias, COALESCE(SUM(g.unidades), 0) AS unidades, COALESCE(SUM(g.kilos), 0) AS kilos, COALESCE(SUM(g.valor_mercancia), 0) AS valor,
               (COUNT(*) FILTER (WHERE ne.fechavence IS NOT NULL AND g.fecha_despacho::date <= ne.fechavence::date))::int AS a_tiempo,
               (COUNT(*) FILTER (WHERE ne.fechavence IS NOT NULL AND g.fecha_despacho::date > ne.fechavence::date))::int AS tarde
        FROM t_guias_generadas g LEFT JOIN t_narth_encabezado_pedido ne ON ne.npedido = g.pedido LEFT JOIN t_encabezado_prepack ep ON ep.idmovimiento = g.prepackingid
        WHERE COALESCE(g.anulada, 0) = 0 AND ${enRango(Prisma.sql`g.fecha_despacho`, r)} ${deBodega(Prisma.sql`ep.bodegapicking`, r)} GROUP BY 1 ORDER BY 1`;
      return f.map((x) => ({ ...x, cumplimiento: num(x.a_tiempo) + num(x.tarde) > 0 ? redondear((num(x.a_tiempo) / (num(x.a_tiempo) + num(x.tarde))) * 100) : null }));
    },
  },
  {
    id: "fill-rate", grupo: "operacion", titulo: "Fill rate por pedido",
    descripcion: "De cada pedido despachado en el rango: cuántas líneas y unidades se entregaron de lo pedido. Un pedido está completo si todas sus líneas se entregaron.",
    columnas: [col("pedido", "Pedido"), col("cliente", "Cliente"), col("despachado", "Último despacho", "fecha"), col("lineas", "Líneas pedidas", "numero"), col("completas", "Líneas completas", "numero"), col("pedidas", "Unidades pedidas", "numero"), col("entregadas", "Unidades entregadas", "numero"), col("fill_rate", "Fill rate", "porcentaje")],
    cargar: async (db, r) => {
      const f = await db.$queryRaw<Fila[]>`
        SELECT ne.npedido AS pedido, c.nombrecliente AS cliente, g.despachado, l.lineas, l.completas, l.pedidas, l.entregadas,
               CASE WHEN l.pedidas > 0 THEN ROUND((LEAST(l.entregadas, l.pedidas) * 100.0 / l.pedidas)::numeric, 1) END AS fill_rate
        FROM (SELECT g.pedido, MAX(g.fecha_despacho)::date AS despachado FROM t_guias_generadas g LEFT JOIN t_encabezado_prepack ep ON ep.idmovimiento = g.prepackingid
              WHERE COALESCE(g.anulada, 0) = 0 AND ${enRango(Prisma.sql`g.fecha_despacho`, r)} ${deBodega(Prisma.sql`ep.bodegapicking`, r)} GROUP BY g.pedido) g
        JOIN t_narth_encabezado_pedido ne ON ne.npedido = g.pedido
        LEFT JOIN t_clientes c ON c.nit = ne.cliente
        JOIN LATERAL (SELECT COUNT(*)::int AS lineas, (COUNT(*) FILTER (WHERE COALESCE(s.udsentreg, 0) >= COALESCE(s.pares, 0)))::int AS completas,
                             COALESCE(SUM(s.pares), 0) AS pedidas, COALESCE(SUM(s.udsentreg), 0) AS entregadas
                      FROM t_narth_serie_pedido s WHERE s.numpedido = ne.npedido) l ON TRUE
        ORDER BY g.despachado DESC, ne.npedido`;
      return f;
    },
  },
  {
    id: "pedidos-estado", grupo: "operacion", titulo: "Pedidos por estado (foto de hoy)",
    descripcion: "Cuántos pedidos hay en cada estado ahora, con las unidades pendientes de entregar.", fotoDeHoy: true,
    columnas: [col("estado", "Estado"), col("pedidos", "Pedidos", "numero"), col("pendiente", "Unidades pendientes", "numero")],
    grafico: { categoria: "estado", valor: "pedidos", unidad: "ped." },
    cargar: async (db) => {
      const f = await db.$queryRaw<{ estado: number; pedidos: number; pendiente: Prisma.Decimal }[]>`
        SELECT COALESCE(e.busca_aprobacion, 0)::int AS estado, COUNT(DISTINCT e.npedido)::int AS pedidos, COALESCE(SUM(GREATEST(COALESCE(s.pares, 0) - COALESCE(s.udsentreg, 0), 0)), 0) AS pendiente
        FROM t_narth_encabezado_pedido e LEFT JOIN t_narth_serie_pedido s ON s.numpedido = e.npedido GROUP BY 1 ORDER BY 1`;
      return f.map((x) => ({ estado: (ESTADOS_PEDIDO as Record<number, { texto: string }>)[x.estado]?.texto ?? `Estado ${x.estado}`, pedidos: x.pedidos, pendiente: Number(x.pendiente) }));
    },
  },
  // ── Inventario ────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "inventario-antiguedad", grupo: "inventario", titulo: "Antigüedad del inventario (foto de hoy)",
    descripcion: "Cuánto tiempo llevan en bodega las cajas con saldo, según la fecha de ingreso de su lote (días de inventario).", fotoDeHoy: true,
    columnas: [col("tramo", "Antigüedad"), col("lotes", "Lotes", "numero"), col("cajas", "Cajas", "numero"), col("unidades", "Unidades", "numero"), col("valor", "Valor al costo", "numero")],
    grafico: { categoria: "tramo", valor: "unidades", unidad: "unidades" },
    cargar: (db, r) => db.$queryRaw<Fila[]>`
      SELECT t.tramo, COUNT(DISTINCT (p.lote, p.cod_producto))::int AS lotes, COUNT(*)::int AS cajas, SUM(p.entradas - p.salidas) AS unidades,
             SUM((p.entradas - p.salidas) * COALESCE(d.costo, 0)) AS valor
      FROM ${STOCK},
      LATERAL (SELECT CASE
          WHEN l.fechaingresa IS NULL THEN '6. Sin fecha de ingreso'
          WHEN l.fechaingresa >= now() - interval '1 month' THEN '1. Hasta 1 mes'
          WHEN l.fechaingresa >= now() - interval '3 months' THEN '2. De 1 a 3 meses'
          WHEN l.fechaingresa >= now() - interval '6 months' THEN '3. De 3 a 6 meses'
          WHEN l.fechaingresa >= now() - interval '12 months' THEN '4. De 6 a 12 meses'
          ELSE '5. Más de 12 meses' END AS tramo) t
      WHERE ${CON_SALDO} ${deBodega(Prisma.sql`c.bodegac`, r)} GROUP BY t.tramo ORDER BY t.tramo`,
  },
  {
    id: "inventario-vencimientos", grupo: "inventario", titulo: "Vencimientos del inventario (foto de hoy)",
    descripcion: "Cajas con saldo según el mes en que vence su lote (solo lotes que controlan vencimiento): lo ya vencido y los próximos 12 meses.", fotoDeHoy: true,
    columnas: [col("periodo", "Vence"), col("lotes", "Lotes", "numero"), col("cajas", "Cajas", "numero"), col("unidades", "Unidades", "numero"), col("valor", "Valor al costo", "numero")],
    grafico: { categoria: "periodo", valor: "unidades", unidad: "unidades" },
    cargar: (db, r) => db.$queryRaw<Fila[]>`
      SELECT t.orden, t.periodo, COUNT(DISTINCT (p.lote, p.cod_producto))::int AS lotes, COUNT(*)::int AS cajas, SUM(p.entradas - p.salidas) AS unidades,
             SUM((p.entradas - p.salidas) * COALESCE(d.costo, 0)) AS valor
      FROM ${STOCK},
      LATERAL (SELECT CASE WHEN l.fechavence < CURRENT_DATE THEN '0000' WHEN l.fechavence >= CURRENT_DATE + interval '12 months' THEN '9999' ELSE to_char(l.fechavence, 'YYYY-MM') END AS orden,
                      CASE WHEN l.fechavence < CURRENT_DATE THEN 'Vencido' WHEN l.fechavence >= CURRENT_DATE + interval '12 months' THEN 'Más de 12 meses' ELSE to_char(l.fechavence, 'YYYY-MM') END AS periodo) t
      WHERE ${CON_SALDO} AND COALESCE(l.confirmacertif, 0) = 0 AND l.fechavence IS NOT NULL ${deBodega(Prisma.sql`c.bodegac`, r)} GROUP BY t.orden, t.periodo ORDER BY t.orden`,
  },
  {
    id: "inventario-ocupacion", grupo: "inventario", titulo: "Ocupación por zona (foto de hoy)",
    descripcion: "Ubicaciones de cada zona de la bodega, cuántas tienen cajas con saldo y cuántas unidades guardan.", fotoDeHoy: true,
    columnas: [col("zona", "Zona"), col("ubicaciones", "Ubicaciones", "numero"), col("ocupadas", "Ocupadas", "numero"), col("libres", "Libres", "numero"), col("ocupacion", "Ocupación", "porcentaje"), col("cajas", "Cajas", "numero"), col("unidades", "Unidades", "numero")],
    grafico: { categoria: "zona", valor: "ocupacion", unidad: "%" },
    cargar: async (db, r) => {
      const f = await db.$queryRaw<Fila[]>`
        SELECT c.zonapiso AS zona, COUNT(*)::int AS ubicaciones, (COUNT(*) FILTER (WHERE COALESCE(e.cajas, 0) > 0))::int AS ocupadas,
               COALESCE(SUM(e.cajas), 0)::int AS cajas, COALESCE(SUM(e.unidades), 0) AS unidades
        FROM t_ins_coordenadas c
        LEFT JOIN (SELECT p.ubicacion, COUNT(*) AS cajas, SUM(p.entradas - p.salidas) AS unidades FROM t_pic p WHERE ${CON_SALDO} GROUP BY p.ubicacion) e ON e.ubicacion = c.ubicacion
        WHERE TRUE ${deBodega(Prisma.sql`c.bodegac`, r)} GROUP BY c.zonapiso ORDER BY c.zonapiso`;
      return f.map((x) => ({ ...x, libres: num(x.ubicaciones) - num(x.ocupadas), ocupacion: num(x.ubicaciones) > 0 ? redondear((num(x.ocupadas) / num(x.ubicaciones)) * 100) : 0 }));
    },
  },
  // ── Calidad y ajustes ─────────────────────────────────────────────────────────────────────────────────────────────
  {
    id: "lotes-calidad", grupo: "ajustes", titulo: "Lotes con existencias por estado de calidad (foto de hoy)",
    descripcion: "Cuántos lotes con saldo hay en cada estado de calidad y cuántas unidades guardan.", fotoDeHoy: true,
    columnas: [col("estado", "Estado de calidad"), col("lotes", "Lotes", "numero"), col("cajas", "Cajas", "numero"), col("unidades", "Unidades", "numero")],
    grafico: { categoria: "estado", valor: "unidades", unidad: "unidades" },
    cargar: (db, r) => db.$queryRaw<Fila[]>`
      SELECT COALESCE(INITCAP(LOWER(er.operadorras)), 'Sin estado') AS estado, COUNT(DISTINCT (p.lote, p.cod_producto))::int AS lotes, COUNT(*)::int AS cajas, SUM(p.entradas - p.salidas) AS unidades
      FROM ${STOCK} LEFT JOIN t_entradas_ras er ON er.cajano = p.cajap
      WHERE ${CON_SALDO} ${deBodega(Prisma.sql`c.bodegac`, r)} GROUP BY 1 ORDER BY unidades DESC`,
  },
  {
    id: "ajustes-motivo", grupo: "ajustes", titulo: "Ajustes de inventario por origen y motivo",
    descripcion: "Todos los ajustes de saldo del rango (manuales, de conteo y de carga inicial), con lo que aumentaron y disminuyeron.",
    columnas: [col("origen", "Origen"), col("motivo", "Motivo"), col("ajustes", "Ajustes", "numero"), col("aumentos", "Aumentos", "numero"), col("disminuciones", "Disminuciones", "numero"), col("neto", "Neto", "numero")],
    cargar: (db, r) => db.$queryRaw<Fila[]>`
      SELECT t.origen, t.motivo, COUNT(*)::int AS ajustes, COALESCE(SUM(a.qtyentrada), 0) AS aumentos, COALESCE(SUM(a.qtysale), 0) AS disminuciones, COALESCE(SUM(a.qtyentrada), 0) - COALESCE(SUM(a.qtysale), 0) AS neto
      FROM t_pic_ajuste a LEFT JOIN t_pic b ON b.cajap = a.caja,
      LATERAL (SELECT CASE WHEN a.motivoajuste LIKE 'Ajuste manual%' THEN 'Manual' WHEN a.motivoajuste LIKE 'Conteo%' THEN 'Conteo' WHEN a.motivoajuste LIKE 'Carga de inventario%' THEN 'Carga inicial' ELSE 'Otro' END AS origen,
                      CASE WHEN a.motivoajuste LIKE 'Ajuste manual · %' THEN TRIM(split_part(split_part(a.motivoajuste, ' · ', 2), ':', 1)) ELSE '—' END AS motivo) t
      WHERE ${enRango(Prisma.sql`a.fecha`, r)} ${deBodega(Prisma.sql`b.bodepicking`, r)} GROUP BY t.origen, t.motivo ORDER BY t.origen, ajustes DESC`,
  },
  {
    id: "conteos-exactitud", grupo: "ajustes", titulo: "Exactitud de los conteos",
    descripcion: "Por cada conteo del rango: cajas contadas, cuántas tuvieron diferencia contra el saldo teórico y el porcentaje de acierto.",
    columnas: [col("conteo", "Conteo"), col("fecha", "Fecha", "fecha"), col("bodega", "Bodega"), col("tipo", "Tipo"), col("estado", "Estado"), col("contadas", "Cajas contadas", "numero"), col("diferencias", "Con diferencia", "numero"), col("exactitud", "Exactitud", "porcentaje")],
    cargar: async (db, r) => {
      const f = await db.$queryRaw<Fila[]>`
        SELECT e.idconteo AS conteo, e.fecha::date AS fecha, e.bodega, CASE WHEN COALESCE(e.tipoconteo, 1) = 2 THEN 'Reconteo' ELSE 'Conteo' END AS tipo,
               CASE WHEN e.estado = 100 THEN 'Aplicado' ELSE 'Abierto' END AS estado,
               (COUNT(*) FILTER (WHERE l.estado = 1))::int AS contadas, (COUNT(*) FILTER (WHERE l.estado = 1 AND l.cantidadcontab <> l.kantidadteo))::int AS diferencias
        FROM t_temporar_encabezado_conteowms e LEFT JOIN t_temporal_conteowms l ON l.idconteo = e.idconteo
        WHERE ${enRango(Prisma.sql`e.fecha`, r)} ${deBodega(Prisma.sql`e.bodega`, r)} GROUP BY e.idconteo ORDER BY e.idconteo DESC`;
      return f.map((x) => ({ ...x, exactitud: num(x.contadas) > 0 ? redondear(((num(x.contadas) - num(x.diferencias)) / num(x.contadas)) * 100) : null }));
    },
  },
];

export function buscarReporte(id: string) {
  return REPORTES.find((x) => x.id === id) ?? null;
}
