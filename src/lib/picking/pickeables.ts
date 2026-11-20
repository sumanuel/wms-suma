import "server-only";
import { Prisma } from "@/generated/prisma/client";

// Cajas que se pueden pickear: la misma regla que usaba el sistema anterior (ufn_tbl_T_PIC_mp) y la de «disponible» de los
// pedidos, en un solo lugar:
//  - con ubicación registrada en la bodega (t_ins_coordenadas) y no bloqueada (seleccion),
//  - de lote en estado Aprobado (el estado de calidad queda copiado en la caja),
//  - con saldo libre (saldo menos reservas),
//  - de lote vigente, salvo que el lote no controle vencimiento (confirmacertif ≠ 0).
// Alias disponibles: p = caja (t_pic), c = ubicación, er = entrada de la caja, l = lote.

export const DESDE_PICKEABLES = Prisma.sql`t_pic p
  JOIN t_entradas_ras er ON er.cajano = p.cajap
  JOIN t_ins_coordenadas c ON c.ubicacion = p.ubicacion
  LEFT JOIN t_maestro_lote_pt l ON l.loteproveedor = p.lote AND l.codean = p.cod_producto`;

export const LIBRE = Prisma.sql`(p.entradas - p.salidas - COALESCE(p.reserva, 0))`;

export const CONDICION_PICKEABLE = Prisma.sql`COALESCE(c.seleccion, false) = false
  AND LOWER(COALESCE(er.operadorras, '')) = 'aprobado'
  AND ${LIBRE} > 0
  AND (COALESCE(l.confirmacertif, 0) <> 0 OR l.fechavence IS NULL OR l.fechavence >= now())`;

/** Días que le quedan al lote (10000 si no controla vencimiento): el menor sale primero (FEFO). */
export const VIGENCIA = Prisma.sql`(CASE WHEN COALESCE(l.confirmacertif, 0) = 0 AND l.fechavence IS NOT NULL THEN (l.fechavence::date - CURRENT_DATE) ELSE 10000 END)`;
