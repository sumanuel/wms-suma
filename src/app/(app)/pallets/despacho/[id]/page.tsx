import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, Trash2, Unlock } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Etiqueta, Tarjeta, clasesBoton, formatearFechaHora, type Tono } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { ESTADOS, detallePalletDespacho } from "@/lib/pallets/despacho";
import { ssccPallet } from "@/lib/etiquetas/codigos";
import { eliminar, reabrir } from "../acciones";
import { FormularioAgregar, FormularioCerrar, FormularioDespachar, QuitarCaja } from "../formularios";

const TONO: Record<string, Tono> = { abierto: "exito", cerrado: "aviso", despachado: "neutro" };
const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(v ?? 0));

export default async function FichaPalletDespacho({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string; r?: string }> }) {
  const ctx = await requerirPermiso("pallets", "ver");
  const { id: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const id = Number(t);
  const f = await detallePalletDespacho(ctx.db, id);
  if (!f) notFound();
  const { pallet: p, pickings, listos, totales } = f;
  const q = await searchParams;
  const [guias, pend] = (q.r ?? "").split("-").map(Number);
  const transportadores = p.estado === "cerrado" && tienePermiso(ctx, "despacho", "crear") ? (await ctx.db.transportador.findMany({ where: { estado: 1 }, select: { transportador: true }, orderBy: { transportador: "asc" } })).map((x) => x.transportador) : [];
  return (
    <div className="flex flex-col gap-4">
      <EncabezadoFicha volver="/pallets/despacho" textoVolver="Pallets de despacho" titulo={`Pallet de despacho ${id}`} descripcion={`Bodega ${p.bodega} · creado ${formatearFechaHora(p.creado_en)} · SSCC ${ssccPallet(id)}`} aviso={q.aviso === "creado" ? "Se creó el pallet." : null} />
      {q.aviso === "despachado" ? <Aviso tono={pend > 0 ? "aviso" : "exito"}>Pallet despachado. {guias} guía{guias === 1 ? "" : "s"} generada{guias === 1 ? "" : "s"}{pend > 0 ? `; ${pend} picking${pend === 1 ? "" : "s"} no quedó completo o falló (se ve abajo): su guía se genera cuando se carguen todas sus cajas` : ""}.</Aviso> : null}
      <Tarjeta className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Etiqueta tono={TONO[p.estado] ?? "neutro"}>{ESTADOS[p.estado as keyof typeof ESTADOS] ?? p.estado}</Etiqueta>
          <span className="text-sm text-gris-500">{totales.cajas} cajas · {n(totales.unidades)} unidades · {n(totales.kilos)} kg en las cajas</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {totales.cajas > 0 ? <Link href={`/pallets/despacho/${id}/etiqueta`} className={clasesBoton("secundario")}><Printer className="size-4" aria-hidden />Etiqueta SSCC</Link> : null}
            {p.estado === "cerrado" && tienePermiso(ctx, "pallets", "editar") ? <BotonConfirmar etiqueta="Abrir" titulo="Abrir el pallet" confirmar="Sí, abrir" icono={<Unlock className="size-4" aria-hidden />} accion={reabrir.bind(null, id)}>Podrás agregarle y sacarle cajas otra vez; sus medidas y peso se vuelven a capturar al cerrarlo.</BotonConfirmar> : null}
            {p.estado !== "despachado" && tienePermiso(ctx, "pallets", "eliminar") ? <BotonConfirmar etiqueta="Eliminar" titulo="Eliminar el pallet" confirmar="Sí, eliminar" variante="peligro" icono={<Trash2 className="size-4" aria-hidden />} accion={eliminar.bind(null, id)}>Se deshace el pallet; sus cajas quedan libres para otro pallet.</BotonConfirmar> : null}
          </div>
        </div>
        {p.estado !== "abierto" ? (
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
            {[["Alto (cm)", p.alto], ["Ancho (cm)", p.ancho], ["Largo (cm)", p.largo], ["Peso (kg)", p.peso], ["Transportador", p.transportador], ["Remesa", p.remesa], ["Placa", p.placa], ["Despachado", p.despachado_en ? formatearFechaHora(p.despachado_en) : null]].map(([k, v]) => (
              <div key={String(k)} className="flex flex-col gap-0.5"><dt className="text-xs text-gris-500">{String(k)}</dt><dd className="font-medium">{v === null || v === undefined ? "—" : String(v)}</dd></div>
            ))}
          </dl>
        ) : null}
        {p.estado === "abierto" && tienePermiso(ctx, "pallets", "crear") ? <FormularioAgregar id={id} /> : null}
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Cajas del pallet</h2></div>
        {pickings.length === 0 ? <p className="p-4 text-sm text-gris-500">El pallet está vacío: agrega las cajas de un picking.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Picking", "Pedido", "Cliente", "Cajas aquí", "Del picking", "Unidades", "Cajas"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {pickings.map((x) => (
                  <tr key={String(x.picking)} className="border-b border-linea align-top last:border-0">
                    <td className="px-3 py-2 font-medium">{String(x.picking)}</td><td className="px-3 py-2">{String(x.pedido ?? "—")}</td><td className="px-3 py-2">{String(x.cliente ?? "—")}</td>
                    <td className="px-3 py-2 tabular-nums">{String(x.en_pallet)}</td>
                    <td className="px-3 py-2 tabular-nums">{String(x.total_cajas)}{Number(x.en_pallet) < Number(x.total_cajas) ? <Etiqueta tono="aviso">Partido</Etiqueta> : null}</td>
                    <td className="px-3 py-2 tabular-nums">{n(x.unidades)}</td>
                    <td className="px-3 py-2"><span className="flex flex-wrap gap-1">{(x.cajas as number[]).map((c) => p.estado === "abierto" && tienePermiso(ctx, "pallets", "editar") ? <QuitarCaja key={c} id={id} picking={Number(x.picking)} caja={c} /> : <span key={c} className="rounded-md bg-neutro-suave px-2 py-0.5 text-xs font-medium">{c}</span>)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      {p.estado === "abierto" ? (
        <>
          <Tarjeta>
            <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Pickings listos para cargar ({listos.length})</h2></div>
            {listos.length === 0 ? <p className="p-4 text-sm text-gris-500">No hay pickings con cajas libres en la bodega {p.bodega}.</p> : (
              <ul className="divide-y divide-linea">{listos.map((l) => <li key={String(l.picking)} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm"><span><strong>Picking {String(l.picking)}</strong> · pedido {String(l.pedido ?? "—")} · {String(l.cliente ?? "—")}</span><span className="text-gris-500">{String(l.libres)} de {String(l.cajas)} cajas libres</span></li>)}</ul>
            )}
          </Tarjeta>
          {tienePermiso(ctx, "pallets", "editar") && totales.cajas > 0 ? <Tarjeta className="p-5"><h2 className="mb-3 text-base font-semibold">Cerrar el pallet</h2><FormularioCerrar id={id} sugerido={totales.kilos} /></Tarjeta> : null}
        </>
      ) : null}
      {p.estado === "cerrado" ? (
        tienePermiso(ctx, "despacho", "crear") ? <Tarjeta className="p-5"><h2 className="mb-3 text-base font-semibold">Despachar</h2><FormularioDespachar id={id} transportadores={transportadores} /></Tarjeta> : <Aviso tono="neutro">Despachar el pallet requiere el permiso de crear en Despacho y guías.</Aviso>
      ) : null}
    </div>
  );
}
