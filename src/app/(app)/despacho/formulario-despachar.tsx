"use client";

import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { despacharAccion, type EstadoDespacho } from "./acciones";

export function FormularioDespachar({ picking, transportadores, predeterminado, valorMercancia }: { picking: number; transportadores: string[]; predeterminado: string; valorMercancia: number }) {
  const { estado, pendiente, enviar } = useEnvio<EstadoDespacho>(despacharAccion.bind(null, picking), {});
  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="transportador" className="text-[13px] font-medium">Transportador</label>
          <select id="transportador" name="transportador" required defaultValue={transportadores.includes(predeterminado) ? predeterminado : ""} className={`${claseControl} pr-9`}>
            <option value="" disabled>Elegir…</option>
            {transportadores.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {transportadores.length === 0 ? <p className="text-[12.5px] text-error">No hay transportadores activos: créalos en Maestros › Transportadores.</p> : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="factura" className="text-[13px] font-medium">Número de factura <span className="font-normal text-gris-500">(opcional)</span></label>
          <input id="factura" name="factura" maxLength={50} className={claseControl} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="valorDeclarado" className="text-[13px] font-medium">Valor declarado <span className="font-normal text-gris-500">(opcional)</span></label>
          <input id="valorDeclarado" name="valorDeclarado" inputMode="decimal" placeholder={String(valorMercancia).replace(".", ",")} className={claseControl} />
          <p className="text-[12.5px] text-gris-500">Si lo dejas vacío se usa el valor de la mercancía.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="total" className="text-[13px] font-medium">Flete <span className="font-normal text-gris-500">(opcional)</span></label>
          <input id="total" name="total" inputMode="decimal" className={claseControl} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="comentario" className="text-[13px] font-medium">Comentario <span className="font-normal text-gris-500">(opcional)</span></label>
          <input id="comentario" name="comentario" maxLength={500} className={claseControl} />
        </div>
      </div>
      <div>
        <button type="submit" disabled={pendiente || transportadores.length === 0} className={clasesBoton("primario")}>{pendiente ? "Despachando…" : "Despachar y generar guía"}</button>
      </div>
    </form>
  );
}
