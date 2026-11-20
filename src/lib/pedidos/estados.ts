import type { Tono } from "@/components/ui";

// Estado de un pedido (t_narth_encabezado_pedido.busca_aprobacion). Los códigos son los del sistema anterior
// (enumeración EstadoBuscaAprobacionPedido); el 0 es el valor por defecto de la columna.
export const ESTADOS_PEDIDO = {
  0: { texto: "Sin estado", tono: "neutro" },
  1: { texto: "Congelado", tono: "error" },
  2: { texto: "Liberar espera", tono: "aviso" },
  3: { texto: "Despacho total", tono: "exito" },
  4: { texto: "Despacho parcial", tono: "marca" },
  5: { texto: "En espera", tono: "aviso" },
  6: { texto: "En elaboración", tono: "neutro" },
  7: { texto: "Aprobado", tono: "exito" },
} as const satisfies Record<number, { texto: string; tono: Tono }>;

export type CodigoEstado = keyof typeof ESTADOS_PEDIDO;
export const ESTADO = { CONGELADO: 1, LIBERAR_ESPERA: 2, DESPACHO_TOTAL: 3, DESPACHO_PARCIAL: 4, EN_ESPERA: 5, EN_ELABORACION: 6, APROBADO: 7 } as const;

export function infoEstado(codigo: unknown) {
  return ESTADOS_PEDIDO[(Number(codigo ?? 0) in ESTADOS_PEDIDO ? Number(codigo ?? 0) : 0) as CodigoEstado];
}

// Cambios de estado que una persona puede hacer. Los de despacho (3 y 4) los fija el sistema al despachar, y «Liberar espera»
// es un paso transitorio que el sistema anterior resolvía pasando el pedido a «En espera».
export const TRANSICIONES: Record<number, { a: number; etiqueta: string; descripcion: string }[]> = {
  0: [{ a: 6, etiqueta: "Pasar a en elaboración", descripcion: "El pedido se está armando." }],
  6: [
    { a: 7, etiqueta: "Aprobar", descripcion: "El pedido queda listo para el prepacking." },
    { a: 5, etiqueta: "Dejar en espera", descripcion: "El pedido espera antes de aprobarse." },
    { a: 1, etiqueta: "Congelar", descripcion: "Se detiene el pedido." },
  ],
  5: [
    { a: 7, etiqueta: "Aprobar", descripcion: "El pedido queda listo para el prepacking." },
    { a: 6, etiqueta: "Volver a elaboración", descripcion: "Se puede editar de nuevo." },
    { a: 1, etiqueta: "Congelar", descripcion: "Se detiene el pedido." },
  ],
  1: [{ a: 5, etiqueta: "Liberar a en espera", descripcion: "El pedido deja de estar congelado." }],
  2: [{ a: 5, etiqueta: "Pasar a en espera", descripcion: "El pedido sigue su curso." }],
  7: [
    { a: 5, etiqueta: "Devolver a en espera", descripcion: "Solo si todavía no tiene picking asignado." },
    { a: 1, etiqueta: "Congelar", descripcion: "Se detiene el pedido." },
  ],
};

/** Un pedido se edita (cabecera y líneas) mientras no esté aprobado ni despachado. */
export const esEditable = (codigo: unknown) => [0, 5, 6].includes(Number(codigo ?? 0));
