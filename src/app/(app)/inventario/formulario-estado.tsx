"use client";

import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { cambiarEstadoLote, type EstadoCambioCalidad } from "./acciones";

export function FormularioEstado({ idlote, actual, control, opciones }: { idlote: number; actual: string | null; control: string; opciones: string[] }) {
  const { estado, pendiente, enviar } = useEnvio<EstadoCambioCalidad>(cambiarEstadoLote.bind(null, idlote), {});
  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="estado" className="text-[13px] font-medium">
            Nuevo estado
          </label>
          <select id="estado" name="estado" required defaultValue="" className={`${claseControl} pr-9`}>
            <option value="" disabled>
              Elegir…
            </option>
            {opciones.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="control" className="text-[13px] font-medium">
            Número de control de liberación
          </label>
          <input id="control" name="control" required maxLength={20} defaultValue={control} className={claseControl} />
        </div>
      </div>
      <p className="text-[13px] text-gris-500">
        Estado actual: {actual ?? "sin estado"}. Un lote rechazado no vuelve a cambiar, y uno aprobado solo puede pasar a rechazado.
      </p>
      <div>
        <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>
          {pendiente ? "Guardando…" : "Cambiar estado"}
        </button>
      </div>
    </form>
  );
}
