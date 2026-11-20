"use client";

import { Fragment } from "react";
import { Undo2 } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { celda } from "@/components/seccion-ficha";
import { Etiqueta, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { pickear, revertir, type EstadoPickeo } from "./acciones";

export type LineaPickeo = {
  id: number; ubicacion: string; zona: string; asignada: string; ean: string; descripcion: string; lote: string; planeada: number;
  pickeada: boolean; cajaUsada: string; cantidadPickeada: number; cajaDespacho: number | null;
};

const n = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(v);

function FilaPendiente({ idPicking, l, editable, columnas }: { idPicking: number; l: LineaPickeo; editable: boolean; columnas: number }) {
  const { estado, pendiente, enviar } = useEnvio<EstadoPickeo>(pickear.bind(null, idPicking, l.id), {});
  const f = `pk-${l.id}`;
  return (
    <Fragment>
      <tr>
        <td className={celda}><span className="font-medium">{l.ubicacion}</span><span className="block text-xs text-gris-500">Zona {l.zona}</span></td>
        <td className={celda}><span className="font-medium">{l.descripcion || l.ean}</span><span className="block text-xs text-gris-500">{l.ean} · lote {l.lote}</span></td>
        <td className={`${celda} text-right tabular-nums`}>{n(l.planeada)}</td>
        {editable ? (
          <>
            <td className={celda}>
              <form id={f} onSubmit={enviar} />
              <label htmlFor={`caja-${l.id}`} className="sr-only">Caja pickeada</label>
              <input id={`caja-${l.id}`} name="caja" form={f} inputMode="numeric" defaultValue={l.asignada} className={`${claseControl} h-9 w-28 tabular-nums`} />
            </td>
            <td className={celda}>
              <label htmlFor={`cant-${l.id}`} className="sr-only">Cantidad pickeada</label>
              <input id={`cant-${l.id}`} name="cantidad" form={f} inputMode="decimal" defaultValue={String(l.planeada).replace(".", ",")} className={`${claseControl} h-9 w-24 text-right tabular-nums`} />
            </td>
            <td className={celda}>
              <label htmlFor={`desp-${l.id}`} className="sr-only">Caja de despacho</label>
              <input id={`desp-${l.id}`} name="despacho" form={f} inputMode="numeric" defaultValue="1" className={`${claseControl} h-9 w-20 text-right tabular-nums`} />
            </td>
            <td className={`${celda} text-right`}>
              <button type="submit" form={f} disabled={pendiente} className={clasesBoton("primario", "h-9")}>{pendiente ? "…" : "Pickear"}</button>
            </td>
          </>
        ) : (
          <td className={celda} colSpan={4}><Etiqueta tono="aviso">Pendiente</Etiqueta> <span className="text-xs text-gris-500">caja asignada {l.asignada}</span></td>
        )}
      </tr>
      {estado.error ? (
        <tr><td colSpan={columnas} className="border-b border-[#f1f1ee] bg-error-suave px-4 py-2 text-[13px] text-error">{estado.error}</td></tr>
      ) : null}
    </Fragment>
  );
}

export function TablaPickeo({ idPicking, lineas, editable, puedeRevertir }: { idPicking: number; lineas: LineaPickeo[]; editable: boolean; puedeRevertir: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse text-left text-sm">
        <thead className="bg-[#fafaf8] text-xs text-gris-500">
          <tr>
            <th className="border-b border-linea px-4 py-2.5 font-medium">Ubicación</th>
            <th className="border-b border-linea px-4 py-2.5 font-medium">Artículo</th>
            <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Planeado</th>
            <th className="border-b border-linea px-4 py-2.5 font-medium">Caja pickeada</th>
            <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Cantidad</th>
            <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Caja de despacho</th>
            <th className="border-b border-linea px-4 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {lineas.map((l) =>
            l.pickeada ? (
              <tr key={l.id} className="bg-[#fbfdfb]">
                <td className={celda}><span className="font-medium">{l.ubicacion}</span><span className="block text-xs text-gris-500">Zona {l.zona}</span></td>
                <td className={celda}><span className="font-medium">{l.descripcion || l.ean}</span><span className="block text-xs text-gris-500">{l.ean} · lote {l.lote}</span></td>
                <td className={`${celda} text-right tabular-nums`}>{n(l.planeada)}</td>
                <td className={`${celda} tabular-nums`}>{l.cajaUsada}{l.cajaUsada !== l.asignada ? <span className="block text-xs text-aviso">asignada {l.asignada}</span> : null}</td>
                <td className={`${celda} text-right tabular-nums`}>
                  {n(l.cantidadPickeada)}
                  {l.cantidadPickeada < l.planeada ? <span className="block text-xs text-aviso">faltó {n(l.planeada - l.cantidadPickeada)}</span> : null}
                </td>
                <td className={`${celda} text-right tabular-nums`}>{l.cajaDespacho ?? "—"}</td>
                <td className={`${celda} text-right`}>
                  <span className="inline-flex items-center gap-2">
                    <Etiqueta tono="exito">Pickeada</Etiqueta>
                    {puedeRevertir ? (
                      <BotonConfirmar etiqueta="Revertir" titulo="Revertir el pickeo" confirmar="Sí, revertir" variante="secundario" icono={<Undo2 className="size-4" aria-hidden />} accion={revertir.bind(null, idPicking, l.id)}>
                        Se devuelven {n(l.cantidadPickeada)} a la caja {l.cajaUsada}, se vuelve a reservar la caja asignada y la línea queda pendiente.
                      </BotonConfirmar>
                    ) : null}
                  </span>
                </td>
              </tr>
            ) : (
              <FilaPendiente key={l.id} idPicking={idPicking} l={l} editable={editable} columnas={7} />
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
