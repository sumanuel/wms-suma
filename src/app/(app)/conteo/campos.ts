import type { CampoForm } from "@/lib/formularios";
import type { Db } from "@/lib/tenant";

// Campos del formulario "Programar conteo". Las opciones salen de la base del cliente, por eso es una función.
export async function camposProgramar(db: Db): Promise<CampoForm[]> {
  const [bodegas, usuarios] = await Promise.all([
    db.insBodega.findMany({ select: { bodega: true, descripcion: true }, orderBy: { bodega: "asc" } }),
    db.usuario.findMany({ where: { activo: true }, select: { nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  return [
    { nombre: "bodega", etiqueta: "Bodega", tipo: "seleccion", requerido: true, opciones: bodegas.map((b) => ({ valor: b.bodega, etiqueta: `${b.bodega}${b.descripcion ? ` · ${b.descripcion}` : ""}` })) },
    { nombre: "realiza", etiqueta: "Responsable del conteo", tipo: "seleccion", requerido: true, opciones: usuarios.map((u) => ({ valor: u.nombre, etiqueta: u.nombre })) },
    { nombre: "ean", etiqueta: "Solo este artículo (código de barras)", tipo: "texto", max: 50, ayuda: "Déjalo vacío para contar todos los artículos." },
    { nombre: "ubicacion", etiqueta: "Solo ubicaciones que empiezan por", tipo: "texto", max: 20, ayuda: "Por ejemplo, el pasillo o la zona. Vacío: toda la bodega." },
  ];
}
