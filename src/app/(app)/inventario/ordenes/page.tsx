import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Listado } from "@/components/listado/listado";
import { Etiqueta, clasesBoton, type Tono } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { ESTADOS, listarOrdenes } from "@/lib/compras/ordenes";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";

type Fila = Record<string, unknown>;
type Orden = { columna: string; dir: "asc" | "desc" };
const TONO: Record<string, Tono> = { Abierta: "aviso", Parcial: "marca", Cerrada: "exito", Anulada: "neutro" };

export default async function Ordenes({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const ctx = await requerirPermiso("inventario", "ver");
  const busqueda = await searchParams;
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id, titulo, valor: (f: Fila) => normalizar(f[id]), ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }), ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "ordenes-compra", titulo: "Órdenes de compra", modulo: "inventario", ruta: "/inventario/ordenes",
    elemento: { singular: "orden de compra", plural: "órdenes de compra" },
    busqueda: "Buscar por número, proveedor u observaciones",
    filtros: [{ id: "estado", etiqueta: "Estado", todos: "Todos los estados", opciones: Object.values(ESTADOS).map((e) => ({ valor: e, etiqueta: e })) }],
    orden: { columna: "numero", dir: "desc" }, soloLectura: true,
    claveFila: (f) => String(f.numero), enlace: (f) => `/inventario/ordenes/${f.numero}`,
    columnas: [
      v("numero", "Orden", { fija: true, valor: (f: Fila) => String(f.numero) }),
      v("fecha", "Fecha", { formato: "fecha" }),
      v("proveedor", "Proveedor", { valor: (f: Fila) => String(f.proveedor ?? f.nit ?? "") }),
      v("bodega", "Bodega", { ordenar: undefined }),
      v("lineas", "Líneas", { alinear: "derecha", ordenar: undefined }),
      v("pedido", "Pedido", { alinear: "derecha" }),
      v("recibido", "Recibido", { alinear: "derecha", ordenar: undefined }),
      v("estado", "Estado", { valor: (f: Fila) => String(f.estado ?? ""), celda: (f: Fila) => <Etiqueta tono={TONO[String(f.estado)] ?? "neutro"}>{String(f.estado ?? "—")}</Etiqueta> }),
    ],
    cargar: (pedido) => listarOrdenes(ctx.db, pedido),
  };
  const crear = tienePermiso(ctx, "inventario", "crear");
  return (
    <Listado definicion={definicion} busqueda={Promise.resolve(busqueda)} acciones={crear ? (
      <>
        <Link href="/inventario/ordenes/importar" className={clasesBoton("secundario")}><Upload className="size-4" aria-hidden />Importar</Link>
        <Link href="/inventario/ordenes/nueva" className={clasesBoton("primario")}><Plus className="size-4" aria-hidden />Nueva orden</Link>
      </>
    ) : undefined} />
  );
}
