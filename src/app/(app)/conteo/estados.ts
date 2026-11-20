import type { Tono } from "@/components/ui";

export const textoEstado = (estado: unknown) => (Number(estado) === 100 ? "Aplicado" : "Abierto");
export const tonoEstado = (estado: unknown): Tono => (Number(estado) === 100 ? "exito" : "aviso");
export const textoTipo = (tipo: unknown) => (Number(tipo) === 2 ? "Reconteo" : "Conteo");
