import { Listado } from "@/components/listado/listado";
import { requerirPermiso } from "@/lib/dal";
import { bodegasConStock, existenciasPorArticulo, type Fila, type Orden } from "@/lib/inventario/consultas";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";

export default async function Existencias({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("inventario", "ver");
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id,
    titulo,
    valor: (f: Fila) => normalizar(f[id]),
    ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }),
    ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "inv-existencias",
    titulo: "Existencias",
    modulo: "inventario",
    ruta: "/inventario",
    elemento: { singular: "artículo", plural: "artículos" },
    busqueda: "Buscar por código de barras, descripción o referencia",
    filtros: [{ id: "bodega", etiqueta: "Bodega", todos: "Todas las bodegas", opciones: () => bodegasConStock(db) }],
    orden: { columna: "descripcion", dir: "asc" },
    soloLectura: true,
    claveFila: (f) => String(f.ean),
    enlace: (f) => `/inventario/cajas?q=${encodeURIComponent(String(f.ean))}`,
    columnas: [
      v("descripcion", "Descripción", { fija: true }),
      v("ean", "Código de barras"),
      v("unidad", "Unidad", { ordenar: undefined }),
      v("cajas", "Cajas", { alinear: "derecha" }),
      v("lotes", "Lotes", { alinear: "derecha", ordenar: undefined }),
      v("saldo", "Saldo", { alinear: "derecha" }),
      v("reserva", "Reservado", { alinear: "derecha" }),
      v("disponible", "Disponible", { alinear: "derecha", ordenar: undefined }),
    ],
    cargar: (pedido) => existenciasPorArticulo(db, pedido),
  };
  return <Listado definicion={definicion} busqueda={searchParams} />;
}
