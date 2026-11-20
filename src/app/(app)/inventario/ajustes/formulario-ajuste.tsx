"use client";

import { useState } from "react";
import Link from "next/link";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { MODOS, MOTIVOS } from "@/lib/inventario/ajustes-tipos";
import { ajustar, type EstadoAjuste } from "./acciones";

export function FormularioAjuste({ caja, ean, bodega, saldo, reservado, unidad }: { caja: number; ean: string; bodega: string; saldo: number; reservado: number; unidad: string }) {
  const { estado, pendiente, enviar } = useEnvio<EstadoAjuste>(ajustar, {});
  const [modo, setModo] = useState<keyof typeof MODOS>("fijar");
  const [motivo, setMotivo] = useState("");
  const [cantidad, setCantidad] = useState("");
  const n = Number(cantidad.replace(/\./g, "").replace(",", "."));
  const nuevo = !cantidad.trim() || !Number.isFinite(n) ? null : modo === "fijar" ? n : modo === "sumar" ? saldo + n : saldo - n;
  const dif = nuevo === null ? null : Math.round((nuevo - saldo) * 10000) / 10000;

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <input type="hidden" name="caja" value={caja} />
      <input type="hidden" name="ean" value={ean} />
      <input type="hidden" name="bodega" value={bodega} />
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="modo" className="text-[13px] font-medium">Qué hacer con el saldo</label>
          <select id="modo" name="modo" value={modo} onChange={(e) => setModo(e.target.value as keyof typeof MODOS)} className={`${claseControl} pr-9`}>
            {Object.entries(MODOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cantidad" className="text-[13px] font-medium">{modo === "fijar" ? "Saldo real" : "Cantidad"} ({unidad || "und."})</label>
          <input id="cantidad" name="cantidad" inputMode="decimal" required value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={claseControl} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="motivo" className="text-[13px] font-medium">Motivo</label>
          <select id="motivo" name="motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} className={`${claseControl} pr-9`}>
            <option value="" disabled>Elegir…</option>
            {MOTIVOS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="soporte" className="text-[13px] font-medium">Documento de soporte <span className="font-normal text-gris-500">(opcional)</span></label>
          <input id="soporte" name="soporte" maxLength={50} className={claseControl} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2 xl:col-span-4">
          <label htmlFor="detalle" className="text-[13px] font-medium">Detalle {motivo === "Otro" ? "" : <span className="font-normal text-gris-500">(opcional)</span>}</label>
          <input id="detalle" name="detalle" maxLength={400} required={motivo === "Otro"} placeholder="Qué pasó, quién lo detectó…" className={claseControl} />
        </div>
      </div>
      {dif !== null ? (
        <p className={`text-sm ${dif === 0 ? "text-gris-500" : nuevo !== null && nuevo < reservado ? "text-error" : ""}`}>
          {dif === 0 ? "El saldo ya es ese: no hay nada que ajustar." : <>La caja pasa de <strong>{saldo}</strong> a <strong>{nuevo}</strong> ({dif > 0 ? "aumenta" : "disminuye"} {Math.abs(dif)}).{nuevo !== null && nuevo < reservado ? ` Tiene ${reservado} reservados: no puede quedar por debajo.` : ""}</>}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Guardando…" : "Registrar ajuste"}</button>
        <Link href="/inventario/ajustes" className="text-sm font-medium text-gris-700 hover:text-tinta">Cancelar</Link>
      </div>
    </form>
  );
}
