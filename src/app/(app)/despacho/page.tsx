import { Listado } from "@/components/listado/listado";
import { requerirPermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { listarPorDespachar, type Fila, type Orden } from "@/lib/despacho/servicio";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";

export default async function PorDespachar({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("despacho", "ver");
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id, titulo, valor: (f: Fila) => normalizar(f[id]), ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }), ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "por-despachar",
    titulo: "Por despachar",
    modulo: "despacho",
    ruta: "/despacho",
    elemento: { singular: "picking", plural: "pickings" },
    busqueda: "Buscar por número, pedido o cliente",
    filtros: [{ id: "bodega", etiqueta: "Bodega", todos: "Todas las bodegas", opciones: () => bodegasConStock(db) }],
    orden: { columna: "fecha", dir: "asc" },
    soloLectura: true,
    claveFila: (f) => String(f.numero),
    enlace: (f) => `/despacho/despachar/${f.numero}`,
    columnas: [
      v("numero", "Picking", { fija: true, valor: (f: Fila) => String(f.numero) }),
      v("fecha", "Fecha", { formato: "fechaHora" }),
      v("pedido", "Pedido"),
      v("cliente", "Cliente"),
      v("bodega", "Bodega"),
      v("transportador", "Transportador", { ordenar: undefined }),
      v("cajas", "Cajas", { alinear: "derecha" }),
      v("unidades", "Unidades", { alinear: "derecha" }),
      v("kilos", "Peso", { alinear: "derecha", ordenar: undefined, oculta: true }),
    ],
    cargar: (pedido) => listarPorDespachar(db, pedido),
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] text-gris-500">Pickings con la aduana terminada que todavía no tienen guía. Abre uno para despacharlo.</p>
      <Listado definicion={definicion} busqueda={searchParams} />
    </div>
  );
}
