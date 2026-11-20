"use client";

import { Trash2 } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { celda } from "@/components/seccion-ficha";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { agregarLineaPedido, guardarLineasPedido, quitarLineaPedido, type EstadoLineas } from "./acciones";

export type LineaVista = {
  contador: number; ean: string; descripcion: string; unidad: string; bodega: string; pedido: number; entregado: number; reservado: number;
  precio: number; disponible: number; observaciones: string;
};

const n = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(v);

export function LineasPedido({ numero, lineas, editable, bodegas }: { numero: string; lineas: LineaVista[]; editable: boolean; bodegas: { valor: string; etiqueta: string }[] }) {
  const { estado, pendiente, enviar: guardar } = useEnvio<EstadoLineas>(guardarLineasPedido.bind(null, numero), {});
  const { estado: estadoAgregar, pendiente: agregando, enviar: agregar } = useEnvio<EstadoLineas>(agregarLineaPedido.bind(null, numero), {}, { limpiarSiExito: true });
  const total = lineas.reduce((s, l) => s + l.pedido * l.precio, 0);

  const cabecera = (
    <thead className="bg-[#fafaf8] text-xs text-gris-500">
      <tr>
        <th className="border-b border-linea px-4 py-2.5 font-medium">Artículo</th>
        <th className="border-b border-linea px-4 py-2.5 font-medium">Bodega</th>
        {["Pedido", "Entregado", "Reservado", "Disponible", "Precio", "Total"].map((t) => (
          <th key={t} className="border-b border-linea px-4 py-2.5 text-right font-medium">{t}</th>
        ))}
        {editable ? <th className="border-b border-linea px-2 py-2.5" /> : null}
      </tr>
    </thead>
  );
  const nombre = (l: LineaVista) => (
    <>
      <span className="font-medium">{l.descripcion || l.ean}</span>
      <span className="block text-xs text-gris-500">{l.ean}{l.observaciones ? ` · ${l.observaciones}` : ""}</span>
    </>
  );

  return (
    <div className="flex flex-col">
      {lineas.length === 0 ? (
        <p className="px-5 py-6 text-[13.5px] text-gris-500">Todavía no tiene líneas.{editable ? " Agrega la primera abajo." : ""}</p>
      ) : editable ? (
        <form onSubmit={guardar}>
          {estado.error ? <div className="px-4 pt-4"><Aviso tono="error">{estado.error}</Aviso></div> : null}
          {estado.mensaje ? <div className="px-4 pt-4"><Aviso tono="exito">{estado.mensaje}</Aviso></div> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-left text-sm">
              {cabecera}
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.contador}>
                    <td className={celda}>{nombre(l)}</td>
                    <td className={celda}>{l.bodega}</td>
                    <td className={`${celda} text-right`}>
                      <label htmlFor={`c_${l.contador}`} className="sr-only">Cantidad de {l.ean}</label>
                      <input id={`c_${l.contador}`} name={`c_${l.contador}`} inputMode="decimal" defaultValue={String(l.pedido).replace(".", ",")} className={`${claseControl} h-9 w-24 text-right tabular-nums`} />
                    </td>
                    <td className={`${celda} text-right tabular-nums`}>{n(l.entregado)}</td>
                    <td className={`${celda} text-right tabular-nums`}>{n(l.reservado)}</td>
                    <td className={`${celda} text-right tabular-nums ${l.disponible < l.pedido - l.entregado ? "text-aviso" : ""}`}>{n(l.disponible)}</td>
                    <td className={`${celda} text-right`}>
                      <label htmlFor={`p_${l.contador}`} className="sr-only">Precio de {l.ean}</label>
                      <input id={`p_${l.contador}`} name={`p_${l.contador}`} inputMode="decimal" defaultValue={String(l.precio).replace(".", ",")} className={`${claseControl} h-9 w-28 text-right tabular-nums`} />
                    </td>
                    <td className={`${celda} text-right tabular-nums`}>{n(l.pedido * l.precio)}</td>
                    <td className={`${celda} text-right`}>
                      <BotonConfirmar etiqueta="Quitar" titulo="Quitar la línea" confirmar="Sí, quitar" variante="peligro" icono={<Trash2 className="size-4" aria-hidden />} accion={quitarLineaPedido.bind(null, numero, l.contador)}>
                        Se quitará «{l.descripcion || l.ean}» del pedido.
                      </BotonConfirmar>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea px-4 py-3.5">
            <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Guardando…" : "Guardar líneas"}</button>
            <span className="text-sm font-semibold tabular-nums">Total: {n(total)}</span>
          </div>
        </form>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            {cabecera}
            <tbody>
              {lineas.map((l) => (
                <tr key={l.contador}>
                  <td className={celda}>{nombre(l)}</td>
                  <td className={celda}>{l.bodega}</td>
                  <td className={`${celda} text-right tabular-nums`}>{n(l.pedido)}</td>
                  <td className={`${celda} text-right tabular-nums`}>{n(l.entregado)}</td>
                  <td className={`${celda} text-right tabular-nums`}>{n(l.reservado)}</td>
                  <td className={`${celda} text-right tabular-nums`}>{n(l.disponible)}</td>
                  <td className={`${celda} text-right tabular-nums`}>{n(l.precio)}</td>
                  <td className={`${celda} text-right tabular-nums`}>{n(l.pedido * l.precio)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={7} className="px-4 py-3 text-right text-sm font-semibold">Total</td><td className="px-4 py-3 text-right text-sm font-semibold tabular-nums">{n(total)}</td></tr>
            </tfoot>
          </table>
        </div>
      )}

      {editable ? (
        <form onSubmit={agregar} className="flex flex-col gap-3 border-t border-linea px-5 py-4">
          <h3 className="text-sm font-semibold">Agregar línea</h3>
          {estadoAgregar.error ? <Aviso tono="error">{estadoAgregar.error}</Aviso> : null}
          {estadoAgregar.mensaje ? <Aviso tono="exito">{estadoAgregar.mensaje}</Aviso> : null}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="flex flex-col gap-1.5 xl:col-span-2">
              <label htmlFor="ean" className="text-[13px] font-medium">Artículo (código de barras)</label>
              <input id="ean" name="ean" required maxLength={50} className={claseControl} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bodega" className="text-[13px] font-medium">Bodega</label>
              <select id="bodega" name="bodega" required defaultValue="" className={`${claseControl} pr-9`}>
                <option value="" disabled>Elegir…</option>
                {bodegas.map((b) => <option key={b.valor} value={b.valor}>{b.etiqueta}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="cantidad" className="text-[13px] font-medium">Cantidad</label>
              <input id="cantidad" name="cantidad" required inputMode="decimal" className={claseControl} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="precio" className="text-[13px] font-medium">Precio unitario</label>
              <input id="precio" name="precio" inputMode="decimal" defaultValue="0" className={claseControl} />
            </div>
          </div>
          <div><button type="submit" disabled={agregando} className={clasesBoton("secundario")}>{agregando ? "Agregando…" : "Agregar línea"}</button></div>
        </form>
      ) : null}
    </div>
  );
}
