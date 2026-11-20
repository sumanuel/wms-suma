"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { CircleAlert, CircleCheck, FileSpreadsheet } from "lucide-react";
import { Aviso, Etiqueta, Tarjeta, clasesBoton } from "@/components/ui";
import type { PedidoAnalizado } from "@/lib/pedidos/importacion";
import { importarArchivo, revisarArchivo, type RespuestaImportacion } from "./acciones";

const valido = (p: PedidoAnalizado) => p.errores.length === 0 && p.lineas.length > 0 && p.lineas.every((l) => l.errores.length === 0);
const n = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(v);

export function Importador() {
  const formulario = useRef<HTMLFormElement>(null);
  const [respuesta, setRespuesta] = useState<RespuestaImportacion | null>(null);
  const [pendiente, iniciar] = useTransition();
  const [hayArchivo, setHayArchivo] = useState(false);

  function ejecutar(accion: (f: FormData) => Promise<RespuestaImportacion>) {
    if (!formulario.current) return;
    const datos = new FormData(formulario.current);
    iniciar(async () => setRespuesta(await accion(datos)));
  }

  const analisis = respuesta?.analisis;
  const buenos = analisis?.pedidos.filter(valido) ?? [];
  const malos = (analisis?.pedidos.length ?? 0) - buenos.length;
  const importado = respuesta?.resultado;

  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <form ref={formulario} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="archivo" className="text-[13px] font-medium">Planilla de pedidos (.xlsx o .csv)</label>
            <input
              id="archivo" name="archivo" type="file" accept=".xlsx,.csv,.txt"
              onChange={(e) => { setHayArchivo((e.target.files?.length ?? 0) > 0); setRespuesta(null); }}
              className="block w-full max-w-xl text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-[10px] file:border file:border-borde-campo file:bg-white file:px-3.5 file:text-sm file:font-medium hover:file:bg-hover"
            />
          </div>
          <label className="flex items-start gap-2.5 text-[13.5px]">
            <input type="checkbox" name="aprobar" className="mt-0.5 size-4 accent-marca-fuerte" />
            <span><span className="font-medium">Dejar los pedidos aprobados</span><span className="block text-gris-500">Si no, quedan «En elaboración» y se aprueban uno a uno.</span></span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pendiente || !hayArchivo} onClick={() => ejecutar(revisarArchivo)} className={clasesBoton("secundario")}>{pendiente ? "Procesando…" : "Revisar planilla"}</button>
            <button type="button" disabled={pendiente || !hayArchivo || buenos.length === 0 || !!importado} onClick={() => ejecutar(importarArchivo)} className={clasesBoton("primario")}>
              {buenos.length > 0 ? `Importar ${buenos.length} pedido${buenos.length === 1 ? "" : "s"}` : "Importar"}
            </button>
          </div>
        </form>
      </Tarjeta>

      {respuesta?.error ? <Aviso tono="error">{respuesta.error}</Aviso> : null}

      {importado ? (
        <Tarjeta className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><CircleCheck className="size-5 text-exito" aria-hidden />Resultado de la importación</h2>
          <p className="text-sm">Se crearon <strong>{importado.creados.length}</strong> pedido{importado.creados.length === 1 ? "" : "s"}{importado.omitidos.length > 0 ? ` y se omitieron ${importado.omitidos.length}` : ""}.</p>
          {importado.creados.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {importado.creados.map((c) => (
                <li key={c.numero}><Link href={`/pedidos/${encodeURIComponent(c.numero)}`} className="inline-flex h-8 items-center rounded-full bg-exito-suave px-3 text-[13px] font-medium text-exito hover:brightness-95">{c.numero} · {c.lineas} línea{c.lineas === 1 ? "" : "s"}</Link></li>
              ))}
            </ul>
          ) : null}
          {importado.omitidos.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1 text-[13.5px]">
              {importado.omitidos.map((o) => <li key={o.numero} className="text-error"><strong>{o.numero}</strong>: {o.motivo}</li>)}
            </ul>
          ) : null}
          <p className="mt-4 text-sm"><Link href="/pedidos" className="font-medium text-marca-texto hover:underline">Ir a los pedidos</Link></p>
        </Tarjeta>
      ) : analisis && !respuesta?.error ? (
        <Tarjeta className="p-5">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold">Revisión de la planilla</h2>
            <Etiqueta tono="exito">{buenos.length} listo{buenos.length === 1 ? "" : "s"}</Etiqueta>
            {malos > 0 ? <Etiqueta tono="error">{malos} con errores</Etiqueta> : null}
            <span className="text-[13px] text-gris-500">{analisis.filas} fila{analisis.filas === 1 ? "" : "s"}</span>
          </div>
          {analisis.ignoradas.length > 0 ? <div className="mb-3"><Aviso tono="aviso">Columnas que no se usan y se ignoran: {analisis.ignoradas.join(", ")}.</Aviso></div> : null}
          {malos > 0 ? <div className="mb-3"><Aviso tono="aviso">Los pedidos con errores no se importan; los demás sí. Corrige la planilla y vuelve a revisarla si quieres incluirlos.</Aviso></div> : null}
          <ul className="flex flex-col gap-2.5">
            {analisis.pedidos.map((p) => {
              const ok = valido(p);
              return (
                <li key={p.numero} className={`rounded-[12px] border px-4 py-3 ${ok ? "border-borde" : "border-[#f3c7c7] bg-error-suave/40"}`}>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    {ok ? <CircleCheck className="size-4 text-exito" aria-hidden /> : <CircleAlert className="size-4 text-error" aria-hidden />}
                    <span className="font-semibold">{p.numero}</span>
                    <span className="text-[13px] text-gris-500">{p.sede ? `${p.sede.nombre} · cliente ${p.sede.nit}` : "sin sede"} · {p.lineas.length} línea{p.lineas.length === 1 ? "" : "s"} · {n(p.lineas.reduce((s, l) => s + l.cantidad, 0))} und.</span>
                  </div>
                  {p.errores.length > 0 ? <ul className="mt-1.5 list-disc pl-6 text-[13px] text-error">{p.errores.map((e, i) => <li key={i}>{e}</li>)}</ul> : null}
                  {p.lineas.some((l) => l.errores.length > 0) ? (
                    <ul className="mt-1.5 list-disc pl-6 text-[13px] text-error">
                      {p.lineas.filter((l) => l.errores.length > 0).flatMap((l) => l.errores.map((e, i) => <li key={`${l.fila}-${i}`}>Fila {l.fila}: {e}</li>))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Tarjeta>
      ) : null}
    </div>
  );
}

export function IconoPlanilla() {
  return <FileSpreadsheet className="size-4" aria-hidden />;
}
