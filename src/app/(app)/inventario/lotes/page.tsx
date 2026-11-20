import { Etiqueta } from "@/components/ui";
import { Listado } from "@/components/listado/listado";
import { textoAviso } from "@/components/ficha";
import { Aviso } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { lotes, type Fila, type Orden } from "@/lib/inventario/consultas";
import { normalizar } from "@/lib/maestros/tipos";
import { tonoEstado } from "../estados";
import type { Busqueda, Definicion } from "@/lib/listados";

export default async function Lotes({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("inventario", "ver");
  const busqueda = await searchParams;
  const aviso = busqueda.aviso === "estado" ? "Se cambió el estado de calidad del lote." : textoAviso(busqueda.aviso, { singular: "lote" });
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id,
    titulo,
    valor: (f: Fila) => normalizar(f[id]),
    ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }),
    ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "inv-lotes",
    titulo: "Lotes",
    modulo: "inventario",
    ruta: "/inventario/lotes",
    elemento: { singular: "lote", plural: "lotes" },
    busqueda: "Buscar por lote, artículo, proveedor o control de liberación",
    filtros: [
      {
        id: "estado",
        etiqueta: "Estado de calidad",
        todos: "Todos los estados",
        opciones: [
          { valor: "aprobado", etiqueta: "Aprobado" },
          { valor: "cuarentena", etiqueta: "Cuarentena" },
          { valor: "rechazado", etiqueta: "Rechazado" },
          { valor: "sin", etiqueta: "Sin estado" },
        ],
      },
      {
        id: "vence",
        etiqueta: "Vencimiento",
        todos: "Cualquier vencimiento",
        opciones: [
          { valor: "vencidos", etiqueta: "Vencidos" },
          { valor: "30", etiqueta: "Vencen en 30 días" },
        ],
      },
      { id: "saldo", etiqueta: "Saldo", todos: "Con y sin saldo", opciones: [{ valor: "con", etiqueta: "Solo con saldo" }] },
    ],
    orden: { columna: "ingreso", dir: "desc" },
    soloLectura: true,
    claveFila: (f) => String(f.idlote),
    enlace: (f) => `/inventario/lotes/${f.idlote}`,
    columnas: [
      v("lote", "Lote", { fija: true }),
      v("descripcion", "Artículo"),
      v("ean", "Código de barras", { oculta: true }),
      v("proveedor", "Proveedor", { ordenar: undefined, oculta: true }),
      v("ingreso", "Ingreso", { formato: "fecha" }),
      v("vence", "Vence", { formato: "fecha" }),
      v("cajas", "Cajas", { alinear: "derecha" }),
      v("saldo", "Saldo", { alinear: "derecha" }),
      v("control", "Control de liberación", { ordenar: undefined, oculta: true }),
      v("estado", "Calidad", {
        celda: (f) => (f.estado ? <Etiqueta tono={tonoEstado(String(f.estado))}>{String(f.estado)}</Etiqueta> : <span className="text-gris-500">Sin estado</span>),
      }),
    ],
    cargar: (pedido) => lotes(db, pedido),
  };
  return (
    <div className="flex flex-col gap-4">
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}
      <Listado definicion={definicion} busqueda={Promise.resolve(busqueda)} />
    </div>
  );
}
