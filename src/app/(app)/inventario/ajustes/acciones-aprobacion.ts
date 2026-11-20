"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirPermisoAccion, tienePermiso } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { analizarBloque, anularAjuste, aplicarBloque, aprobarSolicitud, guardarUmbral, rechazarSolicitud, type AnalisisBloque } from "@/lib/inventario/aprobacion";

export type Estado = { error?: string; aviso?: string };
const falla = (e: unknown): Estado => {
  if (e instanceof ErrorDeNegocio) return { error: e.message };
  throw e;
};

export async function aprobar(id: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "eliminar");
  try {
    const r = await aprobarSolicitud(db, id, { id: usuario.id, nombre: usuario.nombre }, String(form.get("nota") ?? ""));
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "ajuste_solicitud", entidadId: String(id), accion: "editar", despues: { estado: "aprobada", ajuste: r.id, caja: r.caja, saldo: r.despues } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/inventario/ajustes", "layout");
  return { aviso: "Solicitud aprobada y ajuste aplicado." };
}

export async function rechazar(id: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "eliminar");
  const nota = String(form.get("nota") ?? "");
  try {
    await rechazarSolicitud(db, id, { id: usuario.id, nombre: usuario.nombre }, nota);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "ajuste_solicitud", entidadId: String(id), accion: "editar", despues: { estado: "rechazada", nota } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/inventario/ajustes", "layout");
  return { aviso: "Solicitud rechazada." };
}

export async function anular(id: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "eliminar");
  const razon = String(form.get("razon") ?? "");
  try {
    const r = await anularAjuste(db, id, razon);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pic_ajuste", entidadId: `${r.caja}|${id}`, accion: "otro", antes: { ajuste: id }, despues: { anulacion: r.id, saldo: r.despues, razon } });
  } catch (e) {
    return falla(e);
  }
  redirect("/inventario/ajustes?aviso=anulado");
}

export async function fijarUmbral(_p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "eliminar");
  const t = String(form.get("umbral") ?? "").trim().replace(",", ".");
  const n = t === "" ? 0 : Number(t);
  try {
    await guardarUmbral(db, n);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "configuracion", entidadId: "ajustes.aprobacion", accion: "editar", despues: { umbral: n } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/inventario/ajustes", "layout");
  return { aviso: n > 0 ? `Los ajustes de más de ${n} unidades de diferencia necesitarán aprobación.` : "Aprobación desactivada: todos los ajustes se aplican de inmediato." };
}

// ── En bloque ─────────────────────────────────────────────────────────────────────────────────────────────────────

export type RespuestaBloque = { error?: string; analisis?: AnalisisBloque; resumen?: { cajas: number; aumentan: number; disminuyen: number; referencia: string } };

function leer(form: FormData) {
  const a = form.get("archivo");
  return { archivo: a instanceof File && a.size > 0 ? a : null, referencia: String(form.get("referencia") ?? "") };
}

export async function revisarBloque(form: FormData): Promise<RespuestaBloque> {
  const ctx = await requerirPermisoAccion("inventario", "editar");
  const { archivo } = leer(form);
  if (!archivo) return { error: "Elige una planilla (.xlsx) o un CSV." };
  const analisis = await analizarBloque(ctx.db, archivo, tienePermiso(ctx, "inventario", "eliminar"));
  return analisis.error ? { error: analisis.error, analisis } : { analisis };
}

export async function aplicarBloqueAccion(form: FormData): Promise<RespuestaBloque> {
  const ctx = await requerirPermisoAccion("inventario", "editar");
  const { archivo, referencia } = leer(form);
  if (!archivo) return { error: "Elige una planilla (.xlsx) o un CSV." };
  try {
    const r = await aplicarBloque(ctx.db, archivo, tienePermiso(ctx, "inventario", "eliminar"), referencia);
    if (r.error || !r.resumen) return { error: r.error, analisis: r.analisis };
    await registrarCambio(ctx.db, { usuarioId: ctx.usuario.id, entidad: "ajuste_bloque", entidadId: r.resumen.referencia, accion: "crear", despues: { archivo: archivo.name, cajas: r.resumen.cajas, ajustes: r.resumen.ajustes } });
    revalidatePath("/inventario", "layout");
    return { analisis: r.analisis, resumen: r.resumen };
  } catch (e) {
    return falla(e);
  }
}
