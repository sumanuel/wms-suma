import Link from "next/link";
import { redirect } from "next/navigation";
import { Aviso, Tarjeta, claseControl, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { leerSsccPallet } from "@/lib/etiquetas/codigos";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { listarPalletsDespacho } from "@/lib/pallets/despacho";
import { nuevoPalletMovil } from "../acciones";
import { CabeceraMovil } from "../cabecera";
import { Escaner } from "../escaner";

export default async function DespachoMovil({ searchParams }: { searchParams: Promise<{ pallet?: string }> }) {
  const ctx = await requerirPermiso("pallets", "editar");
  const q = await searchParams;
  const t = (q.pallet ?? "").trim();
  let aviso: string | null = null;
  if (t) {
    const id = /^\d{1,9}$/.test(t) ? Number(t) : leerSsccPallet(t);
    if (id) redirect(`/movil/despacho/${id}`);
    aviso = "Lee la etiqueta del pallet de despacho o escribe su número.";
  }
  const [filas, bodegas] = await Promise.all([listarPalletsDespacho(ctx.db), bodegasConStock(ctx.db)]);
  const abiertos = filas.filter((p) => p.estado === "abierto" || p.estado === "cerrado");
  return (
    <>
      <CabeceraMovil titulo="Cargar pallets de despacho" texto="Lee el SSCC de cada caja de despacho para cargarla al pallet." />
      <Tarjeta className="p-4">
        <form method="get" className="flex flex-col gap-3">
          <input name="pallet" required autoFocus inputMode="numeric" autoComplete="off" aria-label="Pallet de despacho" placeholder="Lee el pallet" className={`${claseControl} h-12 text-lg`} />
          <button type="submit" className={clasesBoton("secundario", "h-12 text-base")}>Abrir pallet</button>
        </form>
      </Tarjeta>
      {aviso ? <Aviso tono="error">{aviso}</Aviso> : null}
      {tienePermiso(ctx, "pallets", "crear") ? (
        <Tarjeta className="flex flex-col gap-3 p-4">
          <h2 className="text-base font-bold">Nuevo pallet</h2>
          <Escaner accion={nuevoPalletMovil} boton="Crear pallet" refrescar={false} campos={[{ name: "bodega", etiqueta: "Bodega", opciones: bodegas.map((b) => b.valor) }]} />
        </Tarjeta>
      ) : null}
      {abiertos.length > 0 ? (
        <Tarjeta className="p-4">
          <h2 className="mb-2 text-base font-bold">Pendientes de despachar</h2>
          <ul className="flex flex-col">
            {abiertos.map((p) => (
              <li key={String(p.id)} className="border-b border-linea py-2 last:border-0">
                <Link href={`/movil/despacho/${p.id}`} className="flex items-center justify-between gap-3">
                  <span className="flex flex-col"><span className="font-semibold">Pallet {String(p.id)}</span><span className="text-xs text-gris-500">{String(p.bodega)} · {p.estado === "abierto" ? "Abierto" : "Cerrado"} · {Number(p.pickings)} picking{Number(p.pickings) === 1 ? "" : "s"}</span></span>
                  <span className="font-bold tabular-nums">{Number(p.cajas)} cajas</span>
                </Link>
              </li>
            ))}
          </ul>
        </Tarjeta>
      ) : null}
    </>
  );
}
