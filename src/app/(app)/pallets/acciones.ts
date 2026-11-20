"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { agregarCaja, cambiarEstado, eliminarPallet, quitarCaja, ubicarPallet } from "@/lib/pallets/servicio";
import { registrarImpresion } from "@/lib/pallets/etiquetas";

export type EstadoPallet = { error?: string; aviso?: string };

const entero = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  return /^\d+$/.test(t) ? Number(t) : NaN;
};
const mensaje = (e: unknown) => {
  if (e instanceof ErrorDeNegocio) return { error: e.message };
  throw e;
};

export async function crearPallet(_p: EstadoPallet, form: FormData): Promise<EstadoPallet> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "crear");
  const pallet = entero(form.get("pallet"));
  const caja = entero(form.get("caja"));
  if (!Number.isFinite(pallet) || !Number.isFinite(caja)) return { error: "Escribe el número del pallet y el de la primera caja (enteros)." };
  try {
    const existente = await db.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM t_pallets WHERE cajapallet = ${pallet}`;
    if ((existente[0]?.n ?? 0) > 0) return { error: `El pallet ${pallet} ya existe: ábrelo desde la lista para agregarle cajas.` };
    const r = await agregarCaja(db, pallet, caja);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pallets", entidadId: String(pallet), accion: "crear", despues: { caja, ubicacion: r.ubicacion } });
  } catch (e) {
    return mensaje(e);
  }
  redirect(`/pallets/${pallet}?aviso=creado`);
}

export async function agregarAlPallet(pallet: number, _p: EstadoPallet, form: FormData): Promise<EstadoPallet> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "crear");
  const caja = entero(form.get("caja"));
  if (!Number.isFinite(caja)) return { error: "Escribe el número de la caja (un entero)." };
  try {
    const r = await agregarCaja(db, pallet, caja);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pallets", entidadId: String(pallet), accion: "editar", despues: { agrega: caja, cajas: r.cajas, ubicacion: r.ubicacion } });
  } catch (e) {
    return mensaje(e);
  }
  revalidatePath(`/pallets/${pallet}`);
  return { aviso: `Caja ${caja} agregada.` };
}

export async function quitar(pallet: number, caja: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "editar");
  try {
    await quitarCaja(db, pallet, caja);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pallets", entidadId: String(pallet), accion: "editar", despues: { quita: caja } });
  } catch (e) {
    return mensaje(e);
  }
  revalidatePath(`/pallets/${pallet}`);
  return {};
}

export async function ubicar(pallet: number, _p: EstadoPallet, form: FormData): Promise<EstadoPallet> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "editar");
  const ub = String(form.get("ubicacion") ?? "").trim();
  try {
    const r = await ubicarPallet(db, pallet, ub);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pallets", entidadId: String(pallet), accion: "editar", despues: { ubicacion: ub, cajas: r.cajas } });
    revalidatePath(`/pallets/${pallet}`);
    return { aviso: `Las ${r.cajas} cajas del pallet quedaron en «${ub}».` };
  } catch (e) {
    return mensaje(e);
  }
}

export async function abrirCerrar(pallet: number, abrir: boolean): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "editar");
  try {
    await cambiarEstado(db, pallet, abrir);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pallets", entidadId: String(pallet), accion: "editar", despues: { estado: abrir ? "abierto" : "cerrado" } });
  } catch (e) {
    return mensaje(e);
  }
  revalidatePath(`/pallets/${pallet}`);
  return {};
}

export async function eliminar(pallet: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "eliminar");
  try {
    const n = await eliminarPallet(db, pallet);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pallets", entidadId: String(pallet), accion: "eliminar", antes: { cajas: n } });
  } catch (e) {
    return mensaje(e);
  }
  redirect("/pallets?aviso=eliminado");
}

export async function marcarImpresas(cajas: number[]): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "editar");
  await registrarImpresion(db, cajas.filter((c) => Number.isFinite(c)).slice(0, 200));
  await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_entradas_ras", entidadId: `${cajas[0]}…${cajas.at(-1)}`, accion: "otro", despues: { etiquetasImpresas: cajas.length } });
  return {};
}
