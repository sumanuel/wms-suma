"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { agregarCajasPallet, cerrarPalletDespacho, crearPalletDespacho, despacharPallet, eliminarPalletDespacho, quitarCajaPallet, reabrirPalletDespacho } from "@/lib/pallets/despacho";

export type Estado = { error?: string; aviso?: string };
const falla = (e: unknown): Estado => { if (e instanceof ErrorDeNegocio) return { error: e.message }; throw e; };
const num = (v: FormDataEntryValue | null) => { const t = String(v ?? "").trim(); if (!t) return null; const n = Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t); return Number.isFinite(n) ? n : NaN; };
const ruta = (id: number) => `/pallets/despacho/${id}`;

export async function nuevoPallet(_p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "crear");
  let id: number;
  try {
    id = await crearPalletDespacho(db, String(form.get("bodega") ?? ""), usuario.id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "pallet_despacho", entidadId: String(id), accion: "crear" });
  } catch (e) {
    return falla(e);
  }
  redirect(`${ruta(id)}?aviso=creado`);
}

export async function agregar(id: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "crear");
  const picking = Number(String(form.get("picking") ?? "").trim());
  if (!Number.isInteger(picking) || picking <= 0) return { error: "Escribe el número de picking (un entero)." };
  const texto = String(form.get("cajas") ?? "").trim();
  let cajas: number[] | null = null;
  if (texto) {
    cajas = texto.split(/[\s,;]+/).filter(Boolean).map(Number);
    if (cajas.some((c) => !Number.isInteger(c) || c <= 0)) return { error: "Las cajas se escriben como números separados por comas, por ejemplo 1, 2, 3." };
  }
  try {
    const r = await agregarCajasPallet(db, id, picking, cajas);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "pallet_despacho", entidadId: String(id), accion: "editar", despues: { picking, agregadas: r.agregadas } });
    revalidatePath(ruta(id));
    return { aviso: `${r.agregadas} caja${r.agregadas === 1 ? "" : "s"} del picking ${picking} agregada${r.agregadas === 1 ? "" : "s"}${r.omitidas ? ` (${r.omitidas} ya estaban en pallets)` : ""}.` };
  } catch (e) {
    return falla(e);
  }
}

export async function quitar(id: number, picking: number, caja: number): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "editar");
  try {
    await quitarCajaPallet(db, id, picking, caja);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "pallet_despacho", entidadId: String(id), accion: "editar", despues: { quita: { picking, caja } } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath(ruta(id));
  return {};
}

export async function cerrar(id: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "editar");
  const m = { alto: num(form.get("alto")), ancho: num(form.get("ancho")), largo: num(form.get("largo")), peso: num(form.get("peso")) };
  if (Object.values(m).some((v) => v !== null && Number.isNaN(v))) return { error: "Las medidas y el peso deben ser números (cero o más)." };
  try {
    await cerrarPalletDespacho(db, id, m);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "pallet_despacho", entidadId: String(id), accion: "editar", despues: { estado: "cerrado", ...m } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath(ruta(id));
  return { aviso: "Pallet cerrado." };
}

export async function reabrir(id: number): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "editar");
  try {
    await reabrirPalletDespacho(db, id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "pallet_despacho", entidadId: String(id), accion: "editar", despues: { estado: "abierto" } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath(ruta(id));
  return {};
}

export async function eliminar(id: number): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "eliminar");
  try {
    await eliminarPalletDespacho(db, id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "pallet_despacho", entidadId: String(id), accion: "eliminar" });
  } catch (e) {
    return falla(e);
  }
  redirect("/pallets/despacho?aviso=eliminado");
}

export async function despachar(id: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario, cliente } = await requerirPermisoAccion("despacho", "crear");
  let resumen: string;
  try {
    const r = await despacharPallet(db, id, { transportador: String(form.get("transportador") ?? "").trim(), remesa: String(form.get("remesa") ?? "").trim() || null, placa: String(form.get("placa") ?? "").trim() || null, comentario: String(form.get("comentario") ?? "").trim() || null, nombreEmpresa: cliente.nombre }, usuario.id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "pallet_despacho", entidadId: String(id), accion: "editar", despues: { estado: "despachado", guias: r.guias, pendientes: r.pendientes } });
    resumen = `${r.guias.length}-${r.pendientes.length}`;
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/pedidos");
  redirect(`${ruta(id)}?aviso=despachado&r=${resumen}`);
}
