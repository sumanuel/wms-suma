import { notFound } from "next/navigation";
import Link from "next/link";
import { clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { impresorasActivas } from "@/lib/etiquetas/impresion";
import { ImprimirDirecto } from "../../../imprimir-directo";
import { ssccPallet } from "@/lib/etiquetas/codigos";
import { etiquetaPalletDespacho } from "@/lib/pallets/despacho";
import { BotonImprimir } from "../../../../despacho/boton-imprimir";
import { Barras, BarraImpresion, Etiqueta100x150 } from "../../../etiqueta-base";

export default async function EtiquetaPalletDespacho({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requerirPermiso("pallets", "ver");
  const { db } = ctx;
  const { id: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const id = Number(t);
  const e = await etiquetaPalletDespacho(db, id);
  if (!e) notFound();
  const sscc = ssccPallet(id);
  return (
    <div className="flex flex-col gap-4">
      <BarraImpresion><Link href={`/pallets/despacho/${id}`} className={clasesBoton("fantasma")}>← Volver al pallet</Link><BotonImprimir /><ImprimirDirecto tipo="pallet-despacho" referencia={{ id }} impresoras={await impresorasActivas(db)} puedeImprimir={tienePermiso(ctx, "pallets", "editar")} /></BarraImpresion>
      <Etiqueta100x150>
        <div className="flex items-baseline justify-between"><p className="text-xs font-semibold uppercase tracking-wide">Pallet de despacho</p><p className="text-xs">Bodega {e.pallet.bodega}</p></div>
        <p className="text-6xl font-extrabold leading-none tabular-nums">{id}</p>
        <div className="grid grid-cols-3 gap-2 border-y border-tinta py-2 text-center text-xs">
          <div><p className="font-semibold">Cajas</p><p className="text-lg font-bold">{e.totales.cajas}</p></div>
          <div><p className="font-semibold">Peso (kg)</p><p className="text-lg font-bold">{e.pallet.peso === null ? e.totales.kilos : String(e.pallet.peso)}</p></div>
          <div><p className="font-semibold">Medidas (cm)</p><p className="text-sm font-bold">{e.pallet.alto && e.pallet.ancho && e.pallet.largo ? `${e.pallet.largo}×${e.pallet.ancho}×${e.pallet.alto}` : "—"}</p></div>
        </div>
        <ul className="flex flex-1 flex-col gap-1 overflow-hidden text-xs">
          {e.destinos.slice(0, 8).map((d) => <li key={d.picking} className="flex justify-between gap-2 border-b border-dashed border-gris-500 pb-1"><span className="truncate">{d.cliente || "—"} · {d.pedido}</span><span className="shrink-0 tabular-nums">{d.cajas} caja{d.cajas === 1 ? "" : "s"}</span></li>)}
          {e.destinos.length > 8 ? <li className="text-gris-600">… y {e.destinos.length - 8} pickings más</li> : null}
          {e.pallet.transportador ? <li className="pt-1 font-semibold">{e.pallet.transportador}{e.pallet.remesa ? ` · remesa ${e.pallet.remesa}` : ""}{e.pallet.placa ? ` · ${e.pallet.placa}` : ""}</li> : null}
        </ul>
        <Barras texto={sscc} alto={14} className="h-[22mm]" />
        <p className="text-center text-sm font-semibold tracking-wider tabular-nums">(00) {sscc}</p>
      </Etiqueta100x150>
    </div>
  );
}
