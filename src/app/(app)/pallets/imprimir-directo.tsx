"use client";

import { Download, Printer } from "lucide-react";
import { useState, useSyncExternalStore, useTransition } from "react";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { imprimirEn } from "./impresoras/acciones";

type Referencia = { picking?: number; caja?: number; desde?: number; hasta?: number; numero?: number; id?: number };

const CLAVE = "wms.impresora";
const oyentes = new Set<() => void>();
const suscribir = (f: () => void) => { oyentes.add(f); window.addEventListener("storage", f); return () => { oyentes.delete(f); window.removeEventListener("storage", f); }; };
const leerGuardada = () => { try { return window.localStorage.getItem(CLAVE) ?? ""; } catch { return ""; } };
const guardar = (v: string) => { try { window.localStorage.setItem(CLAVE, v); } catch { /* sin almacenamiento local */ } oyentes.forEach((f) => f()); };

// Impresión directa en una impresora de etiquetas (ZPL por red) y descarga del ZPL. Recuerda la última impresora elegida en este equipo.
export function ImprimirDirecto({ tipo, referencia, impresoras, puedeImprimir }: { tipo: string; referencia: Referencia; impresoras: { id: number; nombre: string }[]; puedeImprimir: boolean }) {
  const guardada = useSyncExternalStore(suscribir, leerGuardada, () => "");
  const id = impresoras.some((i) => String(i.id) === guardada) ? guardada : impresoras[0] ? String(impresoras[0].id) : "";
  const [res, setRes] = useState<{ error?: string; aviso?: string } | null>(null);
  const [pendiente, iniciar] = useTransition();
  const query = new URLSearchParams({ tipo, ...Object.fromEntries(Object.entries(referencia).map(([k, v]) => [k, String(v)])) }).toString();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {puedeImprimir && impresoras.length > 0 ? (
        <>
          <select aria-label="Impresora de etiquetas" value={id} onChange={(e) => guardar(e.target.value)} className={`${claseControl} h-9 w-auto pr-9`}>
            {impresoras.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
          <button type="button" disabled={pendiente || !id} className={clasesBoton("primario")} onClick={() => iniciar(async () => { setRes(null); setRes(await imprimirEn(Number(id), tipo, referencia)); })}>
            <Printer className="size-4" aria-hidden />{pendiente ? "Enviando…" : "Imprimir directo"}
          </button>
        </>
      ) : null}
      <a href={`/pallets/zpl?${query}`} className={clasesBoton("secundario")}><Download className="size-4" aria-hidden />Descargar ZPL</a>
      {res?.error ? <Aviso tono="error">{res.error}</Aviso> : null}
      {res?.aviso ? <Aviso tono="exito">{res.aviso}</Aviso> : null}
    </div>
  );
}
