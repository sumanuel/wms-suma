import Link from "next/link";
import { clasesBoton, Aviso } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { etiquetasCajas } from "@/lib/pallets/etiquetas";
import { formatearFecha } from "@/lib/indicadores/formato";
import { impresorasActivas } from "@/lib/etiquetas/impresion";
import { ImprimirDirecto } from "../../imprimir-directo";
import { Barras, BarraImpresion, Etiqueta100x150 } from "../../etiqueta-base";
import { ImprimirCajas } from "./imprimir-cajas";

export default async function EtiquetasCajas({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const ctx = await requerirPermiso("pallets", "ver");
  const q = await searchParams;
  const desde = /^\d+$/.test(q.desde ?? "") ? Number(q.desde) : NaN;
  const hasta = /^\d+$/.test(q.hasta ?? "") ? Number(q.hasta) : desde;
  const valido = Number.isFinite(desde) && Number.isFinite(hasta) && hasta >= desde && hasta - desde < 200;
  const cajas = valido ? await etiquetasCajas(ctx.db, desde, hasta) : [];
  const reimpresas = cajas.filter((c) => c.impresa > 0).length;
  return (
    <div className="flex flex-col gap-4">
      <BarraImpresion>
        <Link href="/pallets/etiquetas" className={clasesBoton("fantasma")}>← Volver a etiquetas</Link>
        {cajas.length > 0 ? <ImprimirCajas cajas={cajas.map((c) => c.caja)} puedeRegistrar={tienePermiso(ctx, "pallets", "editar")} /> : null}
        {cajas.length > 0 ? <ImprimirDirecto tipo="cajas" referencia={{ desde, hasta }} impresoras={await impresorasActivas(ctx.db)} puedeImprimir={tienePermiso(ctx, "pallets", "editar")} /> : null}
      </BarraImpresion>
      {!valido ? <Aviso tono="error">Escribe un rango de cajas válido (hasta 200 a la vez).</Aviso> : cajas.length === 0 ? <Aviso tono="aviso">No hay cajas en ese rango.</Aviso> : null}
      {reimpresas > 0 ? <div className="print:hidden"><Aviso tono="aviso">{reimpresas} de estas cajas ya tenían etiqueta impresa: es una reimpresión.</Aviso></div> : null}
      <div className="flex flex-wrap gap-4 print:block">
        {cajas.map((c) => (
          <Etiqueta100x150 key={c.caja}>
            <p className="text-xs font-semibold uppercase tracking-wide">Caja{c.impresa > 0 ? ` · reimpresión ${c.impresa}` : ""}</p>
            <p className="text-6xl font-extrabold leading-none tabular-nums">{c.caja}</p>
            <Barras texto={String(c.caja)} alto={16} className="h-[28mm]" />
            <p className="text-center text-sm tabular-nums">{c.caja}</p>
            <div className="border-y border-tinta py-2 text-sm">
              <p className="font-bold">{c.articulo}</p>
              <p className="text-xs text-gris-600">{c.ean}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="font-semibold">Lote</p><p className="text-base font-bold">{c.lote || "—"}</p></div>
              <div><p className="font-semibold">Vence</p><p className="text-base font-bold">{c.vence ? formatearFecha(c.vence) : "—"}</p></div>
              <div><p className="font-semibold">Cantidad</p><p className="text-base font-bold tabular-nums">{new Intl.NumberFormat("es-CO").format(c.cantidad)}</p></div>
              <div><p className="font-semibold">Ubicación</p><p className="text-base font-bold">{c.ubicacion || "—"}</p></div>
            </div>
          </Etiqueta100x150>
        ))}
      </div>
    </div>
  );
}
