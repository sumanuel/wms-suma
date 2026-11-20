import Link from "next/link";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { ordenesPorRecibir } from "@/lib/compras/ordenes";
import { CabeceraMovil } from "../cabecera";

export default async function RecepcionMovil() {
  const { db } = await requerirPermiso("inventario", "crear");
  const ordenes = await ordenesPorRecibir(db);
  return (
    <>
      <CabeceraMovil titulo="Recibir" texto="Elige la orden de compra que estás recibiendo." />
      {ordenes.length === 0 ? <p className="text-sm text-gris-500">No hay órdenes de compra por recibir.</p> : null}
      <div className="flex flex-col gap-3">
        {ordenes.map((o) => (
          <Link key={String(o.numero)} href={`/movil/recepcion/${o.numero}`}>
            <Tarjeta className="flex items-center justify-between gap-3 p-4 hover:bg-hover">
              <span className="flex flex-col"><span className="text-base font-bold">Orden {String(o.numero)}</span><span className="text-[13px] text-gris-500">{String(o.proveedor ?? "—")} · bodega {String(o.bodega ?? "—")}</span></span>
              <span className="text-sm font-semibold tabular-nums">faltan {new Intl.NumberFormat("es-CO").format(Number(o.pendiente))}</span>
            </Tarjeta>
          </Link>
        ))}
      </div>
    </>
  );
}
