import type { Tono } from "@/components/ui";

export function tonoEstado(estado: string | null | undefined): Tono {
  const e = (estado ?? "").trim().toLowerCase();
  return e === "aprobado" ? "exito" : e === "cuarentena" ? "aviso" : e === "rechazado" ? "error" : "neutro";
}
