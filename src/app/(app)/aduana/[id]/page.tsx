import Link from "next/link";
import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { infoEstadoPicking } from "@/lib/picking/estados";
import { estadoAduana, VALIDA_ADUANA } from "@/lib/aduana/servicio";
import { PanelAduana } from "../panel-aduana";

const n = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(v);
const dato = (titulo: string, valor: string) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-gris-500">{titulo}</dt>
    <dd className="font-medium">{valor}</dd>
  </div>
);

export default async function FichaAduana({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const ctx = await requerirPermiso("aduana", "ver");
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const [d, { aviso }] = await Promise.all([estadoAduana(ctx.db, id), searchParams]);
  if (!d) notFound();
  const e = d.encabezado;
  const valida = Number(e.valida ?? 0);
  // Solo tiene aduana lo que ya se pickeó por completo (5) o ya se aduanó (7).
  if (![VALIDA_ADUANA, 7].includes(valida)) notFound();
  const info = infoEstadoPicking(valida);
  const editable = valida === VALIDA_ADUANA && tienePermiso(ctx, "aduana", "editar");
  const pickeado = d.productos.reduce((s, p) => s + p.pickeado, 0);
  const empacado = d.productos.reduce((s, p) => s + p.empacado, 0);
  const peso = d.cajas.reduce((s, c) => s + c.items.reduce((t, i) => t + i.peso, 0), 0);

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver={valida === 7 ? "/aduana/pickeados" : "/aduana"} textoVolver="Aduana" titulo={`Picking ${e.idmovimiento}`} descripcion={e.npedid ? `Pedido ${e.npedid}${d.cliente ? ` · ${d.cliente}` : ""}` : undefined} aviso={aviso === "terminado" ? "Se terminó la aduana: el picking quedó listo para factura." : null} />
      <Tarjeta className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-base font-semibold">Resumen</h2>
          <Etiqueta tono={info.tono}>{info.texto}</Etiqueta>
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {dato("Bodega", e.bodegapicking)}
          {dato("Fecha del picking", formatearFechaHora(e.fecha))}
          {dato("Pickeador", e.nom_empacador ?? "—")}
          {dato("Transportador", e.transportador ?? "—")}
          {dato("Pickeado", `${n(pickeado)} und.`)}
          {dato("Empacado", `${n(empacado)} und.`)}
          {dato("Cajas", String(d.cajas.length))}
          {dato("Peso empacado", n(peso))}
        </dl>
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {tienePermiso(ctx, "prepacking", "ver") ? <Link href={`/prepacking/${id}`} className="font-medium text-marca-texto hover:underline">Ver el pickeo</Link> : null}
          {valida === 7 && tienePermiso(ctx, "despacho", "ver") ? <Link href={`/despacho/despachar/${id}`} className="font-medium text-marca-texto hover:underline">Ir a despachar</Link> : null}
          {e.npedid ? <Link href={`/pedidos/${encodeURIComponent(e.npedid)}`} className="font-medium text-marca-texto hover:underline">Ver el pedido {e.npedid}</Link> : null}
        </p>
      </Tarjeta>
      <PanelAduana
        id={id}
        productos={d.productos}
        cajas={d.cajas}
        tipos={d.tipos.map((t) => ({ valor: t.tipo_caja, etiqueta: `${t.tipo_caja}${t.descripcioncaja ? ` · ${t.descripcioncaja}` : ""}` }))}
        editable={editable}
      />
    </div>
  );
}
