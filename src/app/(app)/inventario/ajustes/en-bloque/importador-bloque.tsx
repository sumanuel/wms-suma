"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { CircleCheck } from "lucide-react";
import { Aviso, Etiqueta, Tarjeta, claseControl, clasesBoton } from "@/components/ui";
import { aplicarBloqueAccion, revisarBloque, type RespuestaBloque } from "../acciones-aprobacion";

const n = (v: number | null) => (v === null ? "—" : new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(v));
const MAX = 100;

export function ImportadorBloque() {
  const formulario = useRef<HTMLFormElement>(null);
  const [respuesta, setRespuesta] = useState<RespuestaBloque | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [hayArchivo, setHayArchivo] = useState(false);
  const [referencia, setReferencia] = useState("");

  function ejecutar(accion: (f: FormData) => Promise<RespuestaBloque>) {
    if (!formulario.current) return;
    const datos = new FormData(formulario.current);
    iniciar(async () => setRespuesta(await accion(datos)));
  }
  const a = respuesta?.analisis;
  const malas = a?.filas.filter((f) => f.errores.length > 0) ?? [];
  const lista = !!a && !respuesta?.error && malas.length === 0 && a.cajas > 0;
  const r = respuesta?.resumen;

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <form ref={formulario} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="referencia" className="text-[13px] font-medium">Referencia del bloque</label>
              <input id="referencia" name="referencia" maxLength={40} value={referencia} onChange={(e) => { setReferencia(e.target.value); setRespuesta(null); }} placeholder="AJ-2026-01" className={claseControl} />
              <p className="text-[12.5px] text-gris-500">Queda en el motivo y en el documento de cada ajuste.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="archivo" className="text-[13px] font-medium">Planilla (.xlsx o .csv)</label>
              <input id="archivo" name="archivo" type="file" accept=".xlsx,.csv,.txt" onChange={(e) => { setHayArchivo((e.target.files?.length ?? 0) > 0); setRespuesta(null); }}
                className="block w-full text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-[10px] file:border file:border-borde-campo file:bg-white file:px-3.5 file:text-sm file:font-medium hover:file:bg-hover" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pendiente || !hayArchivo} onClick={() => ejecutar(revisarBloque)} className={clasesBoton("secundario")}>{pendiente ? "Procesando…" : "Revisar planilla"}</button>
            <button type="button" disabled={pendiente || !lista || !!r || !referencia.trim()} onClick={() => ejecutar(aplicarBloqueAccion)} className={clasesBoton("primario")}>
              {lista ? `Aplicar ${a!.cajas} ajuste${a!.cajas === 1 ? "" : "s"}` : "Aplicar ajustes"}
            </button>
          </div>
        </form>
      </Tarjeta>

      {respuesta?.error ? <Aviso tono="error">{respuesta.error}</Aviso> : null}

      {r ? (
        <Tarjeta className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><CircleCheck className="size-5 text-exito" aria-hidden />Ajustes aplicados</h2>
          <p className="text-sm">Bloque <strong>{r.referencia}</strong>: <strong>{r.cajas}</strong> caja{r.cajas === 1 ? "" : "s"} ajustada{r.cajas === 1 ? "" : "s"} ({r.aumentan} aumentan, {r.disminuyen} disminuyen).</p>
          <p className="mt-3"><Link href="/inventario/ajustes" className="text-sm font-medium text-marca-texto hover:underline">Ver los ajustes</Link></p>
        </Tarjeta>
      ) : a && !respuesta?.error ? (
        <Tarjeta className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold">Revisión de la planilla</h2>
            {lista ? <Etiqueta tono="exito">Lista para aplicar</Etiqueta> : <Etiqueta tono="error">{malas.length} fila{malas.length === 1 ? "" : "s"} con errores</Etiqueta>}
            <span className="text-[13px] text-gris-500">{a.filas.length} fila{a.filas.length === 1 ? "" : "s"} · {a.aumentan} aumentan · {a.disminuyen} disminuyen</span>
          </div>
          {a.ignoradas.length > 0 ? <div className="mb-3"><Aviso tono="aviso">Columnas que no se usan y se ignoran: {a.ignoradas.join(", ")}.</Aviso></div> : null}
          {malas.length > 0 ? <div className="mb-3"><Aviso tono="aviso">Es todo o nada: corrige las filas con errores y vuelve a revisar.</Aviso></div> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Fila", "Caja", "Artículo", "Saldo antes", "Saldo real", "Diferencia", "Motivo", "Revisión"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {a.filas.slice(0, MAX).map((f) => (
                  <tr key={f.fila} className="border-b border-linea align-top last:border-0">
                    <td className="px-3 py-2">{f.fila}</td><td className="px-3 py-2">{f.caja}</td><td className="px-3 py-2">{f.articulo || "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{n(f.antes)}</td><td className="px-3 py-2 tabular-nums">{n(f.saldo)}</td>
                    <td className="px-3 py-2 tabular-nums">{f.diferencia === null ? "—" : `${f.diferencia > 0 ? "+" : ""}${n(f.diferencia)}`}</td>
                    <td className="px-3 py-2">{f.motivo}</td>
                    <td className="px-3 py-2">{f.errores.length ? <span className="text-error">{f.errores.join(" ")}</span> : <span className="text-exito">OK</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {a.filas.length > MAX ? <p className="mt-2 text-[13px] text-gris-500">Se muestran las primeras {MAX} filas de {a.filas.length}.</p> : null}
        </Tarjeta>
      ) : null}
    </div>
  );
}
