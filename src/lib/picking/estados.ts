import type { Tono } from "@/components/ui";

// Estado de un picking (t_encabezado_prepack.valida), con los códigos del sistema anterior (enumeración EstadoPedido).
export const ESTADOS_PICKING: Record<number, { texto: string; tono: Tono }> = {
  0: { texto: "Sin iniciar", tono: "neutro" },
  3: { texto: "Listo para picking", tono: "aviso" },
  5: { texto: "Listo para aduana", tono: "marca" },
  7: { texto: "Listo para factura", tono: "marca" },
  1: { texto: "Despachado", tono: "exito" },
};

export function infoEstadoPicking(v: unknown) {
  const n = Number(v ?? 0);
  return ESTADOS_PICKING[n] ?? { texto: `Estado ${n}`, tono: "neutro" as Tono };
}

export const VALIDA_LISTO_PARA_PICKING = 3;
