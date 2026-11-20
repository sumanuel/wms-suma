"use client";

import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { generar, type EstadoGenerar } from "./acciones";

export function FormularioGenerar({ numero, transportadores }: { numero: string; transportadores: string[] }) {
  const { estado, pendiente, enviar } = useEnvio<EstadoGenerar>(generar.bind(null, numero), {});
  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pickeador" className="text-[13px] font-medium">Pickeador <span className="font-normal text-gris-500">(opcional)</span></label>
          <input id="pickeador" name="pickeador" maxLength={50} className={claseControl} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="transportador" className="text-[13px] font-medium">Transportador <span className="font-normal text-gris-500">(opcional)</span></label>
          <select id="transportador" name="transportador" defaultValue="" className={`${claseControl} pr-9`}>
            <option value="">Sin asignar</option>
            {transportadores.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label htmlFor="observaciones" className="text-[13px] font-medium">Observaciones <span className="font-normal text-gris-500">(opcional)</span></label>
          <input id="observaciones" name="observaciones" maxLength={250} className={claseControl} />
        </div>
      </div>
      <div>
        <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Generando…" : "Generar picking"}</button>
      </div>
    </form>
  );
}
