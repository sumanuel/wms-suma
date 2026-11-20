import Link from "next/link";
import { Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { ESTADOS_CALIDAD } from "@/lib/inventario/calidad";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { recepcionesRecientes } from "@/lib/recepcion/servicio";
import { FormularioRecepcion } from "./formulario-recepcion";

export default async function Recepcion() {
  const { db } = await requerirPermiso("inventario", "crear");
  const [bodegas, recientes] = await Promise.all([bodegasConStock(db), recepcionesRecientes(db)]);
  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <h2 className="mb-1 text-base font-semibold">Recibir mercancía</h2>
        <p className="mb-4 max-w-3xl text-[13.5px] text-gris-500">
          Cada línea crea una caja por rótulo en la ubicación de recibo de la bodega (la que se llama RECIBO o RECEPCION) y, si el lote no existe, lo crea. Después se imprimen las etiquetas y se lleva cada caja a su lugar en <Link href="/inventario/almacenar" className="font-medium text-marca-texto hover:underline">Almacenar</Link>. Es todo o nada.
        </p>
        <FormularioRecepcion bodegas={bodegas} estados={[...ESTADOS_CALIDAD]} />
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
