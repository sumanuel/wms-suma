"use client";

import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { autorizar, rechazar, type Estado } from "../acciones";

export function ResolverRecibo({ id, hayDiferencias }: { id: number; hayDiferencias: boolean }) {
  const ap = useEnvio<Estado>(autorizar.bind(null, id), {});
  const re = useEnvio<Estado>(rechazar.bind(null, id), {});
  const error = ap.estado.error ?? re.estado.error;
  return (
    <form onSubmit={ap.enviar} className="flex max-w-2xl flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nota" className="text-[13px] font-medium">Nota {hayDiferencias ? "(obligatoria: hay diferencias)" : "(obligatoria solo para rechazar)"}</label>
        <input id="nota" name="nota" maxLength={300} className={claseControl} />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={ap.pendiente || re.pendiente} className={clasesBoton("primario")}>{ap.pendiente ? "Autorizando…" : "Autorizar y recibir"}</button>
        <button type="button" disabled={ap.pendiente || re.pendiente} className={clasesBoton("peligro")} onClick={(e) => { const f = e.currentTarget.form; if (f) re.enviar({ preventDefault() {}, currentTarget: f } as never); }}>{re.pendiente ? "Rechazando…" : "Rechazar conteo"}</button>
      </div>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
    </form>
  );
}
