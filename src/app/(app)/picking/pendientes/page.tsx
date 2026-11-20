import { Listado } from "@/components/listado/listado";
import { Etiqueta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { pedidosListos, type Fila, type Orden } from "@/lib/picking/servicio";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";

export default async function PedidosListos({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("picking", "ver");
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id, titulo, valor: (f: Fila) => normalizar(f[id]), ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }), ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "pedidos-listos",
    titulo: "Pedidos listos para picking",
    modulo: "picking",
    ruta: "/picking/pendientes",
    elemento: { singular: "pedido", plural: "pedidos" },
    busqueda: "Buscar por número de pedido o cliente",
    filtros: [{ id: "bodega", etiqueta: "Bodega", todos: "Todas las bodegas", opciones: () => bodegasConStock(db) }],
    orden: { columna: "fecha", dir: "asc" },
    soloLectura: true,
    claveFila: (f) => String(f.numero),
    enlace: (f) => `/picking/generar/${encodeURIComponent(String(f.numero))}`,
    columnas: [
      v("numero", "Pedido", { fija: true }),
      v("fecha", "Fecha", { formato: "fecha" }),
      v("vence", "Vence", { formato: "fecha" }),
      v("cliente", "Cliente"),
      v("bodega", "Bodega", { ordenar: undefined, valor: (f: Fila) => (Number(f.bodegas) > 1 ? `${f.bodega} y otras` : normalizar(f.bodega)) }),
      v("lineas", "Líneas", { alinear: "derecha", ordenar: undefined }),
      v("pendiente", "Pendiente", { alinear: "derecha" }),
      v("cubierto", "Se puede cubrir", { alinear: "derecha", ordenar: undefined }),
      v("cobertura", "Cobertura", {
        ordenar: undefined,
        valor: (f: Fila) => (Number(f.pendiente) > 0 ? Math.round((Number(f.cubierto) / Number(f.pendiente)) * 100) : 0),
        celda: (f: Fila) => {
          const pct = Number(f.pendiente) > 0 ? Math.round((Number(f.cubierto) / Number(f.pendiente)) * 100) : 0;
          return <Etiqueta tono={pct >= 100 ? "exito" : pct > 0 ? "aviso" : "error"}>{pct}%</Etiqueta>;
        },
      }),
    ],
    cargar: (pedido) => pedidosListos(db, pedido),
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13.5px] text-gris-500">Pedidos aprobados que todavía no tienen picking. Abre uno para ver lo que se puede cubrir y generar su picking.</p>
      <Listado definicion={definicion} busqueda={searchParams} />
    </div>
  );
}
