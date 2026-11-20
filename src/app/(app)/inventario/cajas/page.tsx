import Link from "next/link";
import { Etiqueta } from "@/components/ui";
import { Listado } from "@/components/listado/listado";
import { requerirPermiso } from "@/lib/dal";
import { bodegasConStock, cajasConSaldo, type Fila, type Orden } from "@/lib/inventario/consultas";
import { normalizar } from "@/lib/maestros/tipos";
import { tonoEstado } from "../estados";
import type { Busqueda, Definicion } from "@/lib/listados";

export default async function Cajas({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("inventario", "ver");
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id,
    titulo,
    valor: (f: Fila) => normalizar(f[id]),
    ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }),
    ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "inv-cajas",
    titulo: "Cajas",
    modulo: "inventario",
    ruta: "/inventario/cajas",
    elemento: { singular: "caja", plural: "cajas" },
    busqueda: "Buscar por caja, artículo, lote o ubicación",
    filtros: [
      { id: "bodega", etiqueta: "Bodega", todos: "Todas las bodegas", opciones: () => bodegasConStock(db) },
      {
        id: "estado",
        etiqueta: "Estado de calidad",
        todos: "Todos los estados",
        opciones: [
          { valor: "aprobado", etiqueta: "Aprobado" },
          { valor: "cuarentena", etiqueta: "Cuarentena" },
          { valor: "rechazado", etiqueta: "Rechazado" },
        ],
      },
      {
        id: "vence",
        etiqueta: "Vencimiento",
        todos: "Cualquier vencimiento",
        opciones: [
          { valor: "vencidas", etiqueta: "Vencidas" },
          { valor: "30", etiqueta: "Vencen en 30 días" },
        ],
      },
    ],
    orden: { columna: "vence", dir: "asc" },
    soloLectura: true,
    claveFila: (f) => String(f.caja),
    columnas: [
      v("caja", "Caja", { fija: true, valor: (f: Fila) => String(f.caja) }),
      v("descripcion", "Artículo"),
      v("ean", "Código de barras"),
      v("lote", "Lote"),
      v("ubicacion", "Ubicación"),
      v("bodega", "Bodega"),
      v("saldo", "Saldo", { alinear: "derecha" }),
      v("reserva", "Reservado", { alinear: "derecha", ordenar: undefined }),
      v("vence", "Vence", { formato: "fecha" }),
      v("estado", "Calidad", {
        celda: (f) => (f.estado ? <Etiqueta tono={tonoEstado(String(f.estado))}>{String(f.estado)}</Etiqueta> : <span className="text-gris-500">—</span>),
      }),
    ],
    cargar: (pedido) => cajasConSaldo(db, pedido),
  };
  return (
    <>
      <Listado definicion={definicion} busqueda={searchParams} />
      <p className="text-[13px] text-gris-500">
        Se muestran las cajas ubicadas con saldo. Para ver o cambiar el estado de calidad, abre el lote en la pestaña{" "}
        <Link href="/inventario/lotes" className="font-medium text-marca-texto hover:underline">
          Lotes
        </Link>
        .
      </p>
    </>
  );
}
