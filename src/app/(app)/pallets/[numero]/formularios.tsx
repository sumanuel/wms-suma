"use client";

import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { agregarAlPallet, ubicar, type EstadoPallet } from "../acciones";

export function FormularioAgregar({ pallet }: { pallet: number }) {
  const { estado, pendiente, enviar } = useEnvio<EstadoPallet>(agregarAlPallet.bind(null, pallet), {}, { limpiarSiExito: true });
  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <label htmlFor="caja" className="text-[13px] font-medium">Agregar caja</label>
      <div className="flex gap-2">
        <input id="caja" name="caja" inputMode="numeric" required autoComplete="off" placeholder="Número de caja" className={`${claseControl} w-48`} />
        <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Agregando…" : "Agregar"}</button>
      </div>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      {estado.aviso ? <Aviso tono="exito">{estado.aviso}</Aviso> : null}
    </form>
  );
}

export function FormularioUbicar({ pallet }: { pallet: number }) {
  const { estado, pendiente, enviar } = useEnvio<EstadoPallet>(ubicar.bind(null, pallet), {});
  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <label htmlFor="ubicacion" className="text-[13px] font-medium">Llevar el pallet a una ubicación</label>
      <div className="flex gap-2">
        <input id="ubicacion" name="ubicacion" required autoComplete="off" placeholder="Ej. A-01-01" className={`${claseControl} w-48`} />
        <button type="submit" disabled={pendiente} className={clasesBoton("secundario")}>{pendiente ? "Moviendo…" : "Ubicar pallet"}</button>
      </div>
      <p className="text-xs text-gris-500">Mueve todas las cajas y cierra el pallet (salvo en RECIBO).</p>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      {estado.aviso ? <Aviso tono="exito">{estado.aviso}</Aviso> : null}
    </form>
  );
}
