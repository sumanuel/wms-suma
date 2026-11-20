"use client";

import Link from "next/link";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { crearPallet, type EstadoPallet } from "./acciones";

export function FormularioNuevoPallet({ sugerido }: { sugerido: number }) {
  const { estado, pendiente, enviar } = useEnvio<EstadoPallet>(crearPallet, {});
  return (
    <form onSubmit={enviar} className="flex max-w-xl flex-col gap-4">
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pallet" className="text-[13px] font-medium">Número de pallet</label>
          <input id="pallet" name="pallet" inputMode="numeric" required defaultValue={sugerido} className={claseControl} />
          <p className="text-xs text-gris-500">Se sugiere el siguiente libre; puedes escribir el de la etiqueta.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="caja" className="text-[13px] font-medium">Primera caja</label>
          <input id="caja" name="caja" inputMode="numeric" required autoFocus className={claseControl} />
          <p className="text-xs text-gris-500">Debe estar ubicada: su ubicación será la del pallet.</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Creando…" : "Crear pallet"}</button>
        <Link href="/pallets" className="text-sm font-medium text-gris-700 hover:text-tinta">Cancelar</Link>
      </div>
    </form>
  );
}
