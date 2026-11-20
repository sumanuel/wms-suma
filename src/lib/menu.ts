import { MODULOS } from "./nucleo/modulos";

// Organización del menú, igual que en el sistema de referencia: áreas desplegables con sus módulos, y una
// pantalla de inicio con una tarjeta por módulo. Los módulos y sus permisos salen de nucleo/modulos.ts; aquí solo se
// decide en qué área va cada uno, con qué ícono y con qué descripción.

export type IconoMenu =
  | "inicio"
  | "maestros"
  | "inventarioArea"
  | "operacion"
  | "analisis"
  | "configuracion"
  | "articulos"
  | "bodegas"
  | "ubicaciones"
  | "terceros"
  | "cajas"
  | "transporte"
  | "inventario"
  | "conteo"
  | "pedidos"
  | "picking"
  | "prepacking"
  | "pallets"
  | "aduana"
  | "despacho"
  | "movil"
  | "indicadores"
  | "seguridad"
  | "auditoria";

export type ItemMenu = {
  href: string;
  etiqueta: string;
  descripcion: string;
  icono: IconoMenu;
  // null: visible para cualquier usuario con sesión.
  modulo: (typeof MODULOS)[number]["id"] | null;
};

export type AreaMenu = {
  id: string;
  etiqueta: string;
  icono: IconoMenu;
  items: ItemMenu[];
  // Va separada al pie del menú.
  alPie?: boolean;
};

export const inicio: ItemMenu = {
  href: "/",
  etiqueta: "Inicio",
  descripcion: "Accesos a los módulos de tu perfil.",
  icono: "inicio",
  modulo: null,
};

export const areas: AreaMenu[] = [
  {
    id: "operacion",
    etiqueta: "Operación",
    icono: "operacion",
    items: [
      { href: "/pedidos", etiqueta: "Pedidos", descripcion: "Pedidos y órdenes de clientes, su estado y su alistamiento.", icono: "pedidos", modulo: "pedidos" },
      { href: "/picking", etiqueta: "Picking", descripcion: "Planeación de olas y picking por zona, pedido o lote.", icono: "picking", modulo: "picking" },
      { href: "/prepacking", etiqueta: "Prepacking", descripcion: "Preparación y armado de cajas antes del despacho.", icono: "prepacking", modulo: "prepacking" },
      { href: "/pallets", etiqueta: "Pallets y SSCC", descripcion: "Armado de pallets, etiquetas y códigos SSCC.", icono: "pallets", modulo: "pallets" },
      { href: "/aduana", etiqueta: "Aduana", descripcion: "Documentos y trámites de mercancía en zona aduanera.", icono: "aduana", modulo: "aduana" },
      { href: "/despacho", etiqueta: "Despacho y guías", descripcion: "Despachos, guías de transporte y entregas.", icono: "despacho", modulo: "despacho" },
      { href: "/movil", etiqueta: "Terminal móvil", descripcion: "Operaciones de la bodega desde el lector de código de barras.", icono: "movil", modulo: "movil" },
    ],
  },
  {
    id: "inventario",
    etiqueta: "Inventario",
    icono: "inventarioArea",
    items: [
      { href: "/inventario", etiqueta: "Inventario y lotes", descripcion: "Existencias por artículo, lote y ubicación, y sus movimientos.", icono: "inventario", modulo: "inventario" },
      { href: "/conteo", etiqueta: "Conteo de inventario", descripcion: "Conteos cíclicos y generales, con sus diferencias y ajustes.", icono: "conteo", modulo: "conteo" },
    ],
  },
  {
    id: "maestros",
    etiqueta: "Maestros",
    icono: "maestros",
    items: [
      { href: "/articulos", etiqueta: "Artículos", descripcion: "Artículos, sus unidades, códigos de barras y datos logísticos.", icono: "articulos", modulo: "articulos" },
      { href: "/bodegas", etiqueta: "Bodegas y zonas", descripcion: "Bodegas, zonas y su configuración.", icono: "bodegas", modulo: "bodegas" },
      { href: "/ubicaciones", etiqueta: "Ubicaciones", descripcion: "Ubicaciones de la bodega, ubicaciones fijas por artículo y existencias de cada una.", icono: "ubicaciones", modulo: "ubicaciones" },
      { href: "/terceros", etiqueta: "Clientes y proveedores", descripcion: "Clientes, proveedores y sus direcciones de entrega.", icono: "terceros", modulo: "terceros" },
      { href: "/cajas", etiqueta: "Tipos de caja", descripcion: "Cajas y empaques con sus medidas y pesos.", icono: "cajas", modulo: "cajas" },
      { href: "/transporte", etiqueta: "Transportadores", descripcion: "Transportadores, tarifas y cobertura.", icono: "transporte", modulo: "transporte" },
    ],
  },
  {
    id: "analisis",
    etiqueta: "Análisis",
    icono: "analisis",
    items: [
      { href: "/indicadores", etiqueta: "Indicadores y reportes", descripcion: "Indicadores de la operación y reportes para exportar.", icono: "indicadores", modulo: "indicadores" },
    ],
  },
  {
    id: "configuracion",
    etiqueta: "Configuración",
    icono: "configuracion",
    alPie: true,
    items: [
      { href: "/seguridad", etiqueta: "Usuarios y perfiles", descripcion: "Quién entra al sistema y qué puede hacer en cada módulo.", icono: "seguridad", modulo: "seguridad" },
      { href: "/auditoria", etiqueta: "Auditoría", descripcion: "Ingresos al sistema y cambios hechos por los usuarios.", icono: "auditoria", modulo: "auditoria" },
    ],
  },
];

export const itemsMenu = [inicio, ...areas.flatMap((a) => a.items)];

/** Áreas con solo los módulos que el usuario puede ver (la función aplica permisos y módulos apagados del cliente). */
export function menuPara(puedeVer: (modulo: string) => boolean): AreaMenu[] {
  return areas
    .map((a) => ({ ...a, items: a.items.filter((i) => i.modulo === null || puedeVer(i.modulo)) }))
    .filter((a) => a.items.length > 0);
}

export function estaActivo(href: string, ruta: string) {
  return href === "/" ? ruta === "/" : ruta === href || ruta.startsWith(`${href}/`);
}

export function areaDe(ruta: string) {
  return areas.find((a) => a.items.some((i) => estaActivo(i.href, ruta))) ?? null;
}

export function ubicacion(ruta: string) {
  if (estaActivo(inicio.href, ruta)) return { area: null, item: inicio };
  const area = areaDe(ruta);
  const item = area?.items.find((i) => estaActivo(i.href, ruta));
  return area && item ? { area: area.etiqueta, item } : null;
}
