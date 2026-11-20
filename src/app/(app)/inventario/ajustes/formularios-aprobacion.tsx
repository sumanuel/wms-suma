"use client";

import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { anular, aprobar, fijarUmbral, rechazar, type Estado } from "./acciones-aprobacion";

export function ResolverSolicitud({ id }: { id: number }) {
  const ap = useEnvio<Estado>(aprobar.bind(null, id), {});
  const re = useEnvio<Estado>(rechazar.bind(null, id), {});
  const error = ap.estado.error ?? re.estado.error;
  return (
    <form onSubmit={ap.enviar} className="flex min-w-64 flex-col gap-2">
      <input name="nota" maxLength={300} aria-label={`Nota de la solicitud ${id}`} placeholder="Nota (obligatoria para rechazar)" className={`${claseControl} h-9`} />
      <div className="flex gap-2">
        <button type="submit" disabled={ap.pendiente || re.pendiente} className={clasesBoton("primario", "h-9")}>{ap.pendiente ? "Aprobando…" : "Aprobar"}</button>
        <button
          type="button" disabled={ap.pendiente || re.pendiente} className={clasesBoton("peligro", "h-9")}
          onClick={(e) => { const f = e.currentTarget.form; if (f) re.enviar({ preventDefault() {}, currentTarget: f } as never); }}
        >{re.pendiente ? "Rechazando…" : "Rechazar"}</button>
      </div>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
    </form>
  );
}

export function FormularioAnular({ id }: { id: number }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>(anular.bind(null, id), {});
  return (
    <form onSubmit={enviar} className="flex max-w-xl flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="razon" className="text-[13px] font-medium">Por qué se anula</label>
        <input id="razon" name="razon" required maxLength={300} className={claseControl} />
        <p className="text-xs text-gris-500">Se registra un ajuste contrario que cita este y deja la caja con el saldo de antes.</p>
      </div>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <div><button type="submit" disabled={pendiente} className={clasesBoton("peligro")}>{pendiente ? "Anulando…" : "Anular ajuste"}</button></div>
    </form>
  );
}

export function FormularioUmbral({ actual }: { actual: number }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>(fijarUmbral, {});
  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="umbral" className="text-[13px] font-medium">Aprobar ajustes de más de (unidades)</label>
        <input id="umbral" name="umbral" inputMode="decimal" defaultValue={actual > 0 ? String(actual) : ""} placeholder="0 = sin aprobación" className={`${claseControl} w-56`} />
      </div>
      <button type="submit" disabled={pendiente} className={clasesBoton("secundario")}>{pendiente ? "Guardando…" : "Guardar"}</button>
      <div className="basis-full">
        {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
        {estado.aviso ? <Aviso tono="exito">{estado.aviso}</Aviso> : null}
      </div>
    </form>
  );
}
