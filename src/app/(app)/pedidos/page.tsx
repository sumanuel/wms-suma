import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { textoAviso } from "@/components/ficha";
import { Listado } from "@/components/listado/listado";
import { Aviso, Etiqueta, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { ESTADOS_PEDIDO, infoEstado } from "@/lib/pedidos/estados";
import { listarPedidos, type Fila, type Orden } from "@/lib/pedidos/servicio";
import { normalizar } from "@/lib/maestros/tipos";
import type { Busqueda, Definicion } from "@/lib/listados";

export default async function Pedidos({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const ctx = await requerirPermiso("pedidos", "ver");
  const busqueda = await searchParams;
  const aviso = textoAviso(busqueda.aviso, { singular: "pedido" });
  const v = (id: string, titulo: string, extra: Partial<Definicion<Fila, Orden>["columnas"][number]> = {}) => ({
    id, titulo, valor: (f: Fila) => normalizar(f[id]), ordenar: (dir: "asc" | "desc") => ({ columna: id, dir }), ...extra,
  });
  const definicion: Definicion<Fila, Orden> = {
    id: "pedidos",
    titulo: "Pedidos",
    modulo: "pedidos",
    ruta: "/pedidos",
    elemento: { singular: "pedido", plural: "pedidos" },
    busqueda: "Buscar por número, cliente u orden de compra",
    filtros: [
      {
        id: "estado", etiqueta: "Estado", todos: "Todos los estados",
        opciones: Object.entries(ESTADOS_PEDIDO).filter(([k]) => k !== "0").map(([k, e]) => ({ valor: k, etiqueta: e.texto })),
      },
      { id: "pendiente", etiqueta: "Pendiente", todos: "Con y sin pendiente", opciones: [{ valor: "si", etiqueta: "Con unidades pendientes" }] },
      { id: "vence", etiqueta: "Vencimiento", todos: "Cualquier vencimiento", opciones: [{ valor: "vencidos", etiqueta: "Vencidos sin despachar" }] },
    ],
    orden: { columna: "fecha", dir: "desc" },
    soloLectura: true,
    claveFila: (f) => String(f.numero),
    enlace: (f) => `/pedidos/${encodeURIComponent(String(f.numero))}`,
    columnas: [
      v("numero", "Pedido", { fija: true }),
      v("fecha", "Fecha", { formato: "fecha" }),
      v("cliente", "Cliente", { valor: (f: Fila) => normalizar(f.cliente ?? f.nit) }),
      v("sede", "Sede", { ordenar: undefined, oculta: true }),
      v("vence", "Vence", { formato: "fecha" }),
      v("lineas", "Líneas", { alinear: "derecha" }),
      v("pedido", "Pedido (und.)", { alinear: "derecha" }),
      v("entregado", "Entregado", { alinear: "derecha", ordenar: undefined }),
      v("reservado", "Reservado", { alinear: "derecha", ordenar: undefined }),
      v("pendiente", "Pendiente", { alinear: "derecha" }),
      v("ocompra", "Orden de compra", { ordenar: undefined, oculta: true }),
      v("estado", "Estado", { valor: (f: Fila) => infoEstado(f.estado).texto, celda: (f: Fila) => <Etiqueta tono={infoEstado(f.estado).tono}>{infoEstado(f.estado).texto}</Etiqueta> }),
    ],
    cargar: (pedido) => listarPedidos(ctx.db, pedido),
  };
  return (
    <div className="flex flex-col gap-4">
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}
      <Listado
        definicion={definicion}
        busqueda={Promise.resolve(busqueda)}
        acciones={tienePermiso(ctx, "pedidos", "crear") ? (
          <>
            <Link href="/pedidos/importar" className={clasesBoton("secundario")}>
              <Upload className="size-4" aria-hidden />
              Importar
            </Link>
            <Link href="/pedidos/nuevo" className={clasesBoton("primario")}>
              <Plus className="size-4" aria-hidden />
              Nuevo pedido
            </Link>
          </>
        ) : null}
      />
    </div>
  );
}
