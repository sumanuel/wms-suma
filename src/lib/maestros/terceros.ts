import type { Delegado, Maestro } from "./tipos";
import { SINO } from "./tipos";

const activoInactivo = (v: unknown) => (v === 1 ? { texto: "Sí", tono: "exito" as const } : { texto: "No", tono: "neutro" as const });

export const clientes: Maestro = {
  id: "clientes",
  modulo: "terceros",
  ruta: "/terceros",
  entidad: "t_clientes",
  singular: "cliente",
  plural: "clientes",
  genero: "el",
  delegado: (db) => db.clientes as unknown as Delegado,
  clave: { campo: "nit" },
  campos: [
    { nombre: "nit", etiqueta: "NIT o documento", tipo: "texto", max: 15, requerido: true, soloCrear: true, ayuda: "Identifica al cliente y no se puede cambiar después." },
    { nombre: "nombrecliente", etiqueta: "Razón social o nombre", tipo: "texto", max: 70, requerido: true, ancho: 2 },
    { nombre: "nomcorto", etiqueta: "Nombre corto", tipo: "texto", max: 50 },
    { nombre: "tipo_cliente", etiqueta: "Tipo de cliente", tipo: "texto", max: 100 },
    { nombre: "canal", etiqueta: "Canal", tipo: "texto", max: 100 },
    { nombre: "actividad_economica", etiqueta: "Actividad económica", tipo: "texto", max: 50 },
    { nombre: "primernombre", etiqueta: "Primer nombre", tipo: "texto", max: 50 },
    { nombre: "segundonombre", etiqueta: "Segundo nombre", tipo: "texto", max: 50 },
    { nombre: "primerapellido", etiqueta: "Primer apellido", tipo: "texto", max: 50 },
    { nombre: "segundoapellido", etiqueta: "Segundo apellido", tipo: "texto", max: 50 },
    { nombre: "telefono", etiqueta: "Teléfono", tipo: "texto", max: 50 },
    { nombre: "tele2", etiqueta: "Teléfono 2", tipo: "texto", max: 50 },
    { nombre: "celular", etiqueta: "Celular", tipo: "texto", max: 50 },
    { nombre: "email", etiqueta: "Correo electrónico", tipo: "texto", max: 70 },
    { nombre: "direccion", etiqueta: "Dirección", tipo: "texto", max: 200, ancho: 2 },
    { nombre: "ciudad", etiqueta: "Ciudad", tipo: "texto", max: 50 },
    { nombre: "depto", etiqueta: "Departamento", tipo: "texto", max: 30 },
    { nombre: "pais", etiqueta: "País", tipo: "texto", max: 20 },
    { nombre: "vendedor", etiqueta: "Vendedor", tipo: "texto", max: 50 },
    { nombre: "cupoasignado", etiqueta: "Cupo asignado", tipo: "decimal" },
    { nombre: "condicionesventa", etiqueta: "Plazo de pago (días)", tipo: "entero" },
    { nombre: "contacto1", etiqueta: "Contacto principal", tipo: "texto", max: 50 },
    { nombre: "telefono_contac1", etiqueta: "Teléfono del contacto", tipo: "texto", max: 50 },
    { nombre: "email_contac1", etiqueta: "Correo del contacto", tipo: "texto", max: 60 },
    { nombre: "activo", etiqueta: "Activo", tipo: "seleccion", opciones: SINO, numerico: true },
    { nombre: "bloqueado", etiqueta: "Bloqueado", tipo: "seleccion", opciones: SINO, numerico: true },
    { nombre: "observaciones", etiqueta: "Observaciones", tipo: "textoLargo", ancho: 3, max: 4000 },
  ],
  valoresIniciales: { activo: "1", bloqueado: "0" },
  columnas: [
    { id: "nombre", titulo: "Razón social", campo: "nombrecliente", fija: true },
    { id: "nit", titulo: "NIT", campo: "nit" },
    { id: "ciudad", titulo: "Ciudad", campo: "ciudad" },
    { id: "telefono", titulo: "Teléfono", campo: "telefono" },
    { id: "email", titulo: "Correo", campo: "email", oculta: true },
    { id: "vendedor", titulo: "Vendedor", campo: "vendedor", oculta: true },
    { id: "tipo", titulo: "Tipo", campo: "tipo_cliente", oculta: true },
    { id: "bloqueado", titulo: "Bloqueado", campo: "bloqueado", etiqueta: (v) => (v === 1 ? { texto: "Bloqueado", tono: "error" } : { texto: "No", tono: "neutro" }), oculta: true },
    { id: "activo", titulo: "Activo", campo: "activo", etiqueta: activoInactivo },
  ],
  busqueda: { texto: "Buscar por nombre, NIT o ciudad", campos: ["nombrecliente", "nomcorto", "nit", "ciudad"] },
  filtros: [
    {
      id: "activo",
      etiqueta: "Estado",
      todos: "Activos e inactivos",
      opciones: [
        { valor: "1", etiqueta: "Solo activos", donde: { activo: 1 } },
        { valor: "0", etiqueta: "Solo inactivos", donde: { activo: 0 } },
      ],
    },
  ],
  orden: { columna: "nombre", dir: "asc" },
  titulo: (f) => String(f.nombrecliente ?? f.nit),
  descripcion: (f) => `NIT ${f.nit}`,
  mensajeDependientes: "No se puede eliminar: tiene pedidos, facturas o sedes asociados. Márcalo como inactivo.",
};

// Sedes (direcciones de entrega) de un cliente; en esta tabla también se marca a los proveedores.
export const sedes: Maestro = {
  id: "sedes",
  modulo: "terceros",
  ruta: "/terceros/sedes",
  entidad: "t_clientes_direcciones",
  singular: "sede",
  plural: "sedes",
  genero: "la",
  delegado: (db) => db.clientesDirecciones as unknown as Delegado,
  // El sistema anterior numera las sedes a mano (no es identidad): se toma el siguiente número al crear.
  clave: { campo: "item", numerica: true, autogenerada: true },
  campos: [
    { nombre: "nit", etiqueta: "NIT del cliente", tipo: "texto", max: 15, requerido: true, ayuda: "Debe ser un cliente existente." },
    { nombre: "nombrecliente", etiqueta: "Nombre de la sede", tipo: "texto", max: 70, requerido: true, ancho: 2 },
    { nombre: "direccion", etiqueta: "Dirección", tipo: "texto", max: 200, ancho: 2 },
    { nombre: "ciudad", etiqueta: "Ciudad", tipo: "texto", max: 50 },
    { nombre: "telefono", etiqueta: "Teléfono", tipo: "texto", max: 50 },
    { nombre: "contacto", etiqueta: "Contacto", tipo: "texto", max: 50 },
    { nombre: "zona", etiqueta: "Zona", tipo: "texto", max: 50 },
    { nombre: "ruta", etiqueta: "Ruta", tipo: "texto", max: 15 },
    { nombre: "trasportadora", etiqueta: "Transportadora", tipo: "texto", max: 50 },
    { nombre: "vendedor", etiqueta: "Vendedor", tipo: "texto", max: 50 },
    { nombre: "activo", etiqueta: "Activa", tipo: "seleccion", opciones: SINO, numerico: true },
    { nombre: "isactivoproveedor", etiqueta: "Es proveedor activo", tipo: "booleano" },
    { nombre: "isfacturable", etiqueta: "Se puede facturar", tipo: "booleano" },
    { nombre: "observaciones", etiqueta: "Observaciones", tipo: "textoLargo", ancho: 3, max: 1000 },
  ],
  valoresIniciales: { activo: "1" },
  columnas: [
    { id: "nombre", titulo: "Sede", campo: "nombrecliente", fija: true },
    { id: "nit", titulo: "NIT cliente", campo: "nit" },
    { id: "direccion", titulo: "Dirección", campo: "direccion" },
    { id: "ciudad", titulo: "Ciudad", campo: "ciudad" },
    { id: "zona", titulo: "Zona", campo: "zona", oculta: true },
    { id: "ruta", titulo: "Ruta", campo: "ruta", oculta: true },
    { id: "proveedor", titulo: "Proveedor", campo: "isactivoproveedor", etiqueta: (v) => (v === true ? { texto: "Proveedor", tono: "marca" } : { texto: "—", tono: "neutro" }), oculta: true },
    { id: "activo", titulo: "Activa", campo: "activo", etiqueta: activoInactivo },
  ],
  busqueda: { texto: "Buscar por sede, NIT o ciudad", campos: ["nombrecliente", "nit", "ciudad", "direccion"] },
  filtros: [
    {
      id: "tipo",
      etiqueta: "Tipo",
      todos: "Clientes y proveedores",
      opciones: [{ valor: "proveedor", etiqueta: "Solo proveedores", donde: { isactivoproveedor: true } }],
    },
  ],
  orden: { columna: "nombre", dir: "asc" },
  titulo: (f) => String(f.nombrecliente ?? f.item),
  descripcion: (f) => `Sede ${f.item} · cliente ${f.nit}`,
  validar: async (db, datos) => {
    const nit = String(datos.nit ?? "");
    const c = nit ? await db.clientes.findUnique({ where: { nit }, select: { nit: true } }) : null;
    return nit && !c ? { nit: "No existe un cliente con ese NIT." } : null;
  },
  completar: async (db, datos) => {
    const r = await db.clientesDirecciones.aggregate({ _max: { item: true } });
    return { ...datos, item: (r._max.item ?? 0) + 1 };
  },
  mensajeDependientes: "No se puede eliminar: tiene facturas asociadas. Márcala como inactiva.",
};
