import { Listado } from "@/components/listado/listado";
import { requerirPermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { listarAduana, type Fila, type Orden } from "@/lib/aduana/servicio";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";

export async function ListaAduana({ valida, ruta, busqueda }: { valida: number; ruta: string; busqueda: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("aduana", "ver");
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id, titulo, valor: (f: Fila) => normalizar(f[id]), ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }), ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: `aduana-${valida}`,
    titulo: "Pickings",
    modulo: "aduana",
    ruta,
    elemento: { singular: "picking", plural: "pickings" },
    busqueda: "Buscar por número, pedido, cliente o pickeador",
    filtros: [{ id: "bodega", etiqueta: "Bodega", todos: "Todas las bodegas", opciones: () => bodegasConStock(db) }],
    orden: { columna: "numero", dir: "asc" },
    soloLectura: true,
    claveFila: (f) => String(f.numero),
    enlace: (f) => `/aduana/${f.numero}`,
    columnas: [
      v("numero", "Picking", { fija: true, valor: (f: Fila) => String(f.numero) }),
      v("fecha", "Fecha", { formato: "fechaHora" }),
      v("pedido", "Pedido"),
      v("cliente", "Cliente"),
      v("bodega", "Bodega"),
      v("pickeado", "Pickeado", { alinear: "derecha" }),
      v("empacado", "Empacado", { alinear: "derecha", ordenar: undefined }),
      v("cajas", "Cajas", { alinear: "derecha" }),
    ],
    cargar: (pedido) => listarAduana(db, pedido, valida),
  };
  return <Listado definicion={definicion} busqueda={busqueda} />;
}
