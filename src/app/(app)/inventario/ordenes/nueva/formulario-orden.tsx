"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { nuevaOrden, type Estado } from "../acciones";

export function FormularioOrden({ bodegas }: { bodegas: { valor: string; etiqueta: string }[] }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>(nuevaOrden, {});
  const [lineas, setLineas] = useState<{ id: number }[]>([{ id: 0 }]);
  const [siguiente, setSiguiente] = useState(1);
  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <input type="hidden" name="lineas" value={lineas.length} />
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1.5"><label htmlFor="nit" className="text-[13px] font-medium">NIT del proveedor</label><input id="nit" name="nit" required maxLength={15} className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="bodega" className="text-[13px] font-medium">Bodega de recibo</label>
          <select id="bodega" name="bodega" required defaultValue="" className={`${claseControl} pr-9`}><option value="" disabled>Elegir…</option>{bodegas.map((b) => <option key={b.valor} value={b.valor}>{b.etiqueta}</option>)}</select></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="esperada" className="text-[13px] font-medium">Fecha esperada <span className="font-normal text-gris-500">(opcional)</span></label><input id="esperada" name="esperada" type="date" className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="observaciones" className="text-[13px] font-medium">Observaciones <span className="font-normal text-gris-500">(opcional)</span></label><input id="observaciones" name="observaciones" maxLength={400} className={claseControl} /></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13.5px]">
          <thead><tr className="text-[12.5px] text-gris-500">{["Código de barras", "Cantidad", "Precio (opcional)", ""].map((h, i) => <th key={i} scope="col" className="px-1.5 py-1.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={l.id}>
                <td className="p-1.5"><input name={`ean_${i}`} aria-label={`Código de barras, línea ${i + 1}`} maxLength={50} className={claseControl} /></td>
                <td className="p-1.5"><input name={`cantidad_${i}`} inputMode="decimal" aria-label={`Cantidad, línea ${i + 1}`} className={`${claseControl} w-36`} /></td>
                <td className="p-1.5"><input name={`precio_${i}`} inputMode="decimal" aria-label={`Precio, línea ${i + 1}`} className={`${claseControl} w-36`} /></td>
                <td className="p-1.5">{lineas.length > 1 ? <button type="button" aria-label={`Quitar la línea ${i + 1}`} onClick={() => setLineas(lineas.filter((x) => x.id !== l.id))} className={clasesBoton("fantasma", "px-2")}><Trash2 className="size-4" aria-hidden /></button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => { setLineas([...lineas, { id: siguiente }]); setSiguiente(siguiente + 1); }} className={clasesBoton("secundario")}><Plus className="size-4" aria-hidden />Agregar línea</button>
        <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Creando…" : "Crear orden"}</button>
        <Link href="/inventario/ordenes" className="text-sm font-medium text-gris-700 hover:text-tinta">Cancelar</Link>
      </div>
    </form>
  );
}
