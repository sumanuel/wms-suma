import type { Delegado, Maestro } from "./tipos";
import { SINO } from "./tipos";

export const transportadores: Maestro = {
  id: "transportadores",
  modulo: "transporte",
  ruta: "/transporte",
  entidad: "t_transportador",
  singular: "transportador",
  plural: "transportadores",
  genero: "el",
  delegado: (db) => db.transportador as unknown as Delegado,
  clave: { campo: "transportador" },
  campos: [
    { nombre: "transportador", etiqueta: "Nombre del transportador", tipo: "texto", max: 50, requerido: true, soloCrear: true, ayuda: "Identifica al transportador y no se puede cambiar después." },
    { nombre: "nit_transportador", etiqueta: "NIT", tipo: "texto", max: 12 },
    { nombre: "estado", etiqueta: "Activo", tipo: "seleccion", opciones: SINO, numerico: true, requerido: true },
    { nombre: "direccion", etiqueta: "Dirección", tipo: "texto", max: 50, ancho: 2 },
    { nombre: "bodega", etiqueta: "Bodega", tipo: "texto", max: 20 },
    { nombre: "telefono1", etiqueta: "Teléfono 1", tipo: "texto", max: 50 },
    { nombre: "telefono2", etiqueta: "Teléfono 2", tipo: "texto", max: 50 },
    { nombre: "codigocuentacliente", etiqueta: "Código de cuenta cliente", tipo: "texto", max: 50 },
    { nombre: "valor_acuerdo", etiqueta: "Valor del acuerdo", tipo: "entero" },
    { nombre: "peso", etiqueta: "Peso máximo 1", tipo: "entero" },
    { nombre: "peso2", etiqueta: "Peso máximo 2", tipo: "decimal" },
    { nombre: "pesovol1", etiqueta: "Peso volumétrico 1", tipo: "decimal" },
    { nombre: "pesovol2", etiqueta: "Peso volumétrico 2", tipo: "decimal" },
    { nombre: "restriccioncarga", etiqueta: "Restricción de carga", tipo: "decimal" },
    { nombre: "num_guia", etiqueta: "Último número de guía", tipo: "texto", max: 50 },
    { nombre: "reporte", etiqueta: "Reporte de guía", tipo: "texto", max: 50 },
    { nombre: "usuario", etiqueta: "Usuario del servicio web", tipo: "texto", max: 50, ayuda: "La contraseña del servicio no se muestra ni se edita aquí." },
    { nombre: "vinculohttp", etiqueta: "Vínculo de rastreo", tipo: "texto", max: 150, ancho: 3 },
  ],
  valoresIniciales: { estado: "1" },
  columnas: [
    { id: "transportador", titulo: "Transportador", campo: "transportador", fija: true },
    { id: "nit", titulo: "NIT", campo: "nit_transportador" },
    { id: "telefono", titulo: "Teléfono", campo: "telefono1" },
    { id: "bodega", titulo: "Bodega", campo: "bodega" },
    { id: "direccion", titulo: "Dirección", campo: "direccion", oculta: true },
    { id: "estado", titulo: "Estado", campo: "estado", etiqueta: (v) => (v === 1 ? { texto: "Activo", tono: "exito" } : { texto: "Inactivo", tono: "neutro" }) },
  ],
  busqueda: { texto: "Buscar por nombre o NIT", campos: ["transportador", "nit_transportador"] },
  filtros: [
    {
      id: "estado",
      etiqueta: "Estado",
      todos: "Activos e inactivos",
      opciones: [
        { valor: "1", etiqueta: "Solo activos", donde: { estado: 1 } },
        { valor: "0", etiqueta: "Solo inactivos", donde: { estado: 0 } },
      ],
    },
  ],
  orden: { columna: "transportador", dir: "asc" },
  titulo: (f) => String(f.transportador),
  descripcion: (f) => (f.nit_transportador ? `NIT ${String(f.nit_transportador).trim()}` : ""),
  mensajeDependientes: "No se puede eliminar: tiene guías o valores logísticos asociados. Márcalo como inactivo.",
};

export const tarifas: Maestro = {
  id: "tarifas",
  modulo: "transporte",
  ruta: "/transporte/tarifas",
  entidad: "t_ins_tarifasdetransporte",
  singular: "tarifa",
  plural: "tarifas",
  genero: "la",
  delegado: (db) => db.insTarifasdetransporte as unknown as Delegado,
  clave: { campo: "id", numerica: true, autogenerada: true },
  campos: [
    { nombre: "id_transportadora", etiqueta: "Transportador", tipo: "texto", max: 50, requerido: true, ayuda: "Nombre exacto del transportador." },
    { nombre: "id_codciuorigen", etiqueta: "Ciudad de origen (código)", tipo: "texto", max: 20 },
    { nombre: "id_codciudestino", etiqueta: "Ciudad de destino (código)", tipo: "texto", max: 20 },
    { nombre: "tipodepoblacion", etiqueta: "Tipo de población", tipo: "texto", max: 20 },
    { nombre: "valor", etiqueta: "Valor", tipo: "decimal" },
  ],
  columnas: [
    { id: "transportador", titulo: "Transportador", campo: "id_transportadora", fija: true },
    { id: "origen", titulo: "Origen", campo: "id_codciuorigen" },
    { id: "destino", titulo: "Destino", campo: "id_codciudestino" },
    { id: "poblacion", titulo: "Población", campo: "tipodepoblacion" },
    { id: "valor", titulo: "Valor", campo: "valor", alinear: "derecha" },
  ],
  busqueda: { texto: "Buscar por transportador u origen/destino", campos: ["id_transportadora", "id_codciuorigen", "id_codciudestino"] },
  orden: { columna: "transportador", dir: "asc" },
  titulo: (f) => `${f.id_transportadora} · ${f.id_codciuorigen ?? "?"} → ${f.id_codciudestino ?? "?"}`,
  descripcion: (f) => `Tarifa ${f.id}`,
  validar: async (db, datos) => {
    const t = await db.transportador.findUnique({ where: { transportador: String(datos.id_transportadora ?? "") }, select: { transportador: true } });
    return t ? null : { id_transportadora: "No existe un transportador con ese nombre." };
  },
};
