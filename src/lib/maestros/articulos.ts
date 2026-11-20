import { camposArticulo, camposReferencia } from "@/app/(app)/articulos/campos";
import type { Delegado, Maestro } from "./tipos";

// Artículos y referencias tienen sus propias pantallas (app/(app)/articulos), no pasan por el motor de maestros. Estas
// definiciones existen para que el importador de planillas las trate igual que a los demás maestros y reutilice sus campos
// y sus reglas. No se registran en registro.ts (no generan rutas).

const comun = { genero: "el" as const, soloConsulta: false, columnas: [], busqueda: { texto: "", campos: [] }, orden: { columna: "", dir: "asc" as const } };

export const articulosImportable: Maestro = {
  ...comun,
  id: "articulos",
  modulo: "articulos",
  ruta: "/articulos",
  entidad: "t_detalle_referencia",
  singular: "artículo",
  plural: "artículos",
  delegado: (db) => db.detalleReferencia as unknown as Delegado,
  clave: { campo: "productoean" },
  campos: async (db) => {
    const refs = await db.insReferencias.findMany({ select: { codigoreferencia: true, nombreref: true }, orderBy: { codigoreferencia: "asc" } });
    return camposArticulo(refs.map((r) => ({ valor: r.codigoreferencia, etiqueta: `${r.codigoreferencia} · ${r.nombreref ?? ""}` })));
  },
  titulo: (f) => String(f.descripcion ?? f.productoean),
};

export const referenciasImportable: Maestro = {
  ...comun,
  id: "referencias",
  genero: "la",
  modulo: "articulos",
  ruta: "/articulos/referencias",
  entidad: "t_ins_referencias",
  singular: "referencia",
  plural: "referencias",
  delegado: (db) => db.insReferencias as unknown as Delegado,
  clave: { campo: "codigoreferencia" },
  campos: camposReferencia,
  titulo: (f) => String(f.nombreref ?? f.codigoreferencia),
};
