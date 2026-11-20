"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { empacar, empacarComoPickeado, empacarTodo, quitarItem, reiniciarAduana, terminarAduana } from "@/lib/aduana/servicio";

export type EstadoEmpaque = { error?: string; mensaje?: string };
const ENT = "t_aduana_wms_pos";
const ruta = (id: number) => `/aduana/${id}`;

function numero(v: FormDataEntryValue | null) {
  const t = String(v ?? "").trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
}

export async function empacarAccion(id: number, ean: string, _previo: EstadoEmpaque, form: FormData): Promise<EstadoEmpaque> {
  const { db, usuario } = await requerirPermisoAccion("aduana", "editar");
  const numcaja = numero(form.get("caja"));
  const cantidad = numero(form.get("cantidad"));
  const tipo = String(form.get("tipo") ?? "").trim();
  if (!Number.isFinite(numcaja) || !Number.isFinite(cantidad)) return { error: "La caja y la cantidad deben ser números." };
  try {
    await empacar(db, id, { ean, numcaja, cantidad, tipo });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: ENT, entidadId: `${id}|${ean}`, accion: "crear", despues: { numcaja, cantidad, tipo } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath(ruta(id));
  return { mensaje: "Empacado." };
}

async function masiva(id: number, evento: string, fn: (db: Awaited<ReturnType<typeof requerirPermisoAccion>>["db"]) => Promise<Record<string, unknown>>) {
  const { db, usuario } = await requerirPermisoAccion("aduana", "editar");
  try {
    const r = await fn(db);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: ENT, entidadId: String(id), accion: "otro", despues: { evento, ...r } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath(ruta(id));
  return {};
}

export async function empacarTodoAccion(id: number, tipo: string) {
  return masiva(id, "empacar todo", (db) => empacarTodo(db, id, tipo));
}
export async function empacarComoPickeadoAccion(id: number, tipo: string) {
  return masiva(id, "empacar como se pickeó", (db) => empacarComoPickeado(db, id, tipo));
}
export async function reiniciarAccion(id: number) {
  return masiva(id, "reiniciar aduana", async (db) => ({ quitados: await reiniciarAduana(db, id) }));
}
export async function quitarAccion(id: number, item: number) {
  return masiva(id, `quitar renglón ${item}`, async (db) => ({ quitado: await quitarItem(db, id, item) }));
}

export async function terminarAccion(id: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("aduana", "editar");
  try {
    const r = await terminarAduana(db, id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_encabezado_prepack", entidadId: String(id), accion: "editar", antes: { valida: 5 }, despues: { valida: 7, cajas: r.cajas } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  redirect(`${ruta(id)}?aviso=terminado`);
}
