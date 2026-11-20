import type { Tono } from "@/components/ui";
import type { EstadoGuia } from "@/lib/despacho/servicio";

export const ESTADOS_GUIA: Record<EstadoGuia, { texto: string; tono: Tono }> = {
  generada: { texto: "Generada", tono: "aviso" },
  enviada: { texto: "Enviada", tono: "marca" },
  entregada: { texto: "Entregada", tono: "exito" },
  anulada: { texto: "Anulada", tono: "error" },
};

export function estadoDeFila(f: { anulada: unknown; enviado: unknown; entregada: unknown }): EstadoGuia {
  if (Number(f.anulada) === 1) return "anulada";
  if (f.entregada) return "entregada";
  if (f.enviado === true) return "enviada";
  return "generada";
}
