"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Aviso, Etiqueta, Tarjeta, claseControl, clasesBoton } from "@/components/ui";
import { importarMaestroAccion, revisarMaestro, type RespuestaMaestro } from "./acciones";

const MAX_MOSTRADAS = 100;

export function ImportadorMaestro({ id, plural, ruta, puedeActualizar, puedeActualizarClave }: { id: string; plural: string; ruta: string; puedeActualizar: boolean; puedeActualizarClave: boolean }) {
  const formulario = useRef<HTMLFormElement>(null);
  const [respuesta, setRespuesta] = useState<RespuestaMaestro | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [hayArchivo, setHayArchivo] = useState(false);

  function ejecutar(accion: (id: string, f: FormData) => Promise<RespuestaMaestro>) {
    if (!formulario.current) return;
    const datos = new FormData(formulario.current);
    iniciar(async () => setRespuesta(await accion(id, datos)));
  }

  const a = respuesta?.analisis;
  const buenas = a?.filas.filter((f) => f.errores.length === 0) ?? [];
  const malas = a?.filas.filter((f) => f.errores.length > 0) ?? [];
  const nuevas = buenas.filter((f) => f.accion === "crear").length;
  const cambios = buenas.length - nuevas;
  const r = respuesta?.resultado;

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <form ref={formulario} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="archivo" className="text-[13px] font-medium">Planilla de {plural} (.xlsx o .csv)</label>
            <input
              id="archivo" name="archivo" type="file" accept=".xlsx,.csv,.txt"
              onChange={(e) => { setHayArchivo((e.target.files?.length ?? 0) > 0); setRespuesta(null); }}
              className="block w-full max-w-xl text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-[10px] file:border file:border-borde-campo file:bg-white file:px-3.5 file:text-sm file:font-medium hover:file:bg-hover"
            />
          </div>
          {puedeActualizar && puedeActualizarClave ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="modo" className="text-[13px] font-medium">Qué hacer con lo que ya existe</label>
              <select id="modo" name="modo" defaultValue="crear" onChange={() => setRespuesta(null)} className={`${claseControl} max-w-xl pr-9`}>
                <option value="crear">Solo crear nuevos (lo que ya existe se marca como error)</option>
                <option value="actualizar">Crear nuevos y actualizar lo que ya existe (las celdas vacías no cambian el dato)</option>
              </select>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pendiente || !hayArchivo} onClick={() => ejecutar(revisarMaestro)} className={clasesBoton("secundario")}>{pendiente ? "Procesando…" : "Revisar planilla"}</button>
            <button type="button" disabled={pendiente || !hayArchivo || buenas.length === 0 || !!r} onClick={() => ejecutar(importarMaestroAccion)} className={clasesBoton("primario")}>
              {buenas.length > 0 ? `Importar ${buenas.length} fila${buenas.length === 1 ? "" : "s"}` : "Importar"}
            </button>
          </div>
        </form>
      </Tarjeta>

      {respuesta?.error ? <Aviso tono="error">{respuesta.error}</Aviso> : null}

      {r ? (
        <Tarjeta className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><CircleCheck className="size-5 text-exito" aria-hidden />Resultado de la importación</h2>
          <p className="text-sm">
            Se crearon <strong>{r.creadas}</strong>{r.actualizadas > 0 ? <>, se actualizaron <strong>{r.actualizadas}</strong></> : null}{r.omitidas.length > 0 ? <> y se omitieron <strong>{r.omitidas.length}</strong></> : null}.
          </p>
          {r.omitidas.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1 text-[13.5px]">
              {r.omitidas.slice(0, MAX_MOSTRADAS).map((o) => <li key={o.fila} className="text-error">Fila {o.fila} ({o.clave}): {o.motivo}</li>)}
              {r.omitidas.length > MAX_MOSTRADAS ? <li className="text-gris-500">… y {r.omitidas.length - MAX_MOSTRADAS} más.</li> : null}
            </ul>
          ) : null}
          <p className="mt-4 text-sm"><Link href={ruta} className="font-medium text-marca-texto hover:underline">Ir a {plural}</Link></p>
        </Tarjeta>
      ) : a && !respuesta?.error ? (
        <Tarjeta className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold">Revisión de la planilla</h2>
            {nuevas > 0 ? <Etiqueta tono="exito">{nuevas} por crear</Etiqueta> : null}
            {cambios > 0 ? <Etiqueta tono="marca">{cambios} por actualizar</Etiqueta> : null}
            {malas.length > 0 ? <Etiqueta tono="error">{malas.length} con errores</Etiqueta> : null}
            <span className="text-[13px] text-gris-500">{a.total} fila{a.total === 1 ? "" : "s"}</span>
          </div>
          {a.ignoradas.length > 0 ? <div className="mb-3"><Aviso tono="aviso">Columnas que no se usan y se ignoran: {a.ignoradas.join(", ")}.</Aviso></div> : null}
          {malas.length > 0 ? <div className="mb-3"><Aviso tono="aviso">Las filas con errores no se importan; las demás sí. Corrige la planilla y vuelve a revisarla si quieres incluirlas.</Aviso></div> : null}
          {malas.length === 0 ? <p className="flex items-center gap-2 text-sm text-exito"><CircleCheck className="size-4" aria-hidden />Todas las filas están bien.</p> : (
            <ul className="flex flex-col gap-2">
              {malas.slice(0, MAX_MOSTRADAS).map((f) => (
                <li key={f.fila} className="rounded-[12px] border border-[#f3c7c7] bg-error-suave/40 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm"><CircleAlert className="size-4 text-error" aria-hidden /><span className="font-semibold">Fila {f.fila}</span><span className="text-gris-500">{f.clave}</span></div>
                  <ul className="mt-1 list-disc pl-6 text-[13px] text-error">{f.errores.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </li>
              ))}
              {malas.length > MAX_MOSTRADAS ? <li className="text-[13px] text-gris-500">… y {malas.length - MAX_MOSTRADAS} filas con errores más.</li> : null}
            </ul>
          )}
        </Tarjeta>
      ) : null}
    </div>
  );
}
