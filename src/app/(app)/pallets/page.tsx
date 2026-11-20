import Link from "next/link";
import { Plus } from "lucide-react";
import { textoAviso } from "@/components/ficha";
import { Listado } from "@/components/listado/listado";
import { Aviso, Etiqueta, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { listarPallets, type Fila, type Orden } from "@/lib/pallets/servicio";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";

export default async function Pallets({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const ctx = await requerirPermiso("pallets", "ver");
  const { db } = ctx;
  const busqueda = await searchParams;
  const aviso = textoAviso(busqueda.aviso, { singular: "pallet" });
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id, titulo, valor: (f: Fila) => normalizar(f[id]), ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }), ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "pallets", titulo: "Pallets", modulo: "pallets", ruta: "/pallets",
    elemento: { singular: "pallet", plural: "pallets" },
    busqueda: "Buscar por pallet, caja, ubicación, artículo o lote",
    filtros: [{ id: "estado", etiqueta: "Estado", todos: "Abiertos y cerrados", opciones: [{ valor: "abierto", etiqueta: "Solo abiertos" }, { valor: "cerrado", etiqueta: "Solo cerrados" }] }],
    orden: { columna: "numero", dir: "desc" }, soloLectura: true,
    claveFila: (f) => String(f.numero), enlace: (f) => `/pallets/${f.numero}`,
    columnas: [
      v("numero", "Pallet", { fija: true, valor: (f: Fila) => String(f.numero) }),
      v("cajas", "Cajas", { alinear: "derecha" }),
      v("unidades", "Unidades", { alinear: "derecha" }),
      v("ubicacion", "Ubicación", { valor: (f: Fila) => (Number(f.ubicaciones) > 1 ? "Varias" : String(f.ubicacion ?? "—")) }),
      v("fecha", "Creado", { formato: "fecha" }),
      v("estado", "Estado", { ordenar: undefined, valor: (f: Fila) => (Number(f.estado) > 0 ? "Cerrado" : "Abierto"), celda: (f: Fila) => <Etiqueta tono={Number(f.estado) > 0 ? "neutro" : "exito"}>{Number(f.estado) > 0 ? "Cerrado" : "Abierto"}</Etiqueta> }),
    ],
    cargar: (pedido) => listarPallets(db, pedido),
  };
  return (
    <div className="flex flex-col gap-4">
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}
      <Listado definicion={definicion} busqueda={Promise.resolve(busqueda)}
        acciones={tienePermiso(ctx, "pallets", "crear") ? <Link href="/pallets/nuevo" className={clasesBoton("primario")}><Plus className="size-4" aria-hidden />Nuevo pallet</Link> : undefined} />
    </div>
  );
}
