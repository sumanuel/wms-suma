import Link from "next/link";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { EncabezadoFicha } from "@/components/ficha";
import { celda } from "@/components/seccion-ficha";
import { Aviso, Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { infoEstadoPicking, VALIDA_LISTO_PARA_PICKING } from "@/lib/picking/estados";
import { pickingCompleto } from "@/lib/picking/servicio";
import { pedidoCompleto } from "@/lib/pedidos/servicio";
import { formatear } from "@/lib/listados";
import { normalizar } from "@/lib/maestros/tipos";
import { eliminar } from "../acciones";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(Number(v ?? 0));
const dato = (titulo: string, valor: string) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-gris-500">{titulo}</dt>
    <dd className="font-medium">{valor}</dd>
  </div>
);

export default async function FichaPicking({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const ctx = await requerirPermiso("picking", "ver");
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const [d, { aviso }] = await Promise.all([pickingCompleto(ctx.db, id), searchParams]);
  if (!d) notFound();
  const e = d.encabezado;
  const info = infoEstadoPicking(e.valida);
  const unidades = d.lineas.reduce((s, l) => s + Number(l.cantidad ?? 0), 0);
  const ubicaciones = new Set(d.lineas.map((l) => String(l.ubicacion))).size;

  // Faltantes: lo pendiente del pedido que este picking no alcanzó a cubrir.
  const pedido = e.npedid ? await pedidoCompleto(ctx.db, e.npedid) : null;
  const asignado = new Map<string, number>();
  for (const l of d.lineas) asignado.set(String(l.ean), (asignado.get(String(l.ean)) ?? 0) + Number(l.cantidad ?? 0));
  const faltantes = (pedido?.lineas ?? [])
    .map((l) => ({ ean: l.ref ?? "", descripcion: l.descripcion ?? l.ref ?? "", falta: Math.round(((l.pares ?? 0) - (l.udsentreg ?? 0) - (asignado.get(l.ref ?? "") ?? 0)) * 10000) / 10000 }))
    .filter((l) => l.ean && l.falta > 0);
  const puedeEliminar = tienePermiso(ctx, "picking", "eliminar") && Number(e.valida ?? 0) === VALIDA_LISTO_PARA_PICKING && d.sscc === 0;

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/picking" textoVolver="Pickings" titulo={`Picking ${e.idmovimiento}`} descripcion={d.cliente ?? undefined} aviso={aviso === "creado" ? "Se generó el picking y se reservaron sus cajas." : null} />

      <Tarjeta className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Resumen</h2>
            <Etiqueta tono={info.tono}>{info.texto}</Etiqueta>
          </div>
          {puedeEliminar ? (
            <BotonConfirmar etiqueta="Eliminar picking" titulo="Eliminar el picking" confirmar="Sí, eliminar" variante="peligro" icono={<Trash2 className="size-4" aria-hidden />} accion={eliminar.bind(null, id)}>
              Se liberan las cajas reservadas y el pedido {e.npedid} vuelve a «En espera», sin picking. Esta acción no se puede deshacer.
            </BotonConfirmar>
          ) : null}
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {dato("Pedido", e.npedid ?? "—")}
          {dato("Bodega", e.bodegapicking)}
          {dato("Fecha", formatearFechaHora(e.fecha))}
          {dato("Pickeador", e.nom_empacador ?? "—")}
          {dato("Líneas", String(d.lineas.length))}
          {dato("Unidades", n(unidades))}
          {dato("Ubicaciones", String(ubicaciones))}
          {dato("Transportador", e.transportador ?? "—")}
        </dl>
        {tienePermiso(ctx, "prepacking", "ver") && [3, 5].includes(Number(e.valida ?? 0)) ? (
          <p className="mt-4 text-sm">
            <Link href={`/prepacking/${id}`} className="font-medium text-marca-texto hover:underline">
              {Number(e.valida ?? 0) === 3 ? "Ir a pickear este picking" : "Ver la ejecución del picking"}
            </Link>
          </p>
        ) : null}
        {e.npedid ? (
          <p className="mt-4 text-sm">
            <Link href={`/pedidos/${encodeURIComponent(e.npedid)}`} className="font-medium text-marca-texto hover:underline">Ver el pedido {e.npedid}</Link>
          </p>
        ) : null}
        {e.observpepack ? <p className="mt-3 rounded-[10px] bg-neutro-suave px-3.5 py-2.5 text-[13.5px] text-gris-700">{e.observpepack}</p> : null}
        {faltantes.length > 0 ? (
          <div className="mt-4">
            <Aviso tono="aviso">
              No alcanzó para todo lo pendiente del pedido: {faltantes.map((f) => `${f.descripcion} (faltan ${n(f.falta)})`).join("; ")}.
            </Aviso>
          </div>
        ) : null}
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea px-5 py-3.5">
          <h2 className="text-base font-semibold">Ruta de picking</h2>
          <p className="text-[13px] text-gris-500">Cajas a pickear, en el orden de la ruta de la bodega.</p>
        </div>
        {d.lineas.length === 0 ? (
          <p className="px-5 py-6 text-[13.5px] text-gris-500">Este picking no tiene líneas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-left text-sm">
              <thead className="bg-[#fafaf8] text-xs text-gris-500">
                <tr>
                  <th className="border-b border-linea px-4 py-2.5 font-medium">#</th>
                  {["Ubicación", "Caja", "Artículo", "Lote", "Vence"].map((t) => <th key={t} className="border-b border-linea px-4 py-2.5 font-medium">{t}</th>)}
                  <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Cantidad</th>
                </tr>
              </thead>
              <tbody>
                {d.lineas.map((l, i) => (
                  <tr key={String(l.id)}>
                    <td className={`${celda} tabular-nums text-gris-500`}>{i + 1}</td>
                    <td className={celda}><span className="font-medium">{formatear(normalizar(l.ubicacion))}</span><span className="block text-xs text-gris-500">Zona {formatear(normalizar(l.zona))}</span></td>
                    <td className={`${celda} tabular-nums`}>{String(l.caja)}</td>
                    <td className={celda}><span className="font-medium">{String(l.descripcion ?? l.ean)}</span><span className="block text-xs text-gris-500">{String(l.ean)}</span></td>
                    <td className={celda}>{formatear(normalizar(l.lote))}</td>
                    <td className={`${celda} whitespace-nowrap`}>{formatear(normalizar(l.vence), "fecha")}</td>
                    <td className={`${celda} text-right tabular-nums font-medium`}>{n(l.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </div>
  );
}
