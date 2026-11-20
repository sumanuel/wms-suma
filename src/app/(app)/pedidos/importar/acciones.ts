"use server";

import { revalidatePath } from "next/cache";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { analizar, importar, type Analisis, type ResultadoImportacion } from "@/lib/pedidos/importacion";

export type RespuestaImportacion = { error?: string; analisis?: Analisis; resultado?: ResultadoImportacion };

function archivoDe(form: FormData): File | null {
  const a = form.get("archivo");
  return a instanceof File && a.size > 0 ? a : null;
}

/** Lee y valida la planilla sin escribir nada. */
export async function revisarArchivo(form: FormData): Promise<RespuestaImportacion> {
  const { db } = await requerirPermisoAccion("pedidos", "crear");
  const archivo = archivoDe(form);
  if (!archivo) return { error: "Elige una planilla (.xlsx) o un CSV." };
  const analisis = await analizar(db, archivo);
  return analisis.error ? { error: analisis.error, analisis } : { analisis };
}

/** Vuelve a validar (los datos pudieron cambiar) y crea los pedidos sin errores. */
export async function importarArchivo(form: FormData): Promise<RespuestaImportacion> {
  const { db, usuario } = await requerirPermisoAccion("pedidos", "crear");
  const archivo = archivoDe(form);
  if (!archivo) return { error: "Elige una planilla (.xlsx) o un CSV." };
  const analisis = await analizar(db, archivo);
  if (analisis.error) return { error: analisis.error, analisis };
  const resultado = await importar(db, analisis.pedidos, { aprobar: form.get("aprobar") === "on", usuario: usuario.nombre });
  await registrarCambio(db, {
    usuarioId: usuario.id, entidad: "importacion_pedidos", entidadId: archivo.name.slice(0, 80), accion: "crear",
    despues: { archivo: archivo.name, filas: analisis.filas, creados: resultado.creados.length, omitidos: resultado.omitidos.length, aprobados: form.get("aprobar") === "on" },
  });
  revalidatePath("/pedidos");
  return { analisis, resultado };
}
