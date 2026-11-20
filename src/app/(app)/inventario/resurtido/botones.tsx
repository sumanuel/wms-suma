"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, clasesBoton } from "@/components/ui";
import { cancelar, generar, hacer, type Estado } from "./acciones";

export function BotonGenerar() {
  const [r, setR] = useState<Estado>({});
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();
  return (
    <div className="flex flex-col gap-2">
      <div><button type="button" disabled={pendiente} onClick={() => iniciar(async () => { setR(await generar()); router.refresh(); })} className={clasesBoton("primario")}>{pendiente ? "Generando…" : "Generar tareas"}</button></div>
      {r.error ? <Aviso tono="error">{r.error}</Aviso> : null}
      {r.aviso ? <Aviso tono="exito">{r.aviso}</Aviso> : null}
    </div>
  );
}

export function AccionesTarea({ id }: { id: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const ejecutar = (f: (id: number) => Promise<Estado>) => iniciar(async () => { const r = await f(id); setError(r.error ?? null); });
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex gap-2">
        <button type="button" disabled={pendiente} onClick={() => ejecutar(hacer)} className={clasesBoton("primario", "h-9")}>Hecha</button>
        <button type="button" disabled={pendiente} onClick={() => ejecutar(cancelar)} className={clasesBoton("secundario", "h-9")}>Cancelar</button>
      </div>
      {error ? <span className="max-w-64 text-xs text-error">{error}</span> : null}
    </div>
  );
}
