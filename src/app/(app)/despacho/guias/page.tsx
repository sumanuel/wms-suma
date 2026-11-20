import { textoAviso } from "@/components/ficha";
import { Listado } from "@/components/listado/listado";
import { Aviso, Etiqueta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { listarGuias, type Fila, type Orden } from "@/lib/despacho/servicio";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";
import { ESTADOS_GUIA, estadoDeFila } from "../estados";

export default async function Guias({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("despacho", "ver");
  const busqueda = await searchParams;
  const aviso = textoAviso(busqueda.aviso, { singular: "guía" }, "la");
  const transportadores = (await db.transportador.findMany({ select: { transportador: true }, orderBy: { transportador: "asc" } })).map((t) => ({ valor: t.transportador, etiqueta: t.transportador }));
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id, titulo, valor: (f: Fila) => normalizar(f[id]), ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }), ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "guias",
    titulo: "Guías",
    modulo: "despacho",
    ruta: "/despacho/guias",
    elemento: { singular: "guía", plural: "guías" },
    busqueda: "Buscar por guía, pedido, destinatario o factura",
    filtros: [
      { id: "estado", etiqueta: "Estado", todos: "Todos los estados", opciones: Object.entries(ESTADOS_GUIA).map(([k, e]) => ({ valor: k, etiqueta: e.texto })) },
      { id: "transportador", etiqueta: "Transportador", todos: "Todos los transportadores", opciones: transportadores },
    ],
    orden: { columna: "fecha", dir: "desc" },
    soloLectura: true,
    claveFila: (f) => String(f.id),
    enlace: (f) => `/despacho/guias/${f.id}`,
    columnas: [
      v("guia", "Guía", { fija: true }),
      v("fecha", "Fecha", { formato: "fechaHora" }),
      v("transportador", "Transportador"),
      v("pedido", "Pedido"),
      v("destinatario", "Destinatario"),
      v("ciudad", "Ciudad", { ordenar: undefined, oculta: true }),
      v("unidades", "Unidades", { alinear: "derecha" }),
      v("kilos", "Peso", { alinear: "derecha", ordenar: undefined, oculta: true }),
      v("total", "Flete", { alinear: "derecha" }),
      v("factura", "Factura", { ordenar: undefined, oculta: true }),
      v("estado", "Estado", { ordenar: undefined, valor: (f: Fila) => ESTADOS_GUIA[estadoDeFila(f as never)].texto, celda: (f: Fila) => { const e = ESTADOS_GUIA[estadoDeFila(f as never)]; return <Etiqueta tono={e.tono}>{e.texto}</Etiqueta>; } }),
    ],
    cargar: (pedido) => listarGuias(db, pedido),
  };
  return (
    <div className="flex flex-col gap-4">
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}
      <Listado definicion={definicion} busqueda={Promise.resolve(busqueda)} />
    </div>
  );
}
