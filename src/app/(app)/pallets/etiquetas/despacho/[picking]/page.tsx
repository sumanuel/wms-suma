import { notFound } from "next/navigation";
import Link from "next/link";
import { clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { etiquetasDespacho } from "@/lib/pallets/etiquetas";
import { formatearFecha } from "@/lib/indicadores/formato";
import { BotonImprimir } from "../../../../despacho/boton-imprimir";
import { Barras, BarraImpresion, Etiqueta100x150 } from "../../../etiqueta-base";

export default async function EtiquetasDespacho({ params }: { params: Promise<{ picking: string }> }) {
  const { db } = await requerirPermiso("pallets", "ver");
  const { picking: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const e = await etiquetasDespacho(db, Number(t));
  if (!e) notFound();
  return (
    <div className="flex flex-col gap-4">
      <BarraImpresion>
        <Link href="/pallets/etiquetas" className={clasesBoton("fantasma")}>← Volver a etiquetas</Link>
        <BotonImprimir />
        <span className="text-sm text-gris-500">{e.total} {e.total === 1 ? "etiqueta" : "etiquetas"}, una por caja de despacho.</span>
      </BarraImpresion>
      {e.total === 0 ? <p className="text-sm text-gris-500">Este picking todavía no tiene cajas armadas en la aduana.</p> : null}
      <div className="flex flex-wrap gap-4 print:block">
        {e.cajas.map((c) => (
          <Etiqueta100x150 key={c.numero}>
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold uppercase">Pedido {e.pedido || "—"} · Picking {e.picking}</p>
              <p className="text-2xl font-extrabold tabular-nums">{c.numero} / {e.total}</p>
            </div>
            <div className="border-y border-tinta py-1.5 text-xs leading-snug">
              <p className="text-[10px] font-semibold uppercase text-gris-600">Destinatario</p>
              <p className="text-sm font-bold">{e.cliente || "—"}</p>
              <p>{e.direccion}</p>
              <p>{e.ciudad}{e.telefono ? ` · Tel. ${e.telefono}` : ""}</p>
            </div>
            <ul className="flex flex-1 flex-col gap-1 overflow-hidden text-xs">
              {c.lineas.slice(0, 7).map((l, i) => (
                <li key={i} className="border-b border-dashed border-gris-500 pb-1">
                  <span className="font-semibold">{l.articulo}</span> <span className="tabular-nums">× {new Intl.NumberFormat("es-CO").format(l.cantidad)} {l.presentacion}</span>
                  <span className="block text-[11px] text-gris-600">Lote {l.lote || "—"}{l.vence ? ` · Vence ${formatearFecha(l.vence)}` : ""}</span>
                </li>
              ))}
              {c.lineas.length > 7 ? <li className="text-gris-600">… y {c.lineas.length - 7} líneas más</li> : null}
            </ul>
            <Barras texto={c.sscc} alto={14} className="h-[22mm]" />
            <p className="text-center text-sm font-semibold tracking-wider tabular-nums">(00) {c.sscc}</p>
          </Etiqueta100x150>
        ))}
      </div>
    </div>
  );
}
