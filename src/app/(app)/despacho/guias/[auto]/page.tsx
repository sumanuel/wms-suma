import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, PackageCheck, Truck } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { EncabezadoFicha } from "@/components/ficha";
import { celda } from "@/components/seccion-ficha";
import { Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { guiaCompleta } from "@/lib/despacho/servicio";
import { formatear } from "@/lib/listados";
import { normalizar } from "@/lib/maestros/tipos";
import { anularAccion, entregarAccion, enviarAccion } from "../../acciones";
import { BotonImprimir } from "../../boton-imprimir";
import { ESTADOS_GUIA } from "../../estados";

const AVISOS: Record<string, string> = {
  creada: "Se generó la guía y el picking quedó despachado.",
  enviada: "La guía quedó marcada como enviada.",
  entregada: "La guía quedó marcada como entregada al cliente.",
  anulada: "Se anuló la guía: lo entregado volvió al pedido y el picking quedó listo para despachar otra vez.",
};
const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(v ?? 0));
const dato = (titulo: string, valor: string) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-gris-500">{titulo}</dt>
    <dd className="font-medium">{valor || "—"}</dd>
  </div>
);

export default async function FichaGuia({ params, searchParams }: { params: Promise<{ auto: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const ctx = await requerirPermiso("despacho", "ver");
  const auto = Number((await params).auto);
  if (!Number.isSafeInteger(auto)) notFound();
  const [d, { aviso }] = await Promise.all([guiaCompleta(ctx.db, auto), searchParams]);
  if (!d) notFound();
  const g = d.guia;
  const info = ESTADOS_GUIA[d.estado];
  const puedeEditar = tienePermiso(ctx, "despacho", "editar");

  return (
    <div className="flex flex-col gap-5 print:gap-3">
      <div className="print:hidden">
        <EncabezadoFicha volver="/despacho/guias" textoVolver="Guías" titulo={`Guía ${g.num_guia}`} descripcion={`${g.transportador} · pedido ${g.pedido}`} aviso={AVISOS[aviso ?? ""] ?? null} />
      </div>
      <h1 className="hidden text-2xl font-semibold print:block">Guía {g.num_guia} · {g.transportador}</h1>

      <Tarjeta className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Datos de la guía</h2>
            <Etiqueta tono={info.tono}>{info.texto}</Etiqueta>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <BotonImprimir />
            {puedeEditar && d.estado === "generada" ? (
              <BotonConfirmar etiqueta="Marcar enviada" titulo="Marcar como enviada" confirmar="Confirmar" variante="primario" icono={<Truck className="size-4" aria-hidden />} accion={enviarAccion.bind(null, auto)}>
                La mercancía salió con el transportador. Después de esto la guía ya no se puede anular.
              </BotonConfirmar>
            ) : null}
            {puedeEditar && d.estado === "enviada" ? (
              <BotonConfirmar etiqueta="Marcar entregada" titulo="Marcar como entregada" confirmar="Confirmar" variante="primario" icono={<PackageCheck className="size-4" aria-hidden />} accion={entregarAccion.bind(null, auto)}>
                El cliente recibió la mercancía.
              </BotonConfirmar>
            ) : null}
            {puedeEditar && d.estado === "generada" ? (
              <BotonConfirmar etiqueta="Anular guía" titulo="Anular la guía" confirmar="Sí, anular" variante="peligro" icono={<Ban className="size-4" aria-hidden />} accion={anularAccion.bind(null, auto)}>
                Se devuelve al pedido lo entregado y el picking vuelve a quedar listo para despachar. Esta acción no se puede deshacer.
              </BotonConfirmar>
            ) : null}
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {dato("Fecha de despacho", formatearFechaHora(g.fecha_despacho))}
          {dato("Remitente", g.remitente ?? "")}
          {dato("NIT remitente", g.nit_remitente ?? "")}
          {dato("Ciudad de origen", g.ciudad_origen ?? "")}
          {dato("Destinatario", g.destinatario ?? "")}
          {dato("NIT destinatario", g.nit_destinatario ?? "")}
          {dato("Dirección", g.direccion ?? "")}
          {dato("Teléfono", g.telefono ?? "")}
          {dato("Ciudad de destino", g.ciudad_destino ?? "")}
          {dato("Departamento", g.departamento ?? "")}
          {dato("Cajas", String(g.caja1 ?? 0))}
          {dato("Unidades", n(g.unidades))}
          {dato("Peso", n(g.kilos))}
          {dato("Volumen", n(g.volumen))}
          {dato("Valor de la mercancía", n(g.valor_mercancia))}
          {dato("Valor declarado", n(g.valor_declarado))}
          {dato("Flete", n(g.total))}
          {dato("Factura", g.factura ?? "")}
          {dato("Entregada al cliente", g.fecha_entregacliente ? formatearFechaHora(g.fecha_entregacliente) : "")}
        </dl>
        {g.comentario ? <p className="mt-4 rounded-[10px] bg-neutro-suave px-3.5 py-2.5 text-[13.5px] text-gris-700">{g.comentario}</p> : null}
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm print:hidden">
          <Link href={`/pedidos/${encodeURIComponent(g.pedido)}`} className="font-medium text-marca-texto hover:underline">Ver el pedido {g.pedido}</Link>
          {tienePermiso(ctx, "aduana", "ver") ? <Link href={`/aduana/${g.prepackingid}`} className="font-medium text-marca-texto hover:underline">Ver la aduana del picking {g.prepackingid}</Link> : null}
        </p>
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea px-5 py-3.5">
          <h2 className="text-base font-semibold">Contenido</h2>
          <p className="text-[13px] text-gris-500">{d.cajas.length} caja{d.cajas.length === 1 ? "" : "s"}.</p>
        </div>
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#fafaf8] text-xs text-gris-500">
            <tr>
              <th className="border-b border-linea px-4 py-2.5 font-medium">Artículo</th>
              <th className="border-b border-linea px-4 py-2.5 font-medium">Lote</th>
              <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            {d.lineas.map((l) => (
              <tr key={String(l.ean)}>
                <td className={celda}><span className="font-medium">{String(l.descripcion ?? l.ean)}</span><span className="block text-xs text-gris-500">{String(l.ean)}</span></td>
                <td className={celda}>{formatear(normalizar(l.lote))}</td>
                <td className={`${celda} text-right tabular-nums`}>{n(l.cantidad)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {d.cajas.length > 0 ? (
          <ul className="divide-y divide-linea border-t border-linea">
            {d.cajas.map((c) => (
              <li key={String(c.numero)} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="font-medium">Caja {String(c.numero)} <span className="font-normal text-gris-500">· {String(c.tipo)}</span></span>
                <span className="tabular-nums text-gris-500">{n(c.unidades)} unidades · {n(c.kilos)} de peso</span>
              </li>
            ))}
          </ul>
        ) : null}
      </Tarjeta>
    </div>
  );
}
