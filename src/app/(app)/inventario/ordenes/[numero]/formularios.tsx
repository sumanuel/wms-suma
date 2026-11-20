"use client";

import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { anular, cerrar, type Estado } from "../acciones";

export function FormularioRazon({ numero, tipo }: { numero: number; tipo: "cerrar" | "anular" }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>((tipo === "cerrar" ? cerrar : anular).bind(null, numero), {});
  return (
    <form onSubmit={enviar} className="flex max-w-xl flex-col gap-2">
      <label htmlFor={`razon-${tipo}`} className="text-[13px] font-medium">{tipo === "cerrar" ? "Cerrar con lo que falta" : "Anular la orden"}</label>
      <div className="flex gap-2">
        <input id={`razon-${tipo}`} name="razon" required maxLength={300} placeholder="Razón" className={claseControl} />
        <button type="submit" disabled={pendiente} className={clasesBoton(tipo === "anular" ? "peligro" : "secundario")}>{tipo === "cerrar" ? "Cerrar" : "Anular"}</button>
      </div>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
    </form>
  );
}
