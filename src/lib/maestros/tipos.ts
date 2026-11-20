import type { CampoForm, Valores } from "@/lib/formularios";
import type { Tono } from "@/components/ui";
import type { Db } from "@/lib/tenant";

// Un "maestro" es una tabla de datos de referencia con listado, ficha, alta, edición y baja. Se declara con un objeto y
// el motor (components/maestro, lib/maestros/nucleo.ts) hace el resto. Para agregar uno: declararlo en su archivo de
// lib/maestros/ y registrarlo en lib/maestros/registro.ts.

export type Fila = Record<string, unknown>;

// Lo mínimo que se usa de un delegado de Prisma. Cada maestro lo obtiene con `db.<modelo> as unknown as Delegado`.
export type Delegado = {
  findUnique(a: { where: Fila }): Promise<Fila | null>;
  findMany(a: { where?: Fila; orderBy?: Fila; skip?: number; take?: number }): Promise<Fila[]>;
  count(a: { where?: Fila }): Promise<number>;
  create(a: { data: Fila }): Promise<unknown>;
  update(a: { where: Fila; data: Fila }): Promise<unknown>;
  delete(a: { where: Fila }): Promise<unknown>;
  aggregate(a: { _max: Fila }): Promise<{ _max: Fila }>;
};

export type ColumnaMaestro = {
  id: string;
  titulo: string;
  // Campo de la tabla: de él sale el valor y por él se ordena. Sin campo, hay que dar `valor` y la columna no ordena.
  campo?: string;
  valor?: (f: Fila) => unknown;
  alinear?: "derecha";
  oculta?: boolean;
  fija?: boolean;
  formato?: "fecha" | "fechaHora";
  // Dibuja el valor como etiqueta de color.
  etiqueta?: (v: unknown) => { texto: string; tono: Tono };
};

export type FiltroMaestro = {
  id: string;
  etiqueta: string;
  todos: string;
  opciones: { valor: string; etiqueta: string; donde: Fila }[];
};

export type Maestro = {
  // Identifica el listado (cookie de columnas) y la acción del servidor.
  id: string;
  modulo: string;
  // Ruta del listado, sin barra final.
  ruta: string;
  // Nombre de la tabla en el sistema anterior, para la auditoría.
  entidad: string;
  singular: string;
  plural: string;
  genero: "el" | "la";
  delegado: (db: Db) => Delegado;
  clave: { campo: string; numerica?: boolean; autogenerada?: boolean };
  campos: CampoForm[] | ((db: Db) => Promise<CampoForm[]>);
  valoresIniciales?: Valores;
  columnas: ColumnaMaestro[];
  busqueda: { texto: string; campos: string[] };
  filtros?: FiltroMaestro[];
  orden: { columna: string; dir: "asc" | "desc" };
  titulo: (f: Fila) => string;
  descripcion?: (f: Fila) => string;
  // Sin ficha ni edición: solo se consulta.
  soloConsulta?: boolean;
  claveFila?: (f: Fila) => string;
  // Corre antes de guardar: devuelve errores por campo (por ejemplo, un NIT que no existe) o completa datos.
  validar?: (db: Db, datos: Fila, editando: boolean) => Promise<Record<string, string> | null>;
  completar?: (db: Db, datos: Fila) => Promise<Fila>;
  mensajeDependientes?: string;
  mensajeDuplicado?: string;
};

export type Seccion = { slug: string; titulo: string; maestro: Maestro };
export type ModuloMaestros = { modulo: string; secciones: Seccion[] };

export const SINO = [
  { valor: "1", etiqueta: "Sí" },
  { valor: "0", etiqueta: "No" },
];

/** Prisma devuelve Decimal y fechas como objetos: se pasan a algo que la tabla sepa dibujar. */
export function normalizar(v: unknown): string | number | Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "bigint") return Number(v);
  const d = v as { toNumber?: () => number };
  return typeof d.toNumber === "function" ? d.toNumber() : String(v);
}
