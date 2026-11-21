import Link from "next/link";
import { Etiqueta, Tarjeta, formatearFechaHora, type Tono } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { ESTADOS_CIEGO, listarCiegos } from "@/lib/compras/recibo-ciego";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(v ?? 0));
const TONO: Record<string, Tono> = { por_conciliar: "aviso", autorizado: "exito", rechazado: "neutro" };

function Tabla({ filas, resueltos }: { filas: Record<string, unknown>[]; resueltos: boolean }) {
  if (filas.length === 0) return <p className="p-4 text-sm text-gris-500">{resueltos ? "Todavía no hay recibos resueltos." : "No hay conteos por conciliar."}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-left text-[13.5px]">
        <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Recibo", "Orden", "Fecha", "Contó", "Líneas", "Unidades", "Estado"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {filas.map((r) => (
            <tr key={String(r.id)} className="border-b border-linea last:border-0">
              <td className="px-3 py-2"><Link href={`/inventario/recibos/${r.id}`} className="font-medium text-marca-texto hover:underline">{String(r.id)}</Link></td>
              <td className="px-3 py-2"><Link href={`/inventario/ordenes/${r.orden}`} className="hover:underline">{String(r.orden)}</Link></td>
              <td className="px-3 py-2">{formatearFechaHora(r.fecha as Date)}</td><td className="px-3 py-2">{String(r.contador ?? "—")}</td>
              <td className="px-3 py-2 tabular-nums">{String(r.lineas)}</td><td className="px-3 py-2 tabular-nums">{n(r.unidades)}</td>
              <td className="px-3 py-2"><Etiqueta tono={TONO[String(r.estado)] ?? "neutro"}>{ESTADOS_CIEGO[String(r.estado) as keyof typeof ESTADOS_CIEGO] ?? String(r.estado)}</Etiqueta>{r.nota ? <span className="ml-2 text-xs text-gris-500">{String(r.nota)}</span> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function Recibos() {
  const { db } = await requerirPermiso("inventario", "crear");
  const [pendientes, resueltos] = await Promise.all([listarCiegos(db, "por_conciliar"), listarCiegos(db, "resueltos")]);
  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <h2 className="mb-1 text-base font-semibold">Recibo ciego</h2>
        <p className="max-w-3xl text-[13.5px] text-gris-500">Quien recibe cuenta lo que llegó sin ver lo que se esperaba. El conteo queda por conciliar hasta que un aprobador lo compara con la orden y lo autoriza (se crean las cajas) o lo rechaza. Para contar, abre una orden y elige «Recibo ciego».</p>
      </Tarjeta>
      <Tarjeta><div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Por conciliar ({pendientes.length})</h2></div><Tabla filas={pendientes} resueltos={false} /></Tarjeta>
      <Tarjeta><div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Resueltos</h2></div><Tabla filas={resueltos} resueltos /></Tarjeta>
    </div>
  );
}
