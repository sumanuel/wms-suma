import Link from "next/link";
import { Plus } from "lucide-react";
import { Listado } from "@/components/listado/listado";
import { Aviso, Etiqueta, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { listarAjustes, type Fila, type Orden } from "@/lib/inventario/ajustes";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";

const ORIGEN = { manual: { t: "Manual", tono: "marca" }, conteo: { t: "Conteo", tono: "neutro" }, carga: { t: "Carga inicial", tono: "aviso" }, otro: { t: "Otro", tono: "neutro" } } as const;

export default async function Ajustes({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("inventario", "editar");
  const busqueda = await searchParams;
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id, titulo, valor: (f: Fila) => normalizar(f[id]), ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }), ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "inv-ajustes",
    titulo: "Ajustes",
    modulo: "inventario",
    ruta: "/inventario/ajustes",
    elemento: { singular: "ajuste", plural: "ajustes" },
    busqueda: "Buscar por caja, artículo, lote, motivo o documento",
    filtros: [
      { id: "origen", etiqueta: "Origen", todos: "Todos los orígenes", opciones: Object.entries(ORIGEN).map(([k, o]) => ({ valor: k, etiqueta: o.t })) },
      { id: "sentido", etiqueta: "Sentido", todos: "Entradas y salidas", opciones: [{ valor: "entrada", etiqueta: "Solo aumentos" }, { valor: "salida", etiqueta: "Solo disminuciones" }] },
    ],
    orden: { columna: "fecha", dir: "desc" },
    soloLectura: true,
    claveFila: (f) => String(f.id),
    columnas: [
      v("fecha", "Fecha", { fija: true, formato: "fechaHora" }),
      v("caja", "Caja", { valor: (f: Fila) => String(f.caja) }),
      v("articulo", "Artículo"),
      v("lote", "Lote"),
      v("antes", "Saldo antes", { alinear: "derecha", ordenar: undefined }),
      v("entrada", "Entrada", { alinear: "derecha" }),
      v("salida", "Salida", { alinear: "derecha" }),
      v("despues", "Saldo después", { alinear: "derecha", ordenar: undefined }),
      v("origen", "Origen", { ordenar: undefined, valor: (f: Fila) => ORIGEN[f.origen as keyof typeof ORIGEN]?.t ?? "Otro", celda: (f: Fila) => { const o = ORIGEN[f.origen as keyof typeof ORIGEN] ?? ORIGEN.otro; return <Etiqueta tono={o.tono}>{o.t}</Etiqueta>; } }),
      v("motivo", "Motivo", { ordenar: undefined }),
      v("soporte", "Documento", { ordenar: undefined, oculta: true }),
    ],
    cargar: (pedido) => listarAjustes(db, pedido),
  };
  return (
    <div className="flex flex-col gap-4">
      {busqueda.aviso === "creado" ? <Aviso tono="exito">Se registró el ajuste y el saldo de la caja quedó corregido.</Aviso> : null}
      <Listado
        definicion={definicion}
        busqueda={Promise.resolve(busqueda)}
        acciones={
          <Link href="/inventario/ajustes/nuevo" className={clasesBoton("primario")}>
            <Plus className="size-4" aria-hidden />
            Nuevo ajuste
          </Link>
        }
      />
    </div>
  );
}
