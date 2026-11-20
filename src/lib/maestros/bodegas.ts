import type { Delegado, Maestro } from "./tipos";


export const bodegas: Maestro = {
  id: "bodegas",
  modulo: "bodegas",
  ruta: "/bodegas",
  entidad: "t_ins_bodega",
  singular: "bodega",
  plural: "bodegas",
  genero: "la",
  delegado: (db) => db.insBodega as unknown as Delegado,
  clave: { campo: "bodega" },
  campos: [
    { nombre: "bodega", etiqueta: "Código de la bodega", tipo: "texto", max: 15, requerido: true, soloCrear: true, ayuda: "No se puede cambiar después." },
    { nombre: "descripcion", etiqueta: "Descripción", tipo: "texto", max: 50, requerido: true, ancho: 2 },
    { nombre: "ubicacionf_c", etiqueta: "Ubicación física", tipo: "texto", max: 50 },
    { nombre: "regional", etiqueta: "Regional", tipo: "texto", max: 2 },
    { nombre: "codcc", etiqueta: "Centro de costo", tipo: "texto", max: 6 },
    { nombre: "tipu", etiqueta: "Tipo de bodega (código)", tipo: "entero" },
    { nombre: "prcierre", etiqueta: "Cerrada para movimientos", tipo: "booleano", ayuda: "Si está marcada, la bodega no recibe movimientos." },
  ],
  valoresIniciales: { codcc: "ND", regional: "ND" },
  columnas: [
    { id: "descripcion", titulo: "Descripción", campo: "descripcion", fija: true },
    { id: "bodega", titulo: "Código", campo: "bodega" },
    { id: "ubicacion", titulo: "Ubicación física", campo: "ubicacionf_c" },
    { id: "regional", titulo: "Regional", campo: "regional" },
    { id: "codcc", titulo: "Centro de costo", campo: "codcc", oculta: true },
    { id: "cerrada", titulo: "Estado", campo: "prcierre", etiqueta: (v) => (v === true ? { texto: "Cerrada", tono: "aviso" } : { texto: "Abierta", tono: "exito" }) },
  ],
  busqueda: { texto: "Buscar por código o descripción", campos: ["bodega", "descripcion"] },
  filtros: [
    {
      id: "estado",
      etiqueta: "Estado",
      todos: "Abiertas y cerradas",
      opciones: [
        { valor: "abierta", etiqueta: "Solo abiertas", donde: { prcierre: false } },
        { valor: "cerrada", etiqueta: "Solo cerradas", donde: { prcierre: true } },
      ],
    },
  ],
  orden: { columna: "descripcion", dir: "asc" },
  titulo: (f) => String(f.descripcion ?? f.bodega),
  descripcion: (f) => `Código ${f.bodega}`,
  mensajeDependientes: "No se puede eliminar: tiene pedidos u otros registros asociados. Ciérrala en su lugar.",
};

