import type { Delegado, Maestro } from "./tipos";

// Ubicaciones físicas de las bodegas (t_ins_coordenadas): cada una pertenece a una bodega y tiene su posición en el
// piso. Las cajas del inventario (t_pic) apuntan a ellas por código.
export const ubicaciones: Maestro = {
  id: "ubicaciones",
  modulo: "ubicaciones",
  ruta: "/ubicaciones",
  entidad: "t_ins_coordenadas",
  singular: "ubicación",
  plural: "ubicaciones",
  genero: "la",
  delegado: (db) => db.insCoordenadas as unknown as Delegado,
  clave: { campo: "ubicacion" },
  campos: [
    { nombre: "ubicacion", etiqueta: "Código de la ubicación", tipo: "texto", max: 20, requerido: true, soloCrear: true, ayuda: "Es el código que se lee en la etiqueta. No se puede cambiar después." },
    { nombre: "bodegac", etiqueta: "Bodega", tipo: "texto", max: 15, requerido: true },
    { nombre: "zonapiso", etiqueta: "Zona", tipo: "texto", max: 15, requerido: true },
    { nombre: "prioridadrotacion", etiqueta: "Prioridad de rotación", tipo: "texto", max: 10, requerido: true },
    { nombre: "fila_piso", etiqueta: "Fila", tipo: "texto", max: 10, requerido: true },
    { nombre: "columna_piso", etiqueta: "Columna", tipo: "texto", max: 10, requerido: true },
    { nombre: "piso", etiqueta: "Piso o nivel", tipo: "texto", max: 10, requerido: true },
    { nombre: "posicion_x", etiqueta: "Posición X", tipo: "texto", max: 10, requerido: true },
    { nombre: "posicion_z", etiqueta: "Posición Z", tipo: "texto", max: 10, requerido: true },
    { nombre: "capcubica", etiqueta: "Capacidad cúbica", tipo: "decimal" },
    { nombre: "cappeso", etiqueta: "Capacidad de peso", tipo: "decimal" },
    { nombre: "distanciaptoref", etiqueta: "Distancia al punto de referencia", tipo: "decimal" },
    { nombre: "tipo_producto", etiqueta: "Tipo de producto", tipo: "texto", max: 50 },
  ],
  columnas: [
    { id: "ubicacion", titulo: "Ubicación", campo: "ubicacion", fija: true },
    { id: "bodega", titulo: "Bodega", campo: "bodegac" },
    { id: "zona", titulo: "Zona", campo: "zonapiso" },
    { id: "fila", titulo: "Fila", campo: "fila_piso" },
    { id: "columna", titulo: "Columna", campo: "columna_piso" },
    { id: "piso", titulo: "Nivel", campo: "piso" },
    { id: "rotacion", titulo: "Rotación", campo: "prioridadrotacion", oculta: true },
    { id: "capcubica", titulo: "Cap. cúbica", campo: "capcubica", alinear: "derecha", oculta: true },
    { id: "cappeso", titulo: "Cap. peso", campo: "cappeso", alinear: "derecha", oculta: true },
  ],
  busqueda: { texto: "Buscar por código, bodega o zona", campos: ["ubicacion", "bodegac", "zonapiso"] },
  orden: { columna: "ubicacion", dir: "asc" },
  titulo: (f) => String(f.ubicacion),
  descripcion: (f) => `Bodega ${f.bodegac}`,
  mensajeDependientes: "No se puede eliminar: hay registros que usan esta ubicación.",
  validar: async (db, datos) => {
    const b = String(datos.bodegac ?? "");
    return b && !(await db.insBodega.findUnique({ where: { bodega: b }, select: { bodega: true } })) ? { bodegac: "No existe una bodega con ese código." } : null;
  },
};

export const ubicacionesFijas: Maestro = {
  id: "ubicaciones-fijas",
  modulo: "ubicaciones",
  ruta: "/ubicaciones/fijas",
  entidad: "t_ins_ubicaciones_fijas_mp",
  singular: "ubicación fija",
  plural: "ubicaciones fijas",
  genero: "la",
  delegado: (db) => db.insUbicacionesFijasMp as unknown as Delegado,
  clave: { campo: "idubicacion", numerica: true, autogenerada: true },
  campos: [
    { nombre: "bodega", etiqueta: "Bodega", tipo: "texto", max: 10, requerido: true },
    { nombre: "eanmaterial", etiqueta: "Código de barras del artículo", tipo: "texto", max: 50, requerido: true },
    { nombre: "codubicacion1", etiqueta: "Ubicación 1", tipo: "texto", max: 50, requerido: true },
    { nombre: "codubicacion2", etiqueta: "Ubicación 2", tipo: "texto", max: 50 },
    { nombre: "codubicacion3", etiqueta: "Ubicación 3", tipo: "texto", max: 50 },
    { nombre: "codubicacion4", etiqueta: "Ubicación 4", tipo: "texto", max: 50 },
    { nombre: "codubicacion5", etiqueta: "Ubicación 5", tipo: "texto", max: 50 },
  ],
  columnas: [
    { id: "bodega", titulo: "Bodega", campo: "bodega", fija: true },
    { id: "ean", titulo: "Artículo (EAN)", campo: "eanmaterial" },
    { id: "u1", titulo: "Ubicación 1", campo: "codubicacion1" },
    { id: "u2", titulo: "Ubicación 2", campo: "codubicacion2" },
    { id: "u3", titulo: "Ubicación 3", campo: "codubicacion3", oculta: true },
    { id: "u4", titulo: "Ubicación 4", campo: "codubicacion4", oculta: true },
    { id: "u5", titulo: "Ubicación 5", campo: "codubicacion5", oculta: true },
  ],
  busqueda: { texto: "Buscar por bodega, artículo o ubicación", campos: ["bodega", "eanmaterial", "codubicacion1", "codubicacion2"] },
  orden: { columna: "bodega", dir: "asc" },
  titulo: (f) => `${f.bodega} · ${f.eanmaterial}`,
  descripcion: (f) => `Ubicación fija ${f.idubicacion}`,
  mensajeDuplicado: "Ya hay una ubicación fija para este artículo en esa bodega.",
  validar: async (db, datos) => {
    const e: Record<string, string> = {};
    const ean = String(datos.eanmaterial ?? "");
    if (ean && !(await db.detalleReferencia.findUnique({ where: { productoean: ean }, select: { productoean: true } }))) {
      e.eanmaterial = "No existe un artículo con ese código de barras.";
    }
    return Object.keys(e).length ? e : null;
  },
};

// Saldo de cada artículo en cada ubicación fija (t_pic_ubicacionesfijasxean). Solo consulta: lo mueven las operaciones.
export const existenciasUbicacion: Maestro = {
  id: "existencias-ubicacion",
  modulo: "ubicaciones",
  ruta: "/ubicaciones/existencias",
  entidad: "t_pic_ubicacionesfijasxean",
  singular: "existencia",
  plural: "existencias",
  genero: "la",
  delegado: (db) => db.picUbicacionesfijasxean as unknown as Delegado,
  clave: { campo: "id" },
  soloConsulta: true,
  claveFila: (f) => `${f.productoean}|${f.ubicacion}`,
  campos: [],
  columnas: [
    { id: "ubicacion", titulo: "Ubicación", campo: "ubicacion", fija: true },
    { id: "ean", titulo: "Artículo (EAN)", campo: "productoean" },
    { id: "entradas", titulo: "Entradas", campo: "entradas", alinear: "derecha" },
    { id: "salidas", titulo: "Salidas", campo: "salidas", alinear: "derecha" },
    { id: "reservas", titulo: "Reservas", campo: "reservas", alinear: "derecha" },
    {
      id: "saldo",
      titulo: "Saldo",
      alinear: "derecha",
      valor: (f) => Number(f.entradas ?? 0) - Number(f.salidas ?? 0),
    },
    { id: "contenedor", titulo: "Contenedor", campo: "contenedor", oculta: true },
  ],
  busqueda: { texto: "Buscar por ubicación, artículo o contenedor", campos: ["ubicacion", "productoean", "contenedor"] },
  orden: { columna: "ubicacion", dir: "asc" },
  titulo: (f) => `${f.productoean} en ${f.ubicacion}`,
};
