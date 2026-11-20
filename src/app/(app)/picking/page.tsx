import { textoAviso } from "@/components/ficha";
import { Listado } from "@/components/listado/listado";
import { Aviso, Etiqueta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { ESTADOS_PICKING, infoEstadoPicking } from "@/lib/picking/estados";
import { listarPickings, type Fila, type Orden } from "@/lib/picking/servicio";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";

export default async function Pickings({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("picking", "ver");
  const busqueda = await searchParams;
  const aviso = textoAviso(busqueda.aviso, { singular: "picking" });
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id, titulo, valor: (f: Fila) => normalizar(f[id]), ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }), ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "pickings",
    titulo: "Pickings",
    modulo: "picking",
    ruta: "/picking",
    elemento: { singular: "picking", plural: "pickings" },
    busqueda: "Buscar por número, pedido, cliente o pickeador",
    filtros: [
      { id: "estado", etiqueta: "Estado", todos: "Todos los estados", opciones: Object.entries(ESTADOS_PICKING).filter(([k]) => k !== "0").map(([k, e]) => ({ valor: k, etiqueta: e.texto })) },
      { id: "bodega", etiqueta: "Bodega", todos: "Todas las bodegas", opciones: () => bodegasConStock(db) },
    ],
    orden: { columna: "numero", dir: "desc" },
    soloLectura: true,
    claveFila: (f) => String(f.numero),
    enlace: (f) => `/picking/${f.numero}`,
    columnas: [
      v("numero", "Picking", { fija: true, valor: (f: Fila) => String(f.numero) }),
      v("fecha", "Fecha", { formato: "fechaHora" }),
      v("pedido", "Pedido"),
      v("cliente", "Cliente"),
      v("bodega", "Bodega"),
      v("pickeador", "Pickeador", { ordenar: undefined, oculta: true }),
      v("lineas", "Líneas", { alinear: "derecha" }),
      v("unidades", "Unidades", { alinear: "derecha" }),
      v("ubicaciones", "Ubicaciones", { alinear: "derecha", ordenar: undefined, oculta: true }),
      v("estado", "Estado", { valor: (f: Fila) => infoEstadoPicking(f.estado).texto, celda: (f: Fila) => <Etiqueta tono={infoEstadoPicking(f.estado).tono}>{infoEstadoPicking(f.estado).texto}</Etiqueta> }),
    ],
    cargar: (pedido) => listarPickings(db, pedido),
  };
  return (
    <div className="flex flex-col gap-4">
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}
      <Listado definicion={definicion} busqueda={Promise.resolve(busqueda)} />
    </div>
  );
}
