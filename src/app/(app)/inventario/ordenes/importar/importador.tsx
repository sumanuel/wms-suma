"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Aviso, Etiqueta, Tarjeta, clasesBoton } from "@/components/ui";
import { importarOrdenesAccion, revisarOrdenes, type RespuestaImportacion } from "../acciones";

export function ImportadorOrdenes() {
  const formulario = useRef<HTMLFormElement>(null);
  const [respuesta, setRespuesta] = useState<RespuestaImportacion | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [hayArchivo, setHayArchivo] = useState(false);
  function ejecutar(accion: (f: FormData) => Promise<RespuestaImportacion>) {
    if (!formulario.current) return;
    const datos = new FormData(formulario.current);
    iniciar(async () => setRespuesta(await accion(datos)));
  }
  const a = respuesta?.analisis;
  const buenas = a?.ordenes.filter((o) => o.errores.length === 0) ?? [];
  const r = respuesta?.resultado;
  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <form ref={formulario} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="archivo" className="text-[13px] font-medium">Planilla (.xlsx o .csv)</label>
            <input id="archivo" name="archivo" type="file" accept=".xlsx,.csv,.txt" onChange={(e) => { setHayArchivo((e.target.files?.length ?? 0) > 0); setRespuesta(null); }}
              className="block w-full text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-[10px] file:border file:border-borde-campo file:bg-white file:px-3.5 file:text-sm file:font-medium hover:file:bg-hover" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pendiente || !hayArchivo} onClick={() => ejecutar(revisarOrdenes)} className={clasesBoton("secundario")}>{pendiente ? "Procesando…" : "Revisar planilla"}</button>
            <button type="button" disabled={pendiente || buenas.length === 0 || !!r} onClick={() => ejecutar(importarOrdenesAccion)} className={clasesBoton("primario")}>{buenas.length ? `Importar ${buenas.length} ${buenas.length === 1 ? "orden" : "órdenes"}` : "Importar órdenes"}</button>
          </div>
        </form>
      </Tarjeta>
      {respuesta?.error ? <Aviso tono="error">{respuesta.error}</Aviso> : null}
      {r ? (
        <Tarjeta className="p-5">
          <h2 className="mb-3 text-base font-semibold">Resultado</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {r.creadas.map((c) => <li key={c.clave}>Orden <strong>{c.clave}</strong> → <Link href={`/inventario/ordenes/${c.numero}`} className="font-medium text-marca-texto hover:underline">orden {c.numero}</Link> ({c.lineas} línea{c.lineas === 1 ? "" : "s"})</li>)}
            {r.omitidas.map((o) => <li key={o.clave} className="text-error">Orden {o.clave} no se importó: {o.motivo}</li>)}
          </ul>
        </Tarjeta>
      ) : a && !respuesta?.error ? (
        <Tarjeta className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold">Revisión de la planilla</h2>
            <span className="text-[13px] text-gris-500">{a.filas} fila{a.filas === 1 ? "" : "s"} · {a.ordenes.length} {a.ordenes.length === 1 ? "orden" : "órdenes"}</span>
          </div>
          {a.ignoradas.length > 0 ? <div className="mb-3"><Aviso tono="aviso">Columnas que no se usan y se ignoran: {a.ignoradas.join(", ")}.</Aviso></div> : null}
          <div className="flex flex-col gap-3">
            {a.ordenes.map((o) => (
              <div key={o.clave} className="rounded-[10px] border border-borde p-3">
                <div className="mb-1 flex flex-wrap items-center gap-2"><strong>{o.clave}</strong><span className="text-[13px] text-gris-500">NIT {o.nit} · bodega {o.bodega} · {o.lineas.length} línea{o.lineas.length === 1 ? "" : "s"}</span>{o.errores.length ? <Etiqueta tono="error">{o.errores.length} error{o.errores.length === 1 ? "" : "es"}</Etiqueta> : <Etiqueta tono="exito">Lista</Etiqueta>}</div>
                {o.errores.length ? <ul className="list-disc pl-5 text-[13px] text-error">{o.errores.map((e) => <li key={e}>{e}</li>)}</ul> : <p className="text-[13px] text-gris-500">{o.lineas.map((l) => `${l.articulo || l.ean} × ${l.cantidad}`).join(" · ")}</p>}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-gris-500">Cada orden se crea por separado: una con errores no impide las demás.</p>
        </Tarjeta>
      ) : null}
    </div>
  );
}
