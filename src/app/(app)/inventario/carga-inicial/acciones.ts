"use server";

import { revalidatePath } from "next/cache";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { analizarCarga, cargarInventario, deshacerCarga, type AnalisisCarga, type ResultadoCarga } from "@/lib/inventario/carga";

export type RespuestaCarga = { error?: string; analisis?: AnalisisCarga; resultado?: ResultadoCarga };
const ENT = "carga_inventario";

function leer(form: FormData) {
  const a = form.get("archivo");
  return { archivo: a instanceof File && a.size > 0 ? a : null, referencia: String(form.get("referencia") ?? "") };
}

export async function revisarCarga(form: FormData): Promise<RespuestaCarga> {
  const { db } = await requerirPermisoAccion("inventario", "crear");
  const { archivo, referencia } = leer(form);
  if (!archivo) return { error: "Elige una planilla (.xlsx) o un CSV." };
  const analisis = await analizarCarga(db, archivo, referencia);
  return analisis.error ? { error: analisis.error, analisis } : { analisis };
}

export async function cargarAccion(form: FormData): Promise<RespuestaCarga> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "crear");
  const { archivo, referencia } = leer(form);
  if (!archivo) return { error: "Elige una planilla (.xlsx) o un CSV." };
  try {
    const r = await cargarInventario(db, archivo, referencia);
    if (r.error || !r.resultado) return { error: r.error, analisis: r.analisis };
    await registrarCambio(db, {
      usuarioId: usuario.id, entidad: ENT, entidadId: r.resultado.referencia, accion: "crear",
      despues: { archivo: archivo.name, cajas: r.resultado.cajas, unidades: r.resultado.unidades, lotes: r.lotesCreados ?? [], desdeCaja: Math.min(...(r.cajasCreadas ?? [0])), hastaCaja: Math.max(...(r.cajasCreadas ?? [0])) },
    });
    revalidatePath("/inventario", "layout");
    return { analisis: r.analisis, resultado: r.resultado };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}

export async function deshacerAccion(referencia: string): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "crear");
  try {
    const previa = await db.auditoriaCambio.findFirst({ where: { entidad: ENT, entidadId: referencia, accion: "crear" }, orderBy: { id: "desc" } });
    const lotes = ((previa?.despues as { lotes?: { lote: string; ean: string }[] } | null)?.lotes ?? []).filter((l) => l && typeof l.lote === "string" && typeof l.ean === "string");
    const r = await deshacerCarga(db, referencia, lotes);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: ENT, entidadId: referencia, accion: "eliminar", antes: { cajas: r.cajas, lotesBorrados: r.lotesBorrados } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath("/inventario", "layout");
  return {};
}
