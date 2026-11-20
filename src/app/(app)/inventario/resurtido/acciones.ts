"use server";

import { revalidatePath } from "next/cache";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { cancelarTarea, completarTarea, crearRegla, eliminarRegla, generarTareas } from "@/lib/resurtido/servicio";

export type Estado = { error?: string; aviso?: string };
const falla = (e: unknown): Estado => { if (e instanceof ErrorDeNegocio) return { error: e.message }; throw e; };
const num = (v: FormDataEntryValue | null) => { const t = String(v ?? "").trim(); if (!t) return NaN; return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t); };

export async function generar(): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  try {
    const r = await generarTareas(db, usuario.id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "resurtido", entidadId: "generacion", accion: "crear", despues: r });
    revalidatePath("/inventario/resurtido", "layout");
    if (r.reglas === 0) return { aviso: "Ninguna ubicación de picking necesita resurtido." };
    return { aviso: `${r.tareas} tarea${r.tareas === 1 ? "" : "s"} generada${r.tareas === 1 ? "" : "s"} para ${r.reglas - r.sinCajas} regla${r.reglas - r.sinCajas === 1 ? "" : "s"}${r.sinCajas ? `; ${r.sinCajas} no tiene${r.sinCajas === 1 ? "" : "n"} cajas disponibles en el almacenamiento` : ""}.` };
  } catch (e) {
    return falla(e);
  }
}

export async function hacer(id: number): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  try {
    const r = await completarTarea(db, id, usuario.id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "resurtido_tarea", entidadId: String(id), accion: "editar", despues: { estado: "hecha", caja: r.caja, desde: r.desde, hasta: r.hasta } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/inventario/resurtido", "layout");
  return {};
}

export async function cancelar(id: number): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  try {
    await cancelarTarea(db, id, "Cancelada a mano");
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "resurtido_tarea", entidadId: String(id), accion: "editar", despues: { estado: "cancelada" } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/inventario/resurtido", "layout");
  return {};
}

export async function nuevaRegla(_p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "crear");
  try {
    const r = await crearRegla(db, { bodega: String(form.get("bodega") ?? ""), ean: String(form.get("ean") ?? ""), ubicacion: String(form.get("ubicacion") ?? ""), minimo: num(form.get("minimo")), maximo: num(form.get("maximo")) });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "resurtido_regla", entidadId: String(r.id), accion: "crear", despues: { ean: r.ean, ubicacion: r.ubicacion, minimo: Number(r.minimo), maximo: Number(r.maximo) } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/inventario/resurtido", "layout");
  return { aviso: "Regla creada." };
}

export async function borrarRegla(id: number): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "eliminar");
  try {
    await eliminarRegla(db, id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "resurtido_regla", entidadId: String(id), accion: "eliminar" });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/inventario/resurtido", "layout");
  return {};
}
