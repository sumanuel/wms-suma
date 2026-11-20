"use client";

import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { celda } from "@/components/seccion-ficha";
import { useEnvio } from "@/components/usar-envio";
import { guardarCantidades, type EstadoCantidades } from "./acciones";

export type LineaConteo = { id: number; caja: string; ean: string; descripcion: string; ubicacion: string; teorico: string; contado: string; estado: number; diferencia: number | null };

// Tabla de cajas con un campo para la cantidad contada. Se guardan de una vez las de la página; el servidor solo escribe las que cambiaron.
export function FormularioCantidades({ idConteo, lineas }: { idConteo: number; lineas: LineaConteo[] }) {
  const { estado, pendiente, enviar } = useEnvio<EstadoCantidades & { error?: string }>(guardarCantidades.bind(null, idConteo), {});
  return (
    <form onSubmit={enviar} className="flex flex-col">
      {estado.error ? <div className="px-4 pt-4"><Aviso tono="error">{estado.error}</Aviso></div> : null}
      {estado.mensaje ? <div className="px-4 pt-4"><Aviso tono="exito">{estado.mensaje}</Aviso></div> : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-[#fafaf8] text-xs text-gris-500">
            <tr>
              {["Ubicación", "Caja", "Artículo"].map((t) => (
                <th key={t} className="border-b border-linea px-4 py-2.5 font-medium">{t}</th>
              ))}
              <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Teórico</th>
              <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Contado</th>
              <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {lineas.map((l) => (
              <tr key={l.id}>
                <td className={celda}>{l.ubicacion || "—"}</td>
                <td className={`${celda} tabular-nums`}>{l.caja}</td>
                <td className={celda}>
                  <span className="font-medium">{l.descripcion || l.ean}</span>
                  <span className="block text-xs text-gris-500">{l.ean}</span>
                </td>
                <td className={`${celda} text-right tabular-nums`}>{l.teorico}</td>
                <td className={`${celda} text-right`}>
                  <label htmlFor={`c_${l.id}`} className="sr-only">Cantidad contada de la caja {l.caja}</label>
                  <input id={`c_${l.id}`} name={`c_${l.id}`} inputMode="decimal" defaultValue={l.contado} className={`${claseControl} h-9 w-28 text-right tabular-nums`} />
                </td>
                <td className={`${celda} text-right tabular-nums ${l.diferencia ? (l.diferencia < 0 ? "font-semibold text-error" : "font-semibold text-aviso") : "text-gris-500"}`}>
                  {l.diferencia === null ? "—" : l.diferencia > 0 ? `+${l.diferencia}` : l.diferencia}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3.5">
        <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>
          {pendiente ? "Guardando…" : "Guardar cantidades"}
        </button>
        <span className="text-[13px] text-gris-500">Se guardan las de esta página. La diferencia se muestra al guardar.</span>
      </div>
    </form>
  );
}
