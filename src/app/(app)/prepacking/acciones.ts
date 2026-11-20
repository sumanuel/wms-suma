"use server";

import { revalidatePath } from "next/cache";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { pickearTodo, registrarPickeo, revertirPickeo } from "@/lib/prepacking/servicio";

export type EstadoPickeo = { error?: string };
const ruta = (id: number) => `/prepacking/${id}`;

function numero(v: FormDataEntryValue | null) {
  const t = String(v ?? "").trim().replace(",", ".");
  if (t === "") return NaN;
  return Number(t);
}

export async function pickear(idPicking: number, idLinea: number, _previo: EstadoPickeo, form: FormData): Promise<EstadoPickeo> {
  const { db, usuario } = await requerirPermisoAccion("prepacking", "editar");
  const caja = numero(form.get("caja"));
  const cantidad = numero(form.get("cantidad"));
  const cajaDespacho = numero(form.get("despacho"));
  if (!Number.isFinite(caja) || caja <= 0 || !Number.isFinite(cantidad) || !Number.isFinite(cajaDespacho)) return { error: "Revisa la caja, la cantidad y la caja de despacho: deben ser números." };
  try {
    const r = await registrarPickeo(db, idPicking, idLinea, { caja, cantidad, cajaDespacho });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_ssccxcaja", entidadId: `${idPicking}|${idLinea}`, accion: "crear", despues: { caja, cantidad, cajaDespacho, picking: r.completo ? "completo" : `faltan ${r.pendientes}` } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath(ruta(idPicking));
  return {};
}

export async function pickearTodoAccion(idPicking: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("prepacking", "editar");
  try {
    const r = await pickearTodo(db, idPicking, 1);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_ssccxcaja", entidadId: String(idPicking), accion: "otro", despues: { pickeadasComoPlaneado: r.hechas } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) {
      revalidatePath(ruta(idPicking));
      return { error: e.message };
    }
    throw e;
  }
  revalidatePath(ruta(idPicking));
  return {};
}

export async function revertir(idPicking: number, idLinea: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("prepacking", "editar");
  try {
    const r = await revertirPickeo(db, idPicking, idLinea);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_ssccxcaja", entidadId: `${idPicking}|${idLinea}`, accion: "eliminar", antes: { caja: r.caja, cantidad: r.cantidad } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath(ruta(idPicking));
  return {};
}
