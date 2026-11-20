// Catálogo de módulos y permisos. Un permiso es "<modulo>.<accion>". Es la única fuente: menú, páginas y acciones del
// servidor la leen. Agregar un módulo = agregarlo aquí y en src/lib/menu.ts.

export const ACCIONES = ["ver", "crear", "editar", "eliminar", "exportar"] as const;
export type Accion = (typeof ACCIONES)[number];

export type Modulo = { id: string; nombre: string; grupo: string };

export const MODULOS: readonly Modulo[] = [
  { id: "articulos", nombre: "Artículos", grupo: "Maestros" },
  { id: "bodegas", nombre: "Bodegas y zonas", grupo: "Maestros" },
  { id: "ubicaciones", nombre: "Ubicaciones", grupo: "Maestros" },
  { id: "terceros", nombre: "Clientes y proveedores", grupo: "Maestros" },
  { id: "cajas", nombre: "Tipos de caja", grupo: "Maestros" },
  { id: "transporte", nombre: "Transportadores y tarifas", grupo: "Maestros" },
  { id: "inventario", nombre: "Inventario y lotes", grupo: "Inventario" },
  { id: "conteo", nombre: "Conteo de inventario", grupo: "Inventario" },
  { id: "pedidos", nombre: "Pedidos y órdenes", grupo: "Operación" },
  { id: "picking", nombre: "Planeación y picking", grupo: "Operación" },
  { id: "prepacking", nombre: "Prepacking", grupo: "Operación" },
  { id: "pallets", nombre: "Pallets y SSCC", grupo: "Operación" },
  { id: "aduana", nombre: "Aduana", grupo: "Operación" },
  { id: "despacho", nombre: "Despacho y guías", grupo: "Operación" },
  { id: "movil", nombre: "Terminal móvil", grupo: "Operación" },
  { id: "indicadores", nombre: "Indicadores y reportes", grupo: "Análisis" },
  { id: "seguridad", nombre: "Usuarios y perfiles", grupo: "Configuración" },
  { id: "auditoria", nombre: "Auditoría", grupo: "Configuración" },
] as const;

export const permiso = (modulo: string, accion: Accion) => `${modulo}.${accion}`;

/** Todos los permisos posibles, para el perfil Administrador inicial. */
export const TODOS_LOS_PERMISOS: readonly string[] = MODULOS.flatMap((m) => ACCIONES.map((a) => permiso(m.id, a)));

export const esPermisoValido = (p: string) => TODOS_LOS_PERMISOS.includes(p);
