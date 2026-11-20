import Link from "next/link";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { pickingsPendientes } from "@/lib/movil/servicio";
import { CabeceraMovil } from "../cabecera";

export default async function PickingMovil() {
  const { db } = await requerirPermiso("prepacking", "editar");
  const lista = await pickingsPendientes(db);
  return (
    <>
      <CabeceraMovil titulo="Picking" texto="Elige un picking listo para pickear." />
      {lista.length === 0 ? <p className="text-sm text-gris-500">No hay pickings pendientes.</p> : null}
      <div className="flex flex-col gap-3">
        {lista.map((p) => (
          <Link key={String(p.id)} href={`/movil/picking/${p.id}`}>
            <Tarjeta className="flex items-center justify-between gap-3 p-4 hover:bg-hover">
              <span className="flex flex-col"><span className="text-base font-bold">Picking {String(p.id)}</span><span className="text-[13px] text-gris-500">Pedido {String(p.pedido ?? "—")} · bodega {String(p.bodega ?? "—")}</span></span>
              <span className="text-sm font-semibold tabular-nums">{String(p.pickeadas)} / {String(p.lineas)}</span>
            </Tarjeta>
          </Link>
        ))}
      </div>
    </>
  );
}
