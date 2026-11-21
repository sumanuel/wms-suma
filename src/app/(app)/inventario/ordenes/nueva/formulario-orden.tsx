"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { nuevaOrden, type Estado } from "../acciones";

export type OrdenInicial = { numero: number; nit: string; bodega: string; esperada: string; observaciones: string; bloquear: boolean; lineas: { ean: string; cantidad: number; precio: number | null; recibido: number }[] };

export function FormularioOrden({ bodegas, inicial, accion }: { bodegas: { valor: string; etiqueta: string }[]; inicial?: OrdenInicial; accion?: (previo: Estado, form: FormData) => Promise<Estado> }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>(accion ?? nuevaOrden, {});
  const [lineas, setLineas] = useState<{ id: number; ean?: string; cantidad?: number; precio?: number | null; recibido?: number }[]>(inicial ? inicial.lineas.map((l, i) => ({ id: i, ...l })) : [{ id: 0 }]);
  const [siguiente, setSiguiente] = useState(inicial ? inicial.lineas.length : 1);
  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <input type="hidden" name="lineas" value={lineas.length} />
      {inicial?.bloquear ? <input type="hidden" name="bodega" value={inicial.bodega} /> : null}
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1.5"><label htmlFor="nit" className="text-[13px] font-medium">NIT del proveedor</label><input id="nit" name="nit" required maxLength={15} defaultValue={inicial?.nit} readOnly={inicial?.bloquear} className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="bodega" className="text-[13px] font-medium">Bodega de recibo</label>
          <select id="bodega" name="bodega" required defaultValue={inicial?.bodega ?? ""} disabled={inicial?.bloquear} className={`${claseControl} pr-9`}><option value="" disabled>Elegir…</option>{bodegas.map((b) => <option key={b.valor} value={b.valor}>{b.etiqueta}</option>)}</select></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="esperada" className="text-[13px] font-medium">Fecha esperada <span className="font-normal text-gris-500">(opcional)</span></label><input id="esperada" name="esperada" type="date" defaultValue={inicial?.esperada} className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="observaciones" className="text-[13px] font-medium">Observaciones <span className="font-normal text-gris-500">(opcional)</span></label><input id="observaciones" name="observaciones" maxLength={400} defaultValue={inicial?.observaciones} className={claseControl} /></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13.5px]">
          <thead><tr className="text-[12.5px] text-gris-500">{["Código de barras", "Cantidad", "Precio (opcional)", ""].map((h, i) => <th key={i} scope="col" className="px-1.5 py-1.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={l.id}>
                <td className="p-1.5"><input name={`ean_${i}`} aria-label={`Código de barras, línea ${i + 1}`} maxLength={50} defaultValue={l.ean} className={claseControl} />{l.recibido ? <span className="mt-1 block text-xs text-gris-500">Ya se recibieron {l.recibido}</span> : null}</td>
                <td className="p-1.5"><input name={`cantidad_${i}`} inputMode="decimal" aria-label={`Cantidad, línea ${i + 1}`} defaultValue={l.cantidad} className={`${claseControl} w-36`} /></td>
                <td className="p-1.5"><input name={`precio_${i}`} inputMode="decimal" aria-label={`Precio, línea ${i + 1}`} defaultValue={l.precio ?? undefined} className={`${claseControl} w-36`} /></td>
                <td className="p-1.5">{lineas.length > 1 && !l.recibido ? <button type="button" aria-label={`Quitar la línea ${i + 1}`} onClick={() => setLineas(lineas.filter((x) => x.id !== l.id))} className={clasesBoton("fantasma", "px-2")}><Trash2 className="size-4" aria-hidden /></button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => { setLineas([...lineas, { id: siguiente }]); setSiguiente(siguiente + 1); }} className={clasesBoton("secundario")}><Plus className="size-4" aria-hidden />Agregar línea</button>
        <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Guardando…" : inicial ? "Guardar cambios" : "Crear orden"}</button>
        <Link href={inicial ? `/inventario/ordenes/${inicial.numero}` : "/inventario/ordenes"} className="text-sm font-medium text-gris-700 hover:text-tinta">Cancelar</Link>
      </div>
    </form>
  );
}
