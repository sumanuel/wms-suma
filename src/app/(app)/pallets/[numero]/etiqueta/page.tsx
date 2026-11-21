import { notFound } from "next/navigation";
import Link from "next/link";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { impresorasActivas } from "@/lib/etiquetas/impresion";
import { ImprimirDirecto } from "../../imprimir-directo";
import { clasesBoton } from "@/components/ui";
import { detallePallet } from "@/lib/pallets/servicio";
import { BotonImprimir } from "../../../despacho/boton-imprimir";
import { Barras, BarraImpresion, Etiqueta100x150 } from "../../etiqueta-base";

export default async function EtiquetaPallet({ params }: { params: Promise<{ numero: string }> }) {
  const ctx = await requerirPermiso("pallets", "ver");
  const { db } = ctx;
  const { numero: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const numero = Number(t);
  const p = await detallePallet(db, numero);
  if (!p) notFound();
  const porArticulo = new Map<string, { articulo: string; lote: string; cajas: number; unidades: number }>();
  for (const c of p.cajas) {
    const k = `${c.ean}|${c.lote}`;
    const x = porArticulo.get(k) ?? { articulo: String(c.articulo ?? c.ean ?? ""), lote: String(c.lote ?? ""), cajas: 0, unidades: 0 };
    x.cajas += 1;
    x.unidades += Number(c.saldo ?? 0);
    porArticulo.set(k, x);
  }
  const lineas = [...porArticulo.values()];
  return (
    <div className="flex flex-col gap-4">
      <BarraImpresion>
        <Link href={`/pallets/${numero}`} className={clasesBoton("fantasma")}>← Volver al pallet</Link>
        <BotonImprimir />
        <ImprimirDirecto tipo="pallet" referencia={{ numero }} impresoras={await impresorasActivas(db)} puedeImprimir={tienePermiso(ctx, "pallets", "editar")} />
      </BarraImpresion>
      <Etiqueta100x150>
        <p className="text-xs font-semibold uppercase tracking-wide">Pallet</p>
        <p className="text-6xl font-extrabold leading-none tabular-nums">{numero}</p>
        <Barras texto={String(numero)} alto={16} className="h-[30mm]" />
        <p className="text-center text-sm tabular-nums">{numero}</p>
        <div className="grid grid-cols-3 gap-2 border-y border-tinta py-2 text-center text-xs">
          <div><p className="font-semibold">Cajas</p><p className="text-lg font-bold">{p.cajas.length}</p></div>
          <div><p className="font-semibold">Unidades</p><p className="text-lg font-bold">{new Intl.NumberFormat("es-CO").format(p.unidades)}</p></div>
          <div><p className="font-semibold">Ubicación</p><p className="text-lg font-bold">{p.ubicaciones.length > 1 ? "Varias" : p.ubicaciones[0] ?? "—"}</p></div>
        </div>
        <ul className="flex flex-col gap-1 overflow-hidden text-xs">
          {lineas.slice(0, 8).map((l, i) => (
            <li key={i} className="flex justify-between gap-2 border-b border-dashed border-gris-500 pb-1"><span className="truncate">{l.articulo} · {l.lote}</span><span className="shrink-0 tabular-nums">{new Intl.NumberFormat("es-CO").format(l.unidades)}</span></li>
          ))}
          {lineas.length > 8 ? <li className="text-gris-600">… y {lineas.length - 8} líneas más</li> : null}
        </ul>
      </Etiqueta100x150>
    </div>
  );
}
