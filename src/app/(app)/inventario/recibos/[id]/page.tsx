import Link from "next/link";
import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Etiqueta, Tarjeta, formatearFechaHora, type Tono } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { ESTADOS_CIEGO, fichaCiego } from "@/lib/compras/recibo-ciego";
import { formatearFecha } from "@/lib/indicadores/formato";
import { ResolverRecibo } from "./formularios";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(v ?? 0));
const TONO: Record<string, Tono> = { por_conciliar: "aviso", autorizado: "exito", rechazado: "neutro" };
const AVISOS: Record<string, string> = { autorizado: "Se autorizó el recibo: las cajas quedaron en el recibo y la orden se actualizó.", rechazado: "Se rechazó el conteo: no se creó inventario." };

export default async function FichaRecibo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const ctx = await requerirPermiso("inventario", "crear");
  const { id: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const f = await fichaCiego(ctx.db, Number(t));
  if (!f) notFound();
  const { recibo, comparacion, hayDiferencias } = f;
  const abierto = recibo.estado === "por_conciliar";
  const aviso = AVISOS[(await searchParams).aviso ?? ""];
  return (
    <div className="flex flex-col gap-4">
      <EncabezadoFicha volver="/inventario/recibos" textoVolver="Recibos ciegos" titulo={`Recibo ciego ${recibo.id}`} descripcion={`Orden ${recibo.orden} · contó ${recibo.creado_nombre ?? "—"} · ${formatearFechaHora(recibo.fecha)}`} aviso={aviso} />
      <Tarjeta className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Etiqueta tono={TONO[recibo.estado] ?? "neutro"}>{ESTADOS_CIEGO[recibo.estado as keyof typeof ESTADOS_CIEGO] ?? recibo.estado}</Etiqueta>
          <Link href={`/inventario/ordenes/${recibo.orden}`} className="text-sm font-medium text-marca-texto hover:underline">Ver la orden {recibo.orden}</Link>
          {!abierto ? <span className="text-sm text-gris-500">Resolvió {recibo.resuelto_nombre ?? "—"}{recibo.fecha_resolucion ? ` · ${formatearFechaHora(recibo.fecha_resolucion)}` : ""}{recibo.nota ? ` · ${recibo.nota}` : ""}</span> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-[13.5px]">
            <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Artículo", "Pedido", "Faltaba", "Contado", "Diferencia"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {comparacion.map((c) => (
                <tr key={c.ean} className="border-b border-linea last:border-0">
                  <td className="px-3 py-2">{c.articulo}<span className="block text-xs text-gris-500">{c.ean}</span>{!c.enOrden ? <Etiqueta tono="error">No está en la orden</Etiqueta> : null}</td>
                  <td className="px-3 py-2 tabular-nums">{c.enOrden ? n(c.pedido) : "—"}</td><td className="px-3 py-2 tabular-nums">{c.enOrden ? n(c.pendiente) : "—"}</td><td className="px-3 py-2 tabular-nums">{n(c.contado)}</td>
                  <td className={`px-3 py-2 font-semibold tabular-nums ${Math.abs(c.diferencia) < 1e-9 ? "text-exito" : c.diferencia > 0 ? "text-aviso" : "text-error"}`}>{Math.abs(c.diferencia) < 1e-9 ? "Cuadra" : `${c.diferencia > 0 ? "+" : ""}${n(c.diferencia)}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      <Tarjeta>
        <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Lo contado</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-[13.5px]">
            <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Artículo", "Lote", "Vence", "Cajas", "Por caja"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{recibo.lineas.map((l) => <tr key={l.id} className="border-b border-linea last:border-0"><td className="px-3 py-2">{l.ean}</td><td className="px-3 py-2">{l.lote}</td><td className="px-3 py-2">{l.vence ? formatearFecha(l.vence) : "—"}</td><td className="px-3 py-2 tabular-nums">{l.cajas}</td><td className="px-3 py-2 tabular-nums">{n(l.cantidad)}</td></tr>)}</tbody>
          </table>
        </div>
      </Tarjeta>
      {abierto ? (
        tienePermiso(ctx, "inventario", "eliminar") ? <Tarjeta className="p-5"><ResolverRecibo id={recibo.id} hayDiferencias={hayDiferencias} /></Tarjeta> : <Aviso tono="neutro">Autorizar o rechazar un conteo requiere el permiso de eliminar en Inventario.</Aviso>
      ) : null}
    </div>
  );
}
