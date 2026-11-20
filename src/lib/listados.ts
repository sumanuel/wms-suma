import type { ReactNode } from "react";

export type Direccion = "asc" | "desc";
export type Valor = string | number | Date | null;
export type Formato = "texto" | "numero" | "fecha" | "fechaHora";
export type Busqueda = Record<string, string | string[] | undefined>;

export type Columna<F, O> = {
  id: string;
  titulo: string;
  // Valor plano: lo que se ordena en pantalla si no hay celda y lo que va a Excel y PDF.
  valor: (fila: F) => Valor;
  celda?: (fila: F) => ReactNode;
  formato?: Formato;
  // Puede devolver varios criterios, por ejemplo marca y después modelo.
  ordenar?: (dir: Direccion) => O | O[];
  alinear?: "derecha";
  oculta?: boolean;
  // Identifica la fila: el usuario no la puede ocultar.
  fija?: boolean;
};

export type Opcion = { valor: string; etiqueta: string };

export type Filtro = {
  id: string;
  etiqueta: string;
  todos: string;
  opciones: Opcion[] | (() => Promise<Opcion[]>);
};

export type FiltroCargado = Omit<Filtro, "opciones"> & { opciones: Opcion[] };

export type Pedido<O> = {
  texto: string;
  filtros: Record<string, string>;
  orden: O[];
  salto: number;
  cantidad: number;
};

export type Definicion<F, O> = {
  id: string;
  titulo: string;
  // Módulo de permisos: `.ver` para la pantalla, `.exportar` para Excel y PDF.
  modulo: string;
  ruta: string;
  elemento: { singular: string; plural: string };
  busqueda?: string;
  filtros?: Filtro[];
  columnas: Columna<F, O>[];
  orden: { columna: string; dir: Direccion };
  porPagina?: number;
  claveFila: (fila: F) => string;
  // Ficha de la fila: la abre el ícono de editar (o de ver, sin permiso `.editar`) al final de cada fila.
  enlace?: (fila: F) => string;
  // Registros que no se editan nunca (movimientos de stock): el ícono es siempre el de ver.
  soloLectura?: boolean;
  cargar: (pedido: Pedido<O>) => Promise<{ filas: F[]; total: number }>;
};

export type Consulta = {
  texto: string;
  filtros: Record<string, string>;
  orden: { columna: string; dir: Direccion };
  pagina: number;
};

export const POR_PAGINA = 50;
export const MAXIMO_EXPORTACION = 10_000;

export function nombreCookieColumnas(listado: string) {
  return `columnas_${listado}`;
}

function primero(valor: string | string[] | undefined) {
  return (Array.isArray(valor) ? valor[0] : valor)?.trim() ?? "";
}

export async function cargarFiltros(filtros: Filtro[] = []): Promise<FiltroCargado[]> {
  return Promise.all(
    filtros.map(async (f) => ({ ...f, opciones: typeof f.opciones === "function" ? await f.opciones() : f.opciones })),
  );
}

export function leerConsulta<F, O>(d: Definicion<F, O>, busqueda: Busqueda, filtros: FiltroCargado[]): Consulta {
  const filtrosValidos: Record<string, string> = {};
  for (const f of filtros) {
    const valor = primero(busqueda[f.id]);
    if (f.opciones.some((o) => o.valor === valor)) filtrosValidos[f.id] = valor;
  }

  const columna = d.columnas.find((c) => c.ordenar && c.id === primero(busqueda.orden));
  const dir = primero(busqueda.dir);
  const pagina = Number.parseInt(primero(busqueda.pagina), 10);

  return {
    texto: d.busqueda ? primero(busqueda.q).slice(0, 100) : "",
    filtros: filtrosValidos,
    orden: columna ? { columna: columna.id, dir: dir === "desc" ? "desc" : "asc" } : d.orden,
    pagina: Number.isSafeInteger(pagina) && pagina > 1 ? pagina : 1,
  };
}

export function columnasVisibles<F, O>(d: Definicion<F, O>, cookie: string | undefined) {
  if (cookie === undefined) return d.columnas.filter((c) => !c.oculta);
  const elegidas = new Set(cookie.split(","));
  const visibles = d.columnas.filter((c) => c.fija || elegidas.has(c.id));
  return visibles.length > 0 ? visibles : d.columnas.filter((c) => !c.oculta);
}

export function armarPedido<F, O>(d: Definicion<F, O>, consulta: Consulta, salto: number, cantidad: number): Pedido<O> {
  const ordenar = d.columnas.find((c) => c.id === consulta.orden.columna)?.ordenar;
  return { texto: consulta.texto, filtros: consulta.filtros, orden: ordenar ? ([ordenar(consulta.orden.dir)].flat() as O[]) : [], salto, cantidad };
}

export function hayFiltros(consulta: Consulta) {
  return consulta.texto !== "" || Object.keys(consulta.filtros).length > 0;
}

// Solo escribe lo que difiere de lo predeterminado, para que la URL compartida quede corta.
export function parametrosListado<F, O>(d: Definicion<F, O>, consulta: Consulta, cambios: Partial<Consulta> = {}) {
  const c = { ...consulta, ...cambios };
  const params = new URLSearchParams();
  if (c.texto) params.set("q", c.texto);
  for (const [id, valor] of Object.entries(c.filtros)) params.set(id, valor);
  if (c.orden.columna !== d.orden.columna || c.orden.dir !== d.orden.dir) {
    params.set("orden", c.orden.columna);
    params.set("dir", c.orden.dir);
  }
  if (c.pagina > 1) params.set("pagina", String(c.pagina));
  return params;
}

export function hrefListado<F, O>(d: Definicion<F, O>, consulta: Consulta, cambios: Partial<Consulta> = {}) {
  const params = parametrosListado(d, consulta, cambios).toString();
  return params ? `${d.ruta}?${params}` : d.ruta;
}

const zona = "America/Bogota";
const formatos = {
  // Las fechas de negocio son `date` y llegan como medianoche UTC: en hora local caerían el día anterior.
  fecha: new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }),
  fechaHora: new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: zona }),
  numero: new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }),
};

export function formatear(valor: Valor, formato: Formato = "texto") {
  if (valor === null || valor === "") return "—";
  if (valor instanceof Date) return formato === "fecha" ? formatos.fecha.format(valor) : formatos.fechaHora.format(valor);
  if (typeof valor === "number") return formatos.numero.format(valor);
  return valor;
}
