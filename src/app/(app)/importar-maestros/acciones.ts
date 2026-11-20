"use server";

import { revalidatePath } from "next/cache";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { buscarImportable } from "@/lib/maestros/importable";
import { analizarMaestro, importarMaestro, type AnalisisMaestro, type Modo, type ResultadoMaestro } from "@/lib/maestros/importacion";

export type RespuestaMaestro = { error?: string; analisis?: AnalisisMaestro; resultado?: ResultadoMaestro };

function leer(form: FormData) {
  const a = form.get("archivo");
  const modo: Modo = form.get("modo") === "actualizar" ? "actualizar" : "crear";
  return { archivo: a instanceof File && a.size > 0 ? a : null, modo };
}

export async function revisarMaestro(id: string, form: FormData): Promise<RespuestaMaestro> {
  const m = buscarImportable(id);
  if (!m) return { error: "Ese maestro no se puede importar." };
  const { archivo, modo } = leer(form);
  const { db } = await requerirPermisoAccion(m.modulo, modo === "actualizar" ? "editar" : "crear");
  if (!archivo) return { error: "Elige una planilla (.xlsx) o un CSV." };
  const analisis = await analizarMaestro(db, m, archivo, modo);
  return analisis.error ? { error: analisis.error, analisis } : { analisis };
}

export async function importarMaestroAccion(id: string, form: FormData): Promise<RespuestaMaestro> {
  const m = buscarImportable(id);
  if (!m) return { error: "Ese maestro no se puede importar." };
  const { archivo, modo } = leer(form);
  const { db, usuario } = await requerirPermisoAccion(m.modulo, modo === "actualizar" ? "editar" : "crear");
  if (!archivo) return { error: "Elige una planilla (.xlsx) o un CSV." };
  const r = await importarMaestro(db, m, archivo, modo);
  if (r.resultado) {
    await registrarCambio(db, {
      usuarioId: usuario.id, entidad: m.entidad, entidadId: `importación ${archivo.name.slice(0, 60)}`, accion: "crear",
      despues: { archivo: archivo.name, modo, filas: r.analisis?.total, creadas: r.resultado.creadas, actualizadas: r.resultado.actualizadas, omitidas: r.resultado.omitidas.length },
    });
    revalidatePath(m.ruta);
  }
  return r;
}
