import { Listado } from "@/components/listado/listado";
import { Etiqueta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { infoEstadoPicking } from "@/lib/picking/estados";
import { listarPickings, type Fila, type Orden } from "@/lib/picking/servicio";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";

// Lista de pickings en una etapa (valida): 3 por pickear, 5 pickeados (listos para la aduana).
export async function ListaPrepacking({ valida, ruta, busqueda }: { valida: number; ruta: string; busqueda: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("prepacking", "ver");
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id, titulo, valor: (f: Fila) => normalizar(f[id]), ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }), ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: `prepacking-${valida}`,
    titulo: "Pickings",
    modulo: "prepacking",
    ruta,
    elemento: { singular: "picking", plural: "pickings" },
    busqueda: "Buscar por número, pedido, cliente o pickeador",
    filtros: [{ id: "bodega", etiqueta: "Bodega", todos: "Todas las bodegas", opciones: () => bodegasConStock(db) }],
    orden: { columna: "numero", dir: "asc" },
    soloLectura: true,
    claveFila: (f) => String(f.numero),
    enlace: (f) => `/prepacking/${f.numero}`,
    columnas: [
      v("numero", "Picking", { fija: true, valor: (f: Fila) => String(f.numero) }),
      v("fecha", "Fecha", { formato: "fechaHora" }),
      v("pedido", "Pedido"),
      v("cliente", "Cliente"),
      v("bodega", "Bodega"),
      v("pickeador", "Pickeador", { ordenar: undefined, oculta: true }),
      v("avance", "Avance", { ordenar: undefined, valor: (f: Fila) => `${f.ejecutadas} de ${f.lineas}` }),
      v("unidades", "Unidades", { alinear: "derecha" }),
      v("estado", "Estado", { valor: (f: Fila) => infoEstadoPicking(f.estado).texto, celda: (f: Fila) => <Etiqueta tono={infoEstadoPicking(f.estado).tono}>{infoEstadoPicking(f.estado).texto}</Etiqueta> }),
    ],
    cargar: (pedido) => listarPickings(db, pedido, valida),
  };
  return <Listado definicion={definicion} busqueda={busqueda} />;
}
