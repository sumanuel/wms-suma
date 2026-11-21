"use client";

import { Power, Send, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { activar, borrar, nuevaImpresora, probar, type Estado } from "./acciones";

export function FormularioImpresora() {
  const { estado, pendiente, enviar } = useEnvio<Estado>(nuevaImpresora, {}, { limpiarSiExito: true });
  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1.5"><label htmlFor="nombre" className="text-[13px] font-medium">Nombre</label><input id="nombre" name="nombre" required maxLength={40} placeholder="Zebra despacho" className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="host" className="text-[13px] font-medium">Dirección (IP o nombre)</label><input id="host" name="host" required maxLength={120} placeholder="192.168.1.50" className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="puerto" className="text-[13px] font-medium">Puerto</label><input id="puerto" name="puerto" inputMode="numeric" defaultValue="9100" className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="dpi" className="text-[13px] font-medium">Resolución</label>
          <select id="dpi" name="dpi" defaultValue="203" className={`${claseControl} pr-9`}><option value="203">203 dpi</option><option value="300">300 dpi</option></select></div>
      </div>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      {estado.aviso ? <Aviso tono="exito">{estado.aviso}</Aviso> : null}
      <div><button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Guardando…" : "Registrar impresora"}</button></div>
    </form>
  );
}

export function AccionesImpresora({ id, activa, puedeProbar, puedeAdministrar }: { id: number; activa: boolean; puedeProbar: boolean; puedeAdministrar: boolean }) {
  const [res, setRes] = useState<Estado | null>(null);
  const [pendiente, iniciar] = useTransition();
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {res?.error ? <span role="alert" className="text-xs text-error">{res.error}</span> : null}
      {res?.aviso ? <span role="status" className="text-xs text-exito">{res.aviso}</span> : null}
      {puedeProbar && activa ? <button type="button" disabled={pendiente} className={clasesBoton("secundario")} onClick={() => iniciar(async () => { setRes(null); setRes(await probar(id)); })}><Send className="size-4" aria-hidden />{pendiente ? "Enviando…" : "Probar"}</button> : null}
      {puedeAdministrar ? (
        <>
          <button type="button" disabled={pendiente} className={clasesBoton("fantasma")} onClick={() => iniciar(async () => { setRes(await activar(id, !activa)); })}><Power className="size-4" aria-hidden />{activa ? "Desactivar" : "Activar"}</button>
          <BotonConfirmar etiqueta="Eliminar" titulo="Eliminar la impresora" confirmar="Sí, eliminar" variante="peligro" icono={<Trash2 className="size-4" aria-hidden />} accion={borrar.bind(null, id)}>
            Se quita de la lista. Las etiquetas se podrán seguir descargando en ZPL.
          </BotonConfirmar>
        </>
      ) : null}
    </div>
  );
}
