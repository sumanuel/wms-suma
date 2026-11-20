import "server-only";
import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { esViolacionDeClave, esViolacionUnica, leerFormulario, type EstadoForm } from "@/lib/formularios";
import type { Maestro } from "./tipos";
import { buscarMaestro } from "./registro";

export function claveDe(m: Maestro, texto: string) {
  return m.clave.numerica ? Number(texto) : texto;
}

export async function camposDe(m: Maestro, db: Parameters<Maestro["delegado"]>[0]) {
  return typeof m.campos === "function" ? m.campos(db) : m.campos;
}

function claveDesdeUrl(m: Maestro, texto: string | null) {
  if (texto === null) return null;
  const c = claveDe(m, texto);
  return typeof c === "number" && !Number.isSafeInteger(c) ? null : c;
}

export async function guardarMaestro(id: string, claveTexto: string | null, previo: EstadoForm, form: FormData): Promise<EstadoForm> {
  const m = buscarMaestro(id);
  if (!m || m.soloConsulta) return { error: "Operación no disponible." };
  const editando = claveTexto !== null;
  const clave = claveDesdeUrl(m, claveTexto);
  if (editando && clave === null) return { error: "Registro no válido." };
  const { db, usuario } = await requerirPermisoAccion(m.modulo, editando ? "editar" : "crear");
  const d = m.delegado(db);
  const f = leerFormulario(await camposDe(m, db), form, editando);
  const intento = (previo.intento ?? 0) + 1;
  const fallo = (errores: Record<string, string>): EstadoForm => ({
    errores,
    valores: f.valores,
    error: "Revisa los campos marcados.",
    intento,
  });
  const errores = { ...f.errores, ...((await m.validar?.(db, f.datos, editando)) ?? {}) };
  if (Object.keys(errores).length > 0) return fallo(errores);

  let datos = f.datos as Record<string, unknown>;
  const donde = { [m.clave.campo]: editando ? clave : datos[m.clave.campo] };
  try {
    if (editando) {
      const antes = await d.findUnique({ where: donde });
      if (!antes) return { error: `${m.genero === "el" ? "El" : "La"} ${m.singular} ya no existe.` };
      await d.update({ where: donde, data: datos });
      await registrarCambio(db, { usuarioId: usuario.id, entidad: m.entidad, entidadId: String(clave), accion: "editar", antes, despues: datos });
    } else {
      if (m.completar) datos = await m.completar(db, datos);
      if (!m.clave.autogenerada && (await d.findUnique({ where: donde }))) {
        return fallo({ [m.clave.campo]: `Ya existe ${m.genero === "el" ? "un" : "una"} ${m.singular} con este código.` });
      }
      await d.create({ data: datos });
      await registrarCambio(db, { usuarioId: usuario.id, entidad: m.entidad, entidadId: String(datos[m.clave.campo] ?? ""), accion: "crear", despues: datos });
    }
  } catch (e) {
    if (esViolacionUnica(e)) return { error: m.mensajeDuplicado ?? "Ya existe un registro con esos datos.", valores: f.valores, intento };
    if (esViolacionDeClave(e)) return { error: "Un dato apunta a un registro que no existe.", valores: f.valores, intento };
    throw e;
  }
  redirect(`${m.ruta}?aviso=${editando ? "editado" : "creado"}`);
}

export async function eliminarMaestro(id: string, claveTexto: string): Promise<{ error?: string }> {
  const m = buscarMaestro(id);
  if (!m || m.soloConsulta) return { error: "Operación no disponible." };
  const clave = claveDesdeUrl(m, claveTexto);
  if (clave === null) return { error: "Registro no válido." };
  const { db, usuario } = await requerirPermisoAccion(m.modulo, "eliminar");
  const d = m.delegado(db);
  const donde = { [m.clave.campo]: clave };
  const antes = await d.findUnique({ where: donde });
  if (antes) {
    try {
      await d.delete({ where: donde });
    } catch (e) {
      if (esViolacionDeClave(e)) return { error: m.mensajeDependientes ?? "No se puede eliminar: tiene registros que dependen de él." };
      throw e;
    }
    await registrarCambio(db, { usuarioId: usuario.id, entidad: m.entidad, entidadId: String(clave), accion: "eliminar", antes });
  }
  redirect(`${m.ruta}?aviso=eliminado`);
}
