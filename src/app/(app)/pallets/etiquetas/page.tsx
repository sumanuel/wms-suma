import Link from "next/link";
import { Aviso, Tarjeta, claseControl, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { etiquetasDespacho } from "@/lib/pallets/etiquetas";

export default async function Etiquetas({ searchParams }: { searchParams: Promise<{ picking?: string }> }) {
  const { db } = await requerirPermiso("pallets", "ver");
  const q = await searchParams;
  const picking = /^\d+$/.test(q.picking ?? "") ? Number(q.picking) : null;
  const e = picking ? await etiquetasDespacho(db, picking) : null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Tarjeta className="flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">Cajas de despacho (SSCC)</h2>
        <p className="text-[13.5px] text-gris-500">Una etiqueta por cada caja que armó la aduana, con el destinatario, el contenido y el código SSCC de 18 dígitos.</p>
        <form method="get" className="flex gap-2">
          <input name="picking" inputMode="numeric" required placeholder="Número de picking" defaultValue={q.picking ?? ""} aria-label="Número de picking" className={`${claseControl} w-48`} />
          <button type="submit" className={clasesBoton("secundario")}>Buscar</button>
        </form>
        {q.picking && !picking ? <Aviso tono="error">El picking debe ser un número entero.</Aviso> : null}
        {picking && !e ? <Aviso tono="error">No existe el picking {picking}.</Aviso> : null}
        {e ? (
          e.total === 0 ? <Aviso tono="aviso">El picking {e.picking} todavía no tiene cajas armadas en la aduana.</Aviso> : (
            <div className="flex flex-wrap items-center gap-3 rounded-[10px] bg-neutro-suave p-3 text-sm">
              <span>Picking <strong>{e.picking}</strong> · pedido {e.pedido || "—"} · {e.cliente || "sin cliente"} · <strong>{e.total}</strong> {e.total === 1 ? "caja" : "cajas"}</span>
              <Link href={`/pallets/etiquetas/despacho/${e.picking}`} className={clasesBoton("primario", "ml-auto")}>Ver etiquetas</Link>
            </div>
          )
        ) : null}
      </Tarjeta>
      <Tarjeta className="flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">Cajas de inventario</h2>
        <p className="text-[13.5px] text-gris-500">Etiquetas de cajas recibidas, por rango de números de caja (hasta 200). Se lleva la cuenta de impresiones y se avisa de las reimpresiones.</p>
        <form method="get" action="/pallets/etiquetas/cajas" className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[13px] font-medium">Desde<input name="desde" inputMode="numeric" required className={`${claseControl} w-36`} /></label>
          <label className="flex flex-col gap-1 text-[13px] font-medium">Hasta<input name="hasta" inputMode="numeric" className={`${claseControl} w-36`} placeholder="(igual)" /></label>
          <button type="submit" className={clasesBoton("secundario")}>Ver etiquetas</button>
        </form>
      </Tarjeta>
    </div>
  );
}
