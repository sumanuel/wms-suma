import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { formatearFecha } from "@/lib/indicadores/formato";
import { listarTareas } from "@/lib/resurtido/servicio";
import { resurtirCaja } from "../acciones";
import { CabeceraMovil } from "../cabecera";
import { Escaner } from "../escaner";

export default async function ResurtidoMovil() {
  const { db } = await requerirPermiso("inventario", "editar");
  const tareas = await listarTareas(db, "pendiente");
  const t = tareas[0];
  async function hacer(_p: { error?: string; aviso?: string }, form: FormData) {
    "use server";
    return resurtirCaja(Number(t?.id), {}, form);
  }
  return (
    <>
      <CabeceraMovil titulo="Resurtido" texto={`${tareas.length} tarea${tareas.length === 1 ? "" : "s"} pendiente${tareas.length === 1 ? "" : "s"}, en orden de ruta.`} />
      {!t ? <p className="text-sm text-gris-500">No hay tareas de resurtido pendientes.</p> : (
        <>
          <Tarjeta className="flex flex-col gap-1 p-4">
            <p className="text-xs font-semibold uppercase text-gris-500">Toma la caja {String(t.caja)} de</p>
            <p className="text-3xl font-extrabold tracking-tight">{String(t.origen ?? "—")}</p>
            <p className="font-semibold">{String(t.articulo ?? t.ean)}</p>
            <p className="text-sm text-gris-500">Lote {String(t.lote ?? "—")}{t.vence instanceof Date && t.vence.getUTCFullYear() < 2999 ? ` · vence ${formatearFecha(t.vence)}` : ""} · {new Intl.NumberFormat("es-CO").format(Number(t.cantidad))} unidades</p>
            <p className="mt-2 text-xs font-semibold uppercase text-gris-500">Llévala a</p>
            <p className="text-3xl font-extrabold tracking-tight text-marca-texto">{String(t.destino)}</p>
          </Tarjeta>
          <Tarjeta className="p-4">
            <Escaner key={String(t.id)} accion={hacer} boton="Confirmar resurtido" campos={[{ name: "caja", etiqueta: "Lee la caja", inputMode: "numeric" }, { name: "ubicacion", etiqueta: "Lee la ubicación de picking" }]} />
          </Tarjeta>
        </>
      )}
    </>
  );
}
