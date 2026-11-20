"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { almacenarCaja } from "../recepcion/acciones";

export function AlmacenarFila({ caja, sugerencias }: { caja: number; sugerencias: { ubicacion: string; razon: string }[] }) {
  const router = useRouter();
  const [valor, setValor] = useState(sugerencias[0]?.ubicacion ?? "");
  const { estado, pendiente, enviar } = useEnvio<{ error?: string; aviso?: string }>(almacenarCaja.bind(null, caja), {});
  const razon = sugerencias.find((s) => s.ubicacion === valor)?.razon;
  return (
    <form onSubmit={(e) => { enviar(e); setTimeout(() => router.refresh(), 2500); }} className="flex min-w-72 flex-col gap-1.5">
      <div className="flex gap-2">
        <input name="ubicacion" required value={valor} onChange={(e) => setValor(e.target.value)} aria-label={`Ubicación para la caja ${caja}`} className={`${claseControl} h-9 w-40`} />
        <button type="submit" disabled={pendiente} className={clasesBoton("primario", "h-9")}>{pendiente ? "…" : "Almacenar"}</button>
      </div>
      <p className="text-xs text-gris-500">{razon ?? (sugerencias.length ? "Otra ubicación (no es la sugerida)" : "Sin sugerencia: escribe una ubicación")}{sugerencias.length > 1 ? <> · otras: {sugerencias.filter((s) => s.ubicacion !== valor).map((s) => <button key={s.ubicacion} type="button" className="font-medium text-marca-texto hover:underline" onClick={() => setValor(s.ubicacion)}>{s.ubicacion}</button>).reduce<React.ReactNode[]>((a, x, i) => (i ? [...a, ", ", x] : [x]), [])}</> : null}</p>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      {estado.aviso ? <Aviso tono="exito">{estado.aviso}</Aviso> : null}
    </form>
  );
}
