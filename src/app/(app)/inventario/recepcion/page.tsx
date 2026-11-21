import Link from "next/link";
import { Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { ESTADOS_CALIDAD } from "@/lib/inventario/calidad";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { ESTADOS, fichaOrden, ordenesPorRecibir } from "@/lib/compras/ordenes";
import { recepcionesRecientes } from "@/lib/recepcion/servicio";
import { Aviso } from "@/components/ui";
import { FormularioCiego } from "./formulario-ciego";
import { FormularioRecepcion, type OrdenParaRecibir } from "./formulario-recepcion";

export default async function Recepcion({ searchParams }: { searchParams: Promise<{ oc?: string; ciego?: string }> }) {
  const { db } = await requerirPermiso("inventario", "crear");
  const q = await searchParams;
  const [bodegas, recientes, porRecibir] = await Promise.all([bodegasConStock(db), recepcionesRecientes(db), ordenesPorRecibir(db)]);
  let orden: OrdenParaRecibir | undefined;
  let problema: string | null = null;
  if (q.oc) {
    const f = /^\d+$/.test(q.oc) ? await fichaOrden(db, Number(q.oc)) : null;
    if (!f) problema = `No existe la orden de compra ${q.oc}.`;
    else if (f.orden.estado !== ESTADOS.abierta && f.orden.estado !== ESTADOS.parcial) problema = `La orden ${q.oc} está ${String(f.orden.estado).toLowerCase()}: no admite recepciones.`;
    else {
      const pend = f.lineas.filter((l) => Number(l.pendiente) > 0);
      if (pend.length === 0) problema = `La orden ${q.oc} no tiene nada pendiente.`;
      else orden = { numero: f.orden.numordencompra, proveedor: f.orden.proveedor ?? "", bodega: String(pend[0].bodega ?? ""), lineas: pend.map((l) => ({ ean: String(l.ean), articulo: String(l.articulo ?? l.ean), pendiente: Number(l.pendiente) })) };
    }
  }
  if (orden && q.ciego === "1") {
    return (
      <div className="flex flex-col gap-5">
        <Tarjeta className="p-5">
          <h2 className="mb-1 text-base font-semibold">Recibo ciego de la orden {orden.numero}</h2>
          <p className="mb-4 max-w-3xl text-[13.5px] text-gris-500">Cuenta lo que llegó sin mirar lo que se esperaba: no se muestran las cantidades de la orden. El conteo queda por conciliar y no crea inventario hasta que un aprobador lo autorice.</p>
          <FormularioCiego orden={orden.numero} estados={[...ESTADOS_CALIDAD]} />
        </Tarjeta>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <h2 className="mb-1 text-base font-semibold">{orden ? `Recibir contra la orden de compra ${orden.numero}` : "Recibir mercancía"}</h2>
        {problema ? <div className="mb-3"><Aviso tono="error">{problema}</Aviso></div> : null}
        <p className="mb-4 max-w-3xl text-[13.5px] text-gris-500">
          Cada línea crea una caja por rótulo en la ubicación de recibo de la bodega (la que se llama RECIBO o RECEPCION) y, si el lote no existe, lo crea. Después se imprimen las etiquetas y se lleva cada caja a su lugar en <Link href="/inventario/almacenar" className="font-medium text-marca-texto hover:underline">Almacenar</Link>. Es todo o nada.
        </p>
        <FormularioRecepcion key={orden?.numero ?? "libre"} bodegas={bodegas} estados={[...ESTADOS_CALIDAD]} orden={orden} />
        {!orden && porRecibir.length > 0 ? (
          <div className="mt-5 border-t border-linea pt-4">
            <h3 className="mb-2 text-sm font-semibold">Órdenes de compra por recibir</h3>
            <ul className="flex flex-wrap gap-2">
              {porRecibir.map((o) => <li key={String(o.numero)}><Link href={`/inventario/recepcion?oc=${o.numero}`} className="inline-flex h-9 items-center rounded-full bg-neutro-suave px-3.5 text-sm font-medium hover:bg-hover">OC {String(o.numero)} · {String(o.proveedor ?? "—")} · faltan {new Intl.NumberFormat("es-CO").format(Number(o.pendiente))}</Link></li>)}
            </ul>
          </div>
        ) : null}
      </Tarjeta>
      <Tarjeta>
        <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Recepciones recientes</h2></div>
        {recientes.length === 0 ? <p className="p-4 text-sm text-gris-500">Todavía no hay recepciones.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Documento", "Fecha", "Bodega", "Cajas", "Unidades", "Etiquetas", "Por almacenar"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {recientes.map((r) => (
                  <tr key={String(r.documento)} className="border-b border-linea last:border-0">
                    <td className="px-3 py-2 font-medium">{String(r.documento)}</td>
                    <td className="px-3 py-2">{formatearFechaHora(r.fecha as Date)}</td>
                    <td className="px-3 py-2">{String(r.bodega ?? "")}</td>
                    <td className="px-3 py-2 tabular-nums">{String(r.cajas)}</td>
                    <td className="px-3 py-2 tabular-nums">{new Intl.NumberFormat("es-CO").format(Number(r.unidades))}</td>
                    <td className="px-3 py-2"><Link href={`/pallets/etiquetas/cajas?desde=${r.desde}&hasta=${r.hasta}`} className="font-medium text-marca-texto hover:underline">{String(r.desde)}–{String(r.hasta)}</Link></td>
                    <td className="px-3 py-2">{Number(r.por_almacenar) > 0 ? <Etiqueta tono="aviso">{String(r.por_almacenar)}</Etiqueta> : <Etiqueta tono="exito">Todo almacenado</Etiqueta>}</td>
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
