"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { agregar, cerrar, despachar, nuevoPallet, quitar, type Estado } from "./acciones";

export function FormularioNuevo({ bodegas }: { bodegas: { valor: string; etiqueta: string }[] }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>(nuevoPallet, {});
  return (
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bodega" className="text-[13px] font-medium">Bodega</label>
        <select id="bodega" name="bodega" required defaultValue="" className={`${claseControl} w-72 pr-9`}><option value="" disabled>Elegir…</option>{bodegas.map((b) => <option key={b.valor} value={b.valor}>{b.etiqueta}</option>)}</select>
      </div>
      <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Creando…" : "Nuevo pallet de despacho"}</button>
      {estado.error ? <div className="basis-full"><Aviso tono="error">{estado.error}</Aviso></div> : null}
    </form>
  );
}

export function FormularioAgregar({ id }: { id: number }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>(agregar.bind(null, id), {}, { limpiarSiExito: true });
  const router = useRouter();
  return (
    <form onSubmit={(e) => { enviar(e); setTimeout(() => router.refresh(), 600); }} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1.5"><label htmlFor="picking" className="text-[13px] font-medium">Picking</label><input id="picking" name="picking" inputMode="numeric" required className={`${claseControl} w-36`} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="cajas" className="text-[13px] font-medium">Cajas <span className="font-normal text-gris-500">(vacío = todas)</span></label><input id="cajas" name="cajas" placeholder="1, 2, 3" className={`${claseControl} w-48`} /></div>
        <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Agregando…" : "Agregar"}</button>
      </div>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      {estado.aviso ? <Aviso tono="exito">{estado.aviso}</Aviso> : null}
    </form>
  );
}

export function QuitarCaja({ id, picking, caja }: { id: number; picking: number; caja: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  return (
    <span className="inline-flex items-center gap-1">
      <button type="button" disabled={pendiente} aria-label={`Sacar la caja ${caja} del picking ${picking}`} onClick={() => iniciar(async () => { const r = await quitar(id, picking, caja); setError(r.error ?? null); })} className="rounded-md bg-neutro-suave px-2 py-0.5 text-xs font-medium hover:bg-hover">{caja} ✕</button>
      {error ? <span className="text-xs text-error">{error}</span> : null}
    </span>
  );
}

export function FormularioCerrar({ id, sugerido }: { id: number; sugerido: number }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>(cerrar.bind(null, id), {});
  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        {["alto", "ancho", "largo"].map((n) => <div key={n} className="flex flex-col gap-1.5"><label htmlFor={n} className="text-[13px] font-medium">{n[0].toUpperCase() + n.slice(1)} (cm)</label><input id={n} name={n} inputMode="decimal" className={`${claseControl} w-28`} /></div>)}
        <div className="flex flex-col gap-1.5"><label htmlFor="peso" className="text-[13px] font-medium">Peso (kg)</label><input id="peso" name="peso" inputMode="decimal" placeholder={String(sugerido)} className={`${claseControl} w-28`} /></div>
        <button type="submit" disabled={pendiente} className={clasesBoton("secundario")}>{pendiente ? "Cerrando…" : "Cerrar pallet"}</button>
      </div>
      <p className="text-xs text-gris-500">El peso vacío toma la suma de las cajas ({sugerido} kg).</p>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
    </form>
  );
}

export function FormularioDespachar({ id, transportadores }: { id: number; transportadores: string[] }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>(despachar.bind(null, id), {});
  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1.5"><label htmlFor="transportador" className="text-[13px] font-medium">Transportador</label>
          <select id="transportador" name="transportador" required defaultValue="" className={`${claseControl} pr-9`}><option value="" disabled>Elegir…</option>{transportadores.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="remesa" className="text-[13px] font-medium">Remesa <span className="font-normal text-gris-500">(opcional)</span></label><input id="remesa" name="remesa" maxLength={50} className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="placa" className="text-[13px] font-medium">Placa del vehículo <span className="font-normal text-gris-500">(opcional)</span></label><input id="placa" name="placa" maxLength={20} className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="comentario" className="text-[13px] font-medium">Comentario <span className="font-normal text-gris-500">(opcional)</span></label><input id="comentario" name="comentario" maxLength={300} className={claseControl} /></div>
      </div>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <div><button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Despachando…" : "Despachar pallet y generar guías"}</button></div>
    </form>
  );
}
