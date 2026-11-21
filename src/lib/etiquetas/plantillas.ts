import "server-only";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { ErrorPlantilla, renderizar, validarPlantilla, type Fila } from "@/lib/etiquetas/plantilla";
import { ETIQUETAS, TIPOS_ETIQUETA, type TipoEtiqueta } from "@/lib/etiquetas/plantillas-defecto";

// Plantillas ZPL por cliente: cada etiqueta usa la plantilla propia si la hay y, si no, la predeterminada del sistema.

export const esTipo = (t: string): t is TipoEtiqueta => (TIPOS_ETIQUETA as readonly string[]).includes(t);

export async function plantillaDe(db: Db, tipo: TipoEtiqueta) {
  const f = await db.plantillaZpl.findUnique({ where: { tipo } });
  return f ? { contenido: f.contenido, personalizada: true, actualizada_en: f.actualizada_en, actualizada_por: f.actualizada_por } : { contenido: ETIQUETAS[tipo].defecto, personalizada: false, actualizada_en: null, actualizada_por: null };
}

export async function listarPlantillas(db: Db) {
  const filas = await db.plantillaZpl.findMany({ select: { tipo: true, actualizada_en: true, actualizada_por: true } });
  return TIPOS_ETIQUETA.map((tipo) => {
    const f = filas.find((x) => x.tipo === tipo);
    return { tipo, titulo: ETIQUETAS[tipo].titulo, descripcion: ETIQUETAS[tipo].descripcion, personalizada: !!f, actualizada_en: f?.actualizada_en ?? null, actualizada_por: f?.actualizada_por ?? null };
  });
}

/** Valida una plantilla contra los datos de muestra del tipo; convierte el error del motor en un error de negocio legible. */
export function comprobarPlantilla(tipo: TipoEtiqueta, contenido: string) {
  try {
    validarPlantilla(contenido, ETIQUETAS[tipo].muestra);
  } catch (e) {
    if (e instanceof ErrorPlantilla) throw new ErrorDeNegocio(e.message);
    throw e;
  }
}

export async function guardarPlantilla(db: Db, tipo: TipoEtiqueta, contenido: string, usuario: string) {
  const limpio = contenido.replace(/\r\n/g, "\n");
  comprobarPlantilla(tipo, limpio);
  await db.plantillaZpl.upsert({ where: { tipo }, create: { tipo, contenido: limpio, actualizada_por: usuario }, update: { contenido: limpio, actualizada_por: usuario, actualizada_en: new Date() } });
}

export async function restaurarPlantilla(db: Db, tipo: TipoEtiqueta) {
  await db.plantillaZpl.deleteMany({ where: { tipo } });
}

/** Llena una plantilla con datos; un error de la plantilla se informa como error de negocio. */
export function llenarPlantilla(contenido: string, datos: Fila, dpi: 203 | 300) {
  try {
    return renderizar(contenido, datos, dpi);
  } catch (e) {
    if (e instanceof ErrorPlantilla) throw new ErrorDeNegocio(`La plantilla de la etiqueta tiene un error: ${e.message}`);
    throw e;
  }
}
