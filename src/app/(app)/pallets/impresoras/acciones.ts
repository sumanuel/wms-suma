"use server";

import { revalidatePath } from "next/cache";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { cambiarActiva, crearImpresora, eliminarImpresora, enviarPorTcp, imprimirDirecto, type Referencia, type TipoEtiqueta } from "@/lib/etiquetas/impresion";
import { zplPrueba } from "@/lib/etiquetas/zpl";

export type Estado = { error?: string; aviso?: string };
const falla = (e: unknown): Estado => { if (e instanceof ErrorDeNegocio) return { error: e.message }; throw e; };
const TIPOS: TipoEtiqueta[] = ["cajas-despacho", "cajas", "pallet", "pallet-despacho"];

export async function nuevaImpresora(_p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "eliminar");
  try {
    const i = await crearImpresora(db, {
      nombre: String(form.get("nombre") ?? ""), host: String(form.get("host") ?? ""),
      puerto: Number(String(form.get("puerto") ?? "9100").trim() || 9100), dpi: Number(form.get("dpi") ?? 203),
    });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "impresora_etiquetas", entidadId: String(i.id), accion: "crear", despues: { nombre: i.nombre, host: i.host, puerto: i.puerto, dpi: i.dpi } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/pallets/impresoras");
  return { aviso: "Impresora registrada." };
}

export async function activar(id: number, activa: boolean): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "eliminar");
  try {
    await cambiarActiva(db, id, activa);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "impresora_etiquetas", entidadId: String(id), accion: "editar", despues: { activa } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/pallets/impresoras");
  return {};
}

export async function borrar(id: number): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "eliminar");
  try {
    await eliminarImpresora(db, id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "impresora_etiquetas", entidadId: String(id), accion: "eliminar" });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/pallets/impresoras");
  return {};
}

export async function probar(id: number): Promise<Estado> {
  const { db } = await requerirPermisoAccion("pallets", "editar");
  const i = await db.impresoraEtiquetas.findUnique({ where: { id } });
  if (!i) return { error: "No existe esa impresora." };
  try {
    await enviarPorTcp(i.host, i.puerto, zplPrueba(i.nombre, i.dpi === 300 ? 300 : 203));
    return { aviso: `Etiqueta de prueba enviada a «${i.nombre}».` };
  } catch (e) {
    return falla(e);
  }
}

/** Imprime en una impresora registrada. La referencia se valida: solo números enteros positivos. */
export async function imprimirEn(impresoraId: number, tipo: string, ref: Referencia): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "editar");
  if (!TIPOS.includes(tipo as TipoEtiqueta)) return { error: "Tipo de etiqueta no válido." };
  const limpia: Referencia = {};
  for (const k of ["picking", "caja", "desde", "hasta", "numero", "id"] as const) {
    const v = ref?.[k];
    if (v !== undefined) {
      if (!Number.isInteger(v) || v <= 0) return { error: "La referencia de la etiqueta no es válida." };
      limpia[k] = v;
    }
  }
  try {
    const r = await imprimirDirecto(db, impresoraId, tipo as TipoEtiqueta, limpia);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "etiquetas", entidadId: `${tipo}`, accion: "otro", despues: { impresora: r.impresora, etiquetas: r.etiquetas, ref: limpia } });
    return { aviso: `${r.etiquetas} ${r.etiquetas === 1 ? "etiqueta enviada" : "etiquetas enviadas"} a «${r.impresora}».` };
  } catch (e) {
    return falla(e);
  }
}
