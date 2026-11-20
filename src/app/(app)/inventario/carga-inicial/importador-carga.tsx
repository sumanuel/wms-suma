"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { Aviso, Etiqueta, Tarjeta, claseControl, clasesBoton } from "@/components/ui";
import { cargarAccion, revisarCarga, type RespuestaCarga } from "./acciones";

const n = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(v);
const MAX = 100;

export function ImportadorCarga() {
  const formulario = useRef<HTMLFormElement>(null);
  const [respuesta, setRespuesta] = useState<RespuestaCarga | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [hayArchivo, setHayArchivo] = useState(false);
  const [referencia, setReferencia] = useState("");

  function ejecutar(accion: (f: FormData) => Promise<RespuestaCarga>) {
    if (!formulario.current) return;
    const datos = new FormData(formulario.current);
    iniciar(async () => setRespuesta(await accion(datos)));
  }

  const a = respuesta?.analisis;
  const malas = a?.filas.filter((f) => f.errores.length > 0) ?? [];
  const lista = !!a && !respuesta?.error && malas.length === 0 && a.cajas > 0;
  const r = respuesta?.resultado;

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <form ref={formulario} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="referencia" className="text-[13px] font-medium">Referencia de la carga</label>
              <input id="referencia" name="referencia" maxLength={40} value={referencia} onChange={(e) => { setReferencia(e.target.value); setRespuesta(null); }} placeholder="INI-2026-01" className={claseControl} />
              <p className="text-[12.5px] text-gris-500">Identifica la carga en los ajustes y no se puede repetir.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="archivo" className="text-[13px] font-medium">Planilla (.xlsx o .csv)</label>
              <input
                id="archivo" name="archivo" type="file" accept=".xlsx,.csv,.txt"
                onChange={(e) => { setHayArchivo((e.target.files?.length ?? 0) > 0); setRespuesta(null); }}
                className="block w-full text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-[10px] file:border file:border-borde-campo file:bg-white file:px-3.5 file:text-sm file:font-medium hover:file:bg-hover"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pendiente || !hayArchivo || !referencia.trim()} onClick={() => ejecutar(revisarCarga)} className={clasesBoton("secundario")}>{pendiente ? "Procesando…" : "Revisar planilla"}</button>
            <button type="button" disabled={pendiente || !lista || !!r} onClick={() => ejecutar(cargarAccion)} className={clasesBoton("primario")}>
              {lista ? `Cargar ${n(a!.cajas)} caja${a!.cajas === 1 ? "" : "s"} (${n(a!.unidades)} und.)` : "Cargar inventario"}
            </button>
          </div>
        </form>
      </Tarjeta>

      {respuesta?.error ? <Aviso tono="error">{respuesta.error}</Aviso> : null}

      {r ? (
        <Tarjeta className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><CircleCheck className="size-5 text-exito" aria-hidden />Inventario cargado</h2>
          <p className="text-sm">Carga <strong>{r.referencia}</strong>: se crearon <strong>{n(r.cajas)}</strong> caja{r.cajas === 1 ? "" : "s"} con <strong>{n(r.unidades)}</strong> unidades{r.lotesNuevos > 0 ? ` y ${r.lotesNuevos} lote${r.lotesNuevos === 1 ? "" : "s"} nuevo${r.lotesNuevos === 1 ? "" : "s"}` : ""}.</p>
          <p className="mt-3 flex gap-4 text-sm">
            <Link href="/inventario" className="font-medium text-marca-texto hover:underline">Ver las existencias</Link>
            <Link href="/inventario/cajas" className="font-medium text-marca-texto hover:underline">Ver las cajas</Link>
          </p>
        </Tarjeta>
      ) : a && !respuesta?.error ? (
        <Tarjeta className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold">Revisión de la planilla</h2>
            {lista ? <Etiqueta tono="exito">Lista para cargar</Etiqueta> : <Etiqueta tono="error">{malas.length} fila{malas.length === 1 ? "" : "s"} con errores</Etiqueta>}
            <span className="text-[13px] text-gris-500">{a.total} fila{a.total === 1 ? "" : "s"}</span>
          </div>
          {a.ignoradas.length > 0 ? <div className="mb-3"><Aviso tono="aviso">Columnas que no se usan y se ignoran: {a.ignoradas.join(", ")}.</Aviso></div> : null}
          {malas.length > 0 ? <div className="mb-3"><Aviso tono="aviso">Una carga de inventario es todo o nada: corrige las filas con errores y vuelve a revisar.</Aviso></div> : null}
          {malas.length === 0 ? (
            <>
              <dl className="mb-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-5">
                {[["Cajas", a.cajas], ["Unidades", a.unidades], ["Artículos", a.articulos.length], ["Lotes nuevos", a.lotesNuevos], ["Ubicaciones", a.ubicaciones]].map(([t, v]) => (
                  <div key={String(t)} className="flex flex-col gap-0.5"><dt className="text-xs text-gris-500">{t}</dt><dd className="text-lg font-semibold tabular-nums">{n(Number(v))}</dd></div>
                ))}
              </dl>
              <div className="overflow-x-auto rounded-[10px] border border-linea">
                <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                  <thead className="bg-[#fafaf8] text-xs text-gris-500"><tr><th className="border-b border-linea px-4 py-2.5 font-medium">Artículo</th><th className="border-b border-linea px-4 py-2.5 text-right font-medium">Cajas</th><th className="border-b border-linea px-4 py-2.5 text-right font-medium">Unidades</th></tr></thead>
                  <tbody>
                    {a.articulos.slice(0, MAX).map((x) => (
                      <tr key={x.ean}><td className="border-b border-[#f1f1ee] px-4 py-2"><span className="font-medium">{x.descripcion}</span> <span className="text-xs text-gris-500">{x.ean}</span></td><td className="border-b border-[#f1f1ee] px-4 py-2 text-right tabular-nums">{n(x.cajas)}</td><td className="border-b border-[#f1f1ee] px-4 py-2 text-right tabular-nums">{n(x.unidades)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <ul className="flex flex-col gap-2">
              {malas.slice(0, MAX).map((f) => (
                <li key={f.fila} className="rounded-[12px] border border-[#f3c7c7] bg-error-suave/40 px-4 py-2.5">
                  <div className="flex items-center gap-2 text-sm"><CircleAlert className="size-4 text-error" aria-hidden /><span className="font-semibold">Fila {f.fila}</span><span className="text-gris-500">{f.descripcion || f.ean} · {f.ubicacion} · lote {f.lote}</span></div>
                  <ul className="mt-1 list-disc pl-6 text-[13px] text-error">{f.errores.map((e, i) => <li key={i}>{e}</li>)}</ul>
                </li>
              ))}
              {malas.length > MAX ? <li className="text-[13px] text-gris-500">… y {malas.length - MAX} filas con errores más.</li> : null}
            </ul>
          )}
        </Tarjeta>
      ) : null}
    </div>
  );
}
