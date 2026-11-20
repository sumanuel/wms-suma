"use server";

import type { EstadoForm } from "@/lib/formularios";
import { eliminarMaestro, guardarMaestro } from "@/lib/maestros/nucleo";

// Acciones del servidor de todos los maestros: reciben el id del maestro y buscan su definición en el registro.
export async function guardarRegistro(id: string, clave: string | null, previo: EstadoForm, form: FormData): Promise<EstadoForm> {
  return guardarMaestro(id, clave, previo, form);
}

export async function eliminarRegistro(id: string, clave: string): Promise<{ error?: string }> {
  return eliminarMaestro(id, clave);
}
