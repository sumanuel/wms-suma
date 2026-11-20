"use client";

import { useState } from "react";
import { CheckCheck, PackagePlus, RotateCcw, Trash2 } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { celda } from "@/components/seccion-ficha";
import { Aviso, Etiqueta, Tarjeta, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { empacarAccion, empacarComoPickeadoAccion, empacarTodoAccion, quitarAccion, reiniciarAccion, terminarAccion, type EstadoEmpaque } from "./acciones";

export type ProductoAduana = { ean: string; descripcion: string; pickeado: number; empacado: number };
export type CajaAduana = { numero: number; tipo: string; items: { id: number; ean: string; descripcion: string; cantidad: number; peso: number; lote: string }[] };
export type TipoCaja = { valor: string; etiqueta: string };

const n = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(v);

function FilaEmpaque({ id, p, tipo, siguienteCaja }: { id: number; p: ProductoAduana; tipo: string; siguienteCaja: number }) {
  const pendiente = Math.round((p.pickeado - p.empacado) * 10000) / 10000;
  const { estado, pendiente: enviando, enviar } = useEnvio<EstadoEmpaque>(empacarAccion.bind(null, id, p.ean), {});
  return (
    <>
      <tr>
        <td className={celda}><span className="font-medium">{p.descripcion}</span><span className="block text-xs text-gris-500">{p.ean}</span></td>
        <td className={`${celda} text-right tabular-nums`}>{n(p.pickeado)}</td>
        <td className={`${celda} text-right tabular-nums`}>{n(p.empacado)}</td>
        <td className={`${celda} text-right tabular-nums ${pendiente > 0 ? "font-semibold" : "text-gris-500"}`}>{pendiente > 0 ? n(pendiente) : <Etiqueta tono="exito">Completo</Etiqueta>}</td>
        <td className={celda}>
          {pendiente > 0 ? (
            <form onSubmit={enviar} className="flex items-center justify-end gap-2">
              <input type="hidden" name="tipo" value={tipo} />
              <label htmlFor={`caja-${p.ean}`} className="sr-only">Caja</label>
              <input id={`caja-${p.ean}`} name="caja" inputMode="numeric" defaultValue={String(siguienteCaja)} title="Caja" className={`${claseControl} h-9 w-20 text-right tabular-nums`} />
              <label htmlFor={`cant-${p.ean}`} className="sr-only">Cantidad</label>
              <input id={`cant-${p.ean}`} name="cantidad" inputMode="decimal" defaultValue={String(pendiente).replace(".", ",")} title="Cantidad" className={`${claseControl} h-9 w-24 text-right tabular-nums`} />
              <button type="submit" disabled={enviando || !tipo} className={clasesBoton("secundario", "h-9")}>{enviando ? "…" : "Empacar"}</button>
            </form>
          ) : null}
        </td>
      </tr>
      {estado.error ? <tr><td colSpan={5} className="border-b border-[#f1f1ee] bg-error-suave px-4 py-2 text-[13px] text-error">{estado.error}</td></tr> : null}
    </>
  );
}

export function PanelAduana({ id, productos, cajas, tipos, editable }: { id: number; productos: ProductoAduana[]; cajas: CajaAduana[]; tipos: TipoCaja[]; editable: boolean }) {
  const [tipo, setTipo] = useState(tipos[0]?.valor ?? "");
  const siguienteCaja = (cajas.reduce((m, c) => Math.max(m, c.numero), 0) || 0) + 1;
  const completo = productos.every((p) => Math.abs(p.pickeado - p.empacado) < 1e-6);

  return (
    <div className="flex flex-col gap-5">
      {editable ? (
        <Tarjeta className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tipo-caja" className="text-[13px] font-medium">Tipo de caja para lo que empaques</label>
              <select id="tipo-caja" value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${claseControl} w-64 pr-9`}>
                {tipos.length === 0 ? <option value="">Sin tipos de caja</option> : null}
                {tipos.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
              </select>
              {tipos.length === 0 ? <p className="text-[12.5px] text-error">Crea al menos un tipo de caja en Maestros › Tipos de caja.</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <BotonConfirmar etiqueta="Empacar como se pickeó" titulo="Empacar como se pickeó" confirmar="Empacar" icono={<PackagePlus className="size-4" aria-hidden />} accion={empacarComoPickeadoAccion.bind(null, id, tipo)}>
                Se empaca lo que falte en las cajas de despacho que se indicaron al pickear, todas del tipo {tipo || "elegido"}.
              </BotonConfirmar>
              <BotonConfirmar etiqueta="Empacar todo en una caja" titulo="Empacar todo en una caja" confirmar="Empacar" icono={<PackagePlus className="size-4" aria-hidden />} accion={empacarTodoAccion.bind(null, id, tipo)}>
                Lo que falte de cada artículo se empaca en una sola caja nueva (la {siguienteCaja}), del tipo {tipo || "elegido"}.
              </BotonConfirmar>
              {cajas.length > 0 ? (
                <BotonConfirmar etiqueta="Reiniciar aduana" titulo="Reiniciar la aduana" confirmar="Sí, reiniciar" variante="peligro" icono={<RotateCcw className="size-4" aria-hidden />} accion={reiniciarAccion.bind(null, id)}>
                  Se quitan todas las cajas armadas y se empieza de nuevo. El picking no cambia.
                </BotonConfirmar>
              ) : null}
              <BotonConfirmar etiqueta="Terminar aduana" titulo="Terminar la aduana" confirmar="Sí, terminar" variante="primario" icono={<CheckCheck className="size-4" aria-hidden />} accion={terminarAccion.bind(null, id)}>
                {completo ? "Todo lo pickeado está empacado. El picking quedará listo para factura y la aduana ya no se podrá modificar." : "Todavía falta empacar parte de lo pickeado: el sistema no dejará terminar hasta que cuadre."}
              </BotonConfirmar>
            </div>
          </div>
        </Tarjeta>
      ) : null}

      <Tarjeta>
        <div className="border-b border-linea px-5 py-3.5">
          <h2 className="text-base font-semibold">Lo pickeado</h2>
          <p className="text-[13px] text-gris-500">Por artículo: lo que se pickeó, lo que ya está en cajas y lo que falta empacar.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-[#fafaf8] text-xs text-gris-500">
              <tr>
                <th className="border-b border-linea px-4 py-2.5 font-medium">Artículo</th>
                {["Pickeado", "Empacado", "Falta"].map((t) => <th key={t} className="border-b border-linea px-4 py-2.5 text-right font-medium">{t}</th>)}
                <th className="border-b border-linea px-4 py-2.5 text-right font-medium">{editable ? "Caja y cantidad a empacar" : ""}</th>
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => (editable ? <FilaEmpaque key={p.ean} id={id} p={p} tipo={tipo} siguienteCaja={siguienteCaja} /> : (
                <tr key={p.ean}>
                  <td className={celda}><span className="font-medium">{p.descripcion}</span><span className="block text-xs text-gris-500">{p.ean}</span></td>
                  <td className={`${celda} text-right tabular-nums`}>{n(p.pickeado)}</td>
                  <td className={`${celda} text-right tabular-nums`}>{n(p.empacado)}</td>
                  <td className={`${celda} text-right`}><Etiqueta tono="exito">Completo</Etiqueta></td>
                  <td className={celda} />
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea px-5 py-3.5">
          <h2 className="text-base font-semibold">Cajas armadas</h2>
          <p className="text-[13px] text-gris-500">{cajas.length === 0 ? "Todavía no hay cajas." : `${cajas.length} caja${cajas.length === 1 ? "" : "s"}.`}</p>
        </div>
        {cajas.length === 0 ? null : (
          <ul className="divide-y divide-linea">
            {cajas.map((c) => {
              const peso = c.items.reduce((s, i) => s + i.peso, 0);
              return (
                <li key={c.numero} className="px-5 py-4">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <h3 className="text-sm font-semibold">Caja {c.numero}</h3>
                    <Etiqueta tono="marca">{c.tipo}</Etiqueta>
                    <span className="text-[13px] text-gris-500 tabular-nums">{n(peso)} de peso</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {c.items.map((i) => (
                      <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] bg-neutro-suave px-3.5 py-2 text-sm">
                        <span><span className="font-medium">{i.descripcion}</span> <span className="text-xs text-gris-500">{i.ean}{i.lote ? ` · lote ${i.lote}` : ""}</span></span>
                        <span className="flex items-center gap-3">
                          <span className="tabular-nums font-medium">{n(i.cantidad)}</span>
                          {editable ? (
                            <BotonConfirmar etiqueta="Quitar" titulo="Quitar de la caja" confirmar="Sí, quitar" variante="secundario" icono={<Trash2 className="size-4" aria-hidden />} accion={quitarAccion.bind(null, id, i.id)}>
                              Se quitan {n(i.cantidad)} de «{i.descripcion}» de la caja {c.numero}; quedan pendientes por empacar.
                            </BotonConfirmar>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>
      {!editable ? null : <Aviso tono="aviso">Mientras no termines la aduana puedes seguir armando, quitando o reiniciando cajas.</Aviso>}
    </div>
  );
}
