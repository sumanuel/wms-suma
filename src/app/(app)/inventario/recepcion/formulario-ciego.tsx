"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { contarACiegas, type Estado } from "../recibos/acciones";

export function FormularioCiego({ orden, estados }: { orden: number; estados: string[] }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>(contarACiegas, {});
  const [lineas, setLineas] = useState<{ id: number }[]>([{ id: 0 }]);
  const [siguiente, setSiguiente] = useState(1);
  return (
    <form onSubmit={enviar} className="flex flex-col gap-5">
      <input type="hidden" name="lineas" value={lineas.length} />
      <input type="hidden" name="orden" value={orden} />
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      {estado.aviso ? <Aviso tono="exito">{estado.aviso} <Link href="/inventario/recibos" className="font-semibold underline">Ver los recibos</Link></Aviso> : null}
      <div className="flex max-w-sm flex-col gap-1.5">
        <label htmlFor="estado" className="text-[13px] font-medium">Calidad de los lotes nuevos</label>
        <select id="estado" name="estado" defaultValue={estados.includes("Cuarentena") ? "Cuarentena" : estados[0]} className={`${claseControl} pr-9`}>{estados.map((e) => <option key={e} value={e}>{e}</option>)}</select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13.5px]">
          <thead><tr className="text-[12.5px] text-gris-500">{["Código de barras", "Lote", "Vence (opcional)", "Cajas", "Cantidad por caja", ""].map((h, i) => <th key={i} scope="col" className="px-1.5 py-1.5 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {lineas.map((l, i) => (
              <tr key={l.id}>
                <td className="p-1.5"><input name={`ean_${i}`} aria-label={`Código de barras, línea ${i + 1}`} maxLength={50} className={claseControl} /></td>
                <td className="p-1.5"><input name={`lote_${i}`} aria-label={`Lote, línea ${i + 1}`} maxLength={30} className={claseControl} /></td>
                <td className="p-1.5"><input name={`vence_${i}`} type="date" aria-label={`Vencimiento, línea ${i + 1}`} className={claseControl} /></td>
                <td className="p-1.5"><input name={`cajas_${i}`} inputMode="numeric" aria-label={`Cajas, línea ${i + 1}`} className={`${claseControl} w-24`} /></td>
                <td className="p-1.5"><input name={`cantidad_${i}`} inputMode="decimal" aria-label={`Cantidad por caja, línea ${i + 1}`} className={`${claseControl} w-32`} /></td>
                <td className="p-1.5">{lineas.length > 1 ? <button type="button" aria-label={`Quitar la línea ${i + 1}`} onClick={() => setLineas(lineas.filter((x) => x.id !== l.id))} className={clasesBoton("fantasma", "px-2")}><Trash2 className="size-4" aria-hidden /></button> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => { setLineas([...lineas, { id: siguiente }]); setSiguiente(siguiente + 1); }} className={clasesBoton("secundario")}><Plus className="size-4" aria-hidden />Agregar línea</button>
        <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Registrando…" : "Registrar conteo"}</button>
      </div>
    </form>
  );
}
