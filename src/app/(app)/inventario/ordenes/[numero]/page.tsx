import Link from "next/link";
import { notFound } from "next/navigation";
import { PackagePlus } from "lucide-react";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Etiqueta, Tarjeta, clasesBoton, formatearFechaHora, type Tono } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { ESTADOS, fichaOrden } from "@/lib/compras/ordenes";
import { formatearFecha } from "@/lib/indicadores/formato";
import { FormularioRazon } from "./formularios";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(Number(v ?? 0));
const TONO: Record<string, Tono> = { Abierta: "aviso", Parcial: "marca", Cerrada: "exito", Anulada: "neutro" };
const AVISOS: Record<string, string> = { creada: "Se creó la orden de compra.", cerrada: "La orden quedó cerrada con lo que faltaba.", anulada: "La orden quedó anulada." };

export default async function FichaOrden({ params, searchParams }: { params: Promise<{ numero: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const ctx = await requerirPermiso("inventario", "ver");
  const { numero: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const numero = Number(t);
  const f = await fichaOrden(ctx.db, numero);
  if (!f) notFound();
  const { orden, proveedor, lineas, recepciones } = f;
  const abierta = orden.estado === ESTADOS.abierta || orden.estado === ESTADOS.parcial;
  const aviso = AVISOS[(await searchParams).aviso ?? ""];
  const pedido = lineas.reduce((s, l) => s + Number(l.pedido ?? 0), 0), recibido = lineas.reduce((s, l) => s + Number(l.recibido ?? 0), 0);
  return (
    <div className="flex flex-col gap-4">
      <EncabezadoFicha volver="/inventario/ordenes" textoVolver="Órdenes de compra" titulo={`Orden de compra ${numero}`} descripcion={`${proveedor?.nombrecliente ?? orden.proveedor ?? "Sin proveedor"} · ${formatearFechaHora(orden.fechacompra)}`} aviso={aviso} />
      <Tarjeta className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Etiqueta tono={TONO[String(orden.estado)] ?? "neutro"}>{String(orden.estado ?? "—")}</Etiqueta>
          <span className="text-sm text-gris-500">Recibido {n(recibido)} de {n(pedido)}</span>
          {abierta && tienePermiso(ctx, "inventario", "crear") ? <Link href={`/inventario/recepcion?oc=${numero}`} className={clasesBoton("primario", "ml-auto")}><PackagePlus className="size-4" aria-hidden />Recibir mercancía</Link> : null}
        </div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
          {[["NIT", orden.proveedor ?? "—"], ["Elaboró", orden.elabora ?? "—"], ["Cerrada", orden.fecharecibe ? formatearFechaHora(orden.fecharecibe) : "—"], ["Observaciones", orden.observacionescompra ?? "—"], ["Recibo", orden.observacionesrecibo ?? "—"]].map(([k, v]) => (
            <div key={String(k)} className="flex flex-col gap-0.5"><dt className="text-xs text-gris-500">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
        </dl>
      </Tarjeta>
      <Tarjeta>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-[13.5px]">
            <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Artículo", "Bodega", "Esperada", "Pedido", "Recibido", "Pendiente", "Precio"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {lineas.map((l) => (
                <tr key={String(l.id)} className="border-b border-linea last:border-0">
                  <td className="px-3 py-2">{String(l.articulo ?? l.ean)}<span className="block text-xs text-gris-500">{String(l.ean)}</span></td>
                  <td className="px-3 py-2">{String(l.bodega ?? "—")}</td>
                  <td className="px-3 py-2">{l.esperada instanceof Date ? formatearFecha(l.esperada) : "—"}</td>
                  <td className="px-3 py-2 tabular-nums">{n(l.pedido)}</td><td className="px-3 py-2 tabular-nums">{n(l.recibido)}</td>
                  <td className={`px-3 py-2 font-semibold tabular-nums ${Number(l.pendiente) > 0 ? "" : "text-exito"}`}>{n(l.pendiente)}</td>
                  <td className="px-3 py-2 tabular-nums">{l.precio === null ? "—" : n(l.precio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      <Tarjeta>
        <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Recepciones de esta orden</h2></div>
        {recepciones.length === 0 ? <p className="p-4 text-sm text-gris-500">Todavía no se ha recibido nada.</p> : (
          <ul className="divide-y divide-linea">
            {recepciones.map((r, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <span>{formatearFechaHora(r.fecha as Date)} · {String(r.cajas)} caja{Number(r.cajas) === 1 ? "" : "s"} · {n(r.unidades)} unidades</span>
                <Link href={`/pallets/etiquetas/cajas?desde=${r.desde}&hasta=${r.hasta}`} className="font-medium text-marca-texto hover:underline">Etiquetas {String(r.desde)}–{String(r.hasta)}</Link>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
      {abierta && tienePermiso(ctx, "inventario", "editar") ? (
        <Tarjeta className="flex flex-col gap-5 p-5">
          <FormularioRazon numero={numero} tipo="cerrar" />
          {tienePermiso(ctx, "inventario", "eliminar") ? <FormularioRazon numero={numero} tipo="anular" /> : <Aviso tono="neutro">Anular una orden requiere el permiso de eliminar en Inventario.</Aviso>}
        </Tarjeta>
      ) : null}
    </div>
  );
}
