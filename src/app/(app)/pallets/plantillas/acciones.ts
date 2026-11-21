"use server";

import { revalidatePath } from "next/cache";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { enviarPorTcp } from "@/lib/etiquetas/impresion";
import { comprobarPlantilla, esTipo, guardarPlantilla, llenarPlantilla, restaurarPlantilla } from "@/lib/etiquetas/plantillas";
import { ETIQUETAS } from "@/lib/etiquetas/plantillas-defecto";

export type Estado = { error?: string; aviso?: string; zpl?: string };
const falla = (e: unknown): Estado => { if (e instanceof ErrorDeNegocio) return { error: e.message }; throw e; };
const dpiDe = (v: number): 203 | 300 => (v === 300 ? 300 : 203);

export async function guardar(tipo: string, contenido: string): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "eliminar");
  if (!esTipo(tipo)) return { error: "Tipo de etiqueta no válido." };
  try {
    await guardarPlantilla(db, tipo, contenido, usuario.id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "plantilla_zpl", entidadId: tipo, accion: "editar", despues: { caracteres: contenido.length } });
  } catch (e) {
    return falla(e);
  }
  revalidatePath("/pallets/plantillas", "layout");
  return { aviso: "Plantilla guardada: las próximas etiquetas ya salen con ella." };
}

export async function restaurar(tipo: string): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("pallets", "eliminar");
  if (!esTipo(tipo)) return { error: "Tipo de etiqueta no válido." };
  await restaurarPlantilla(db, tipo);
  await registrarCambio(db, { usuarioId: usuario.id, entidad: "plantilla_zpl", entidadId: tipo, accion: "eliminar" });
  revalidatePath("/pallets/plantillas", "layout");
  return { aviso: "Se volvió a la plantilla predeterminada." };
}

/** Muestra el ZPL que resulta de llenar la plantilla (sin guardarla) con los datos de ejemplo. */
export async function vista(tipo: string, contenido: string, dpi: number): Promise<Estado> {
  await requerirPermisoAccion("pallets", "ver");
  if (!esTipo(tipo)) return { error: "Tipo de etiqueta no válido." };
  try {
    comprobarPlantilla(tipo, contenido);
    return { zpl: llenarPlantilla(contenido, ETIQUETAS[tipo].muestra, dpiDe(dpi)) };
  } catch (e) {
    return falla(e);
  }
}

/** Manda a una impresora registrada una etiqueta de ejemplo hecha con la plantilla (sin guardarla). */
export async function probar(tipo: string, contenido: string, impresoraId: number): Promise<Estado> {
  const { db } = await requerirPermisoAccion("pallets", "editar");
  if (!esTipo(tipo)) return { error: "Tipo de etiqueta no válido." };
  const i = await db.impresoraEtiquetas.findUnique({ where: { id: impresoraId } });
  if (!i || !i.activa) return { error: "Elige una impresora activa." };
  try {
    comprobarPlantilla(tipo, contenido);
    await enviarPorTcp(i.host, i.puerto, llenarPlantilla(contenido, ETIQUETAS[tipo].muestra, dpiDe(i.dpi)));
    return { aviso: `Etiqueta de ejemplo enviada a «${i.nombre}».` };
  } catch (e) {
    return falla(e);
  }
}
