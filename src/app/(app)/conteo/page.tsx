import Link from "next/link";
import { Plus } from "lucide-react";
import { textoAviso } from "@/components/ficha";
import { Listado } from "@/components/listado/listado";
import { Aviso, Etiqueta, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { listarConteos, type Fila, type Orden } from "@/lib/conteo/servicio";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";
import { textoEstado, textoTipo, tonoEstado } from "./estados";

export default async function Conteos({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const ctx = await requerirPermiso("conteo", "ver");
  const { db } = ctx;
  const busqueda = await searchParams;
  const aviso = textoAviso(busqueda.aviso, { singular: "conteo" });
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id,
    titulo,
    valor: (f: Fila) => normalizar(f[id]),
    ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }),
    ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "conteos",
    titulo: "Conteos",
    modulo: "conteo",
    ruta: "/conteo",
    elemento: { singular: "conteo", plural: "conteos" },
    busqueda: "Buscar por número, bodega o responsable",
    filtros: [
      { id: "estado", etiqueta: "Estado", todos: "Abiertos y aplicados", opciones: [{ valor: "abierto", etiqueta: "Solo abiertos" }, { valor: "aplicado", etiqueta: "Solo aplicados" }] },
      { id: "bodega", etiqueta: "Bodega", todos: "Todas las bodegas", opciones: () => bodegasConStock(db) },
    ],
    orden: { columna: "id", dir: "desc" },
    soloLectura: true,
    claveFila: (f) => String(f.id),
    enlace: (f) => `/conteo/${f.id}`,
    columnas: [
      v("id", "Número", { fija: true, valor: (f: Fila) => String(f.id) }),
      v("fecha", "Fecha", { formato: "fecha" }),
      v("bodega", "Bodega"),
      v("tipo", "Tipo", { ordenar: undefined, valor: (f: Fila) => textoTipo(f.tipo) }),
      v("realiza", "Responsable"),
      v("lineas", "Cajas", { alinear: "derecha" }),
      v("contadas", "Contadas", { alinear: "derecha", ordenar: undefined }),
      v("diferencias", "Con diferencia", { alinear: "derecha", ordenar: undefined }),
      v("estado", "Estado", { valor: (f: Fila) => textoEstado(f.estado), celda: (f: Fila) => <Etiqueta tono={tonoEstado(f.estado)}>{textoEstado(f.estado)}</Etiqueta> }),
    ],
    cargar: (pedido) => listarConteos(db, pedido),
  };
  return (
    <div className="flex flex-col gap-4">
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}
      <Listado
        definicion={definicion}
        busqueda={Promise.resolve(busqueda)}
        acciones={
          tienePermiso(ctx, "conteo", "crear") ? (
            <Link href="/conteo/nuevo" className={clasesBoton("primario")}>
              <Plus className="size-4" aria-hidden />
              Programar conteo
            </Link>
          ) : null
        }
      />
    </div>
  );
}
