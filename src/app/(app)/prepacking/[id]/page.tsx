import Link from "next/link";
import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { infoEstadoPicking } from "@/lib/picking/estados";
import { ejecucionPicking, VALIDA_ADUANA, VALIDA_PICKING } from "@/lib/prepacking/servicio";
import { pickearTodoAccion } from "../acciones";
import { TablaPickeo, type LineaPickeo } from "../tabla-pickeo";

const n = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(v);
const dato = (titulo: string, valor: string) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-gris-500">{titulo}</dt>
    <dd className="font-medium">{valor}</dd>
  </div>
);

export default async function EjecucionPicking({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requerirPermiso("prepacking", "ver");
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const d = await ejecucionPicking(ctx.db, id);
  if (!d) notFound();
  const e = d.encabezado;
  const valida = Number(e.valida ?? 0);
  const info = infoEstadoPicking(valida);
  const puedeEditar = tienePermiso(ctx, "prepacking", "editar");
  const lineas: LineaPickeo[] = d.lineas.map((l) => ({
    id: Number(l.id), ubicacion: String(l.ubicacion ?? ""), zona: String(l.zona ?? ""), asignada: String(l.asignada ?? ""), ean: String(l.ean), descripcion: String(l.descripcion ?? ""),
    lote: String(l.lote ?? ""), planeada: Number(l.planeada ?? 0), pickeada: Number(l.estado) === 3, cajaUsada: l.caja_usada == null ? "" : String(l.caja_usada),
    cantidadPickeada: Number(l.pickeada ?? 0), cajaDespacho: l.caja_despacho == null ? null : Number(l.caja_despacho),
  }));
  const hechas = lineas.filter((l) => l.pickeada).length;
  const unidadesPlan = lineas.reduce((s, l) => s + l.planeada, 0);
  const unidadesPick = lineas.filter((l) => l.pickeada).reduce((s, l) => s + l.cantidadPickeada, 0);
  const editable = puedeEditar && valida === VALIDA_PICKING;
  const puedeRevertir = puedeEditar && [VALIDA_PICKING, VALIDA_ADUANA].includes(valida) && d.aduana === 0;

  // Cajas de despacho armadas con lo ya pickeado.
  const cajas = new Map<number, { unidades: number; lineas: number }>();
  for (const l of lineas) if (l.pickeada && l.cajaDespacho != null) {
    const c = cajas.get(l.cajaDespacho) ?? { unidades: 0, lineas: 0 };
    c.unidades += l.cantidadPickeada;
    c.lineas++;
    cajas.set(l.cajaDespacho, c);
  }

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver={valida === VALIDA_ADUANA ? "/prepacking/pickeados" : "/prepacking"} textoVolver="Prepacking" titulo={`Picking ${e.idmovimiento}`} descripcion={e.npedid ? `Pedido ${e.npedid} · bodega ${e.bodegapicking}` : undefined} />

      <Tarjeta className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Avance</h2>
            <Etiqueta tono={info.tono}>{info.texto}</Etiqueta>
          </div>
          {editable && hechas < lineas.length ? (
            <BotonConfirmar etiqueta="Pickear todo como se planeó" titulo="Pickear todo como se planeó" confirmar="Sí, pickear todo" variante="secundario" icono={<ListChecks className="size-4" aria-hidden />} accion={pickearTodoAccion.bind(null, id)}>
              Se confirmarán las {lineas.length - hechas} líneas pendientes con la caja y la cantidad planeadas, en la caja de despacho 1. Úsalo solo si el pickeo fue exactamente como se planeó.
            </BotonConfirmar>
          ) : null}
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {dato("Líneas pickeadas", `${hechas} de ${lineas.length}`)}
          {dato("Unidades", `${n(unidadesPick)} de ${n(unidadesPlan)}`)}
          {dato("Pickeador", e.nom_empacador ?? "—")}
          {dato("Fecha", formatearFechaHora(e.fecha))}
        </dl>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutro-suave" aria-hidden="true">
          <div className="h-full rounded-full bg-marca" style={{ width: `${lineas.length ? (hechas / lineas.length) * 100 : 0}%` }} />
        </div>
        {valida === VALIDA_ADUANA ? <div className="mt-4"><Aviso tono="exito">Todas las líneas están pickeadas: el picking está listo para la aduana.</Aviso></div> : null}
        {d.aduana > 0 ? <div className="mt-4"><Aviso tono="aviso">El picking ya tiene cajas aduanadas: no se puede revertir.</Aviso></div> : null}
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href={`/picking/${id}`} className="font-medium text-marca-texto hover:underline">Ver el picking planeado</Link>
          {valida >= VALIDA_ADUANA && tienePermiso(ctx, "aduana", "ver") ? (
            <Link href={`/aduana/${id}`} className="font-medium text-marca-texto hover:underline">{valida === VALIDA_ADUANA ? "Ir a la aduana" : "Ver la aduana"}</Link>
          ) : null}
        </p>
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea px-5 py-3.5">
          <h2 className="text-base font-semibold">Líneas del picking</h2>
          <p className="text-[13px] text-gris-500">En el orden de la ruta. Confirma la caja de la que sacaste el producto (puede ser otra que la asignada), la cantidad y la caja de despacho.</p>
        </div>
        <TablaPickeo idPicking={id} lineas={lineas} editable={editable} puedeRevertir={puedeRevertir} />
      </Tarjeta>

      {cajas.size > 0 ? (
        <Tarjeta>
          <div className="border-b border-linea px-5 py-3.5">
            <h2 className="text-base font-semibold">Cajas de despacho</h2>
            <p className="text-[13px] text-gris-500">Lo pickeado hasta ahora, por caja de despacho.</p>
          </div>
          <ul className="divide-y divide-linea">
            {[...cajas].sort((a, b) => a[0] - b[0]).map(([num, c]) => (
              <li key={num} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium">Caja {num}</span>
                <span className="tabular-nums text-gris-500">{c.lineas} línea{c.lineas === 1 ? "" : "s"} · {n(c.unidades)} unidades</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      ) : null}
    </div>
  );
}
