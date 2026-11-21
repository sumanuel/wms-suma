"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { analizarOrdenes, anularOrden, cerrarOrden, crearOrden, editarOrden, importarOrdenes, type AnalisisOrdenes } from "@/lib/compras/ordenes";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";

export type Estado = { error?: string; aviso?: string };
const falla = (e: unknown): Estado => { if (e instanceof ErrorDeNegocio) return { error: e.message }; throw e; };
const num = (v: unknown) => { const t = String(v ?? "").trim(); if (!t) return NaN; return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t); };

function leerLineas(form: FormData) {
  const lineas: { ean: string; cantidad: number; precio: number | null }[] = [];
  const total = Math.min(Number(form.get("lineas") ?? 0), 300);
  for (let i = 0; i < total; i++) {
    const ean = String(form.get(`ean_${i}`) ?? "").trim();
    const cantT = String(form.get(`cantidad_${i}`) ?? "").trim();
    const precT = String(form.get(`precio_${i}`) ?? "").trim();
    if (!ean && !cantT && !precT) continue;
    lineas.push({ ean, cantidad: num(cantT), precio: precT ? num(precT) : null });
  }
  return lineas;
}

export async function nuevaOrden(_p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "crear");
  const lineas = leerLineas(form);
  let numero: number;
  try {
    numero = await crearOrden(db, { orden: 0, bodega: String(form.get("bodega") ?? ""), nit: String(form.get("nit") ?? ""), esperada: String(form.get("esperada") ?? "") || null, observaciones: String(form.get("observaciones") ?? "") || null, lineas }, usuario.nombre);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_orden_compra", entidadId: String(numero), accion: "crear", despues: { lineas: lineas.length } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/inventario/ordenes");
  redirect(`/inventario/ordenes/${numero}?aviso=creada`);
}

export async function editar(numero: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  const lineas = leerLineas(form);
  try {
    const r = await editarOrden(db, numero, { orden: numero, bodega: String(form.get("bodega") ?? ""), nit: String(form.get("nit") ?? ""), esperada: String(form.get("esperada") ?? "") || null, observaciones: String(form.get("observaciones") ?? "") || null, lineas });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_orden_compra", entidadId: String(numero), accion: "editar", despues: { lineas: lineas.length, completa: r.completa } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/inventario/ordenes");
  redirect(`/inventario/ordenes/${numero}?aviso=editada`);
}

export async function cerrar(numero: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  const razon = String(form.get("razon") ?? "");
  try {
    await cerrarOrden(db, numero, razon);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_orden_compra", entidadId: String(numero), accion: "editar", despues: { estado: "Cerrada", razon } });
  } catch (e) {
    return falla(e);
  }
  redirect(`/inventario/ordenes/${numero}?aviso=cerrada`);
}

export async function anular(numero: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "eliminar");
  const razon = String(form.get("razon") ?? "");
  try {
    await anularOrden(db, numero, razon);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_orden_compra", entidadId: String(numero), accion: "editar", despues: { estado: "Anulada", razon } });
  } catch (e) {
    return falla(e);
  }
  redirect(`/inventario/ordenes/${numero}?aviso=anulada`);
}

// ── Importar ──────────────────────────────────────────────────────────────────────────────────────────────────────

export type RespuestaImportacion = { error?: string; analisis?: AnalisisOrdenes; resultado?: { creadas: { clave: string; numero: number; lineas: number }[]; omitidas: { clave: string; motivo: string }[] } };
const archivoDe = (f: FormData) => { const a = f.get("archivo"); return a instanceof File && a.size > 0 ? a : null; };

export async function revisarOrdenes(form: FormData): Promise<RespuestaImportacion> {
  const { db } = await requerirPermisoAccion("inventario", "crear");
  const archivo = archivoDe(form);
  if (!archivo) return { error: "Elige una planilla (.xlsx) o un CSV." };
  const analisis = await analizarOrdenes(db, archivo);
  return analisis.error ? { error: analisis.error, analisis } : { analisis };
}

export async function importarOrdenesAccion(form: FormData): Promise<RespuestaImportacion> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "crear");
  const archivo = archivoDe(form);
  if (!archivo) return { error: "Elige una planilla (.xlsx) o un CSV." };
  const analisis = await analizarOrdenes(db, archivo);
  if (analisis.error) return { error: analisis.error, analisis };
  const resultado = await importarOrdenes(db, analisis, usuario.nombre);
  await registrarCambio(db, { usuarioId: usuario.id, entidad: "importacion_ordenes_compra", entidadId: archivo.name.slice(0, 80), accion: "crear", despues: { archivo: archivo.name, filas: analisis.filas, creadas: resultado.creadas.length, omitidas: resultado.omitidas.length } });
  revalidatePath("/inventario/ordenes");
  return { analisis, resultado };
}
