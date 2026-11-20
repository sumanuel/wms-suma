import { Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { formatearFecha } from "@/lib/indicadores/formato";
import { calcularNecesidades, listarTareas } from "@/lib/resurtido/servicio";
import { AccionesTarea, BotonGenerar } from "./botones";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(v ?? 0));
const TONO = { hecha: "exito", cancelada: "neutro" } as const;

export default async function Resurtido() {
  const { db } = await requerirPermiso("inventario", "editar");
  const [necesidades, pendientes, resueltas] = await Promise.all([calcularNecesidades(db), listarTareas(db, "pendiente"), listarTareas(db, "resueltas")]);
  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <h2 className="mb-1 text-base font-semibold">Qué necesita resurtido</h2>
        <p className="mb-4 max-w-3xl text-[13.5px] text-gris-500">Ubicaciones de picking cuyo saldo libre (más lo que ya viene en camino) llegó al mínimo de su regla. Se proponen cajas completas del almacenamiento, primero las que vencen antes, hasta cubrir el máximo.</p>
        {necesidades.length === 0 ? <p className="mb-4 text-sm text-gris-500">Ninguna ubicación de picking necesita resurtido ahora.</p> : (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Ubicación", "Artículo", "Libre", "En camino", "Falta", "Cajas propuestas", "Cubren"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {necesidades.map((x) => (
                  <tr key={x.regla} className="border-b border-linea last:border-0">
                    <td className="px-3 py-2 font-medium">{x.ubicacion}</td><td className="px-3 py-2">{x.ean}</td>
                    <td className="px-3 py-2 tabular-nums">{n(x.libre)}</td><td className="px-3 py-2 tabular-nums">{n(x.enCamino)}</td><td className="px-3 py-2 tabular-nums">{n(x.falta)}</td>
                    <td className="px-3 py-2">{x.cajas.length ? x.cajas.map((c) => `${c.caja} (${c.ubicacion})`).join(", ") : <Etiqueta tono="error">Sin cajas disponibles</Etiqueta>}</td>
                    <td className="px-3 py-2 tabular-nums">{n(x.cubre)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {necesidades.some((x) => x.cajas.length > 0) ? <BotonGenerar /> : null}
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Tareas pendientes ({pendientes.length})</h2></div>
        {pendientes.length === 0 ? <p className="p-4 text-sm text-gris-500">No hay tareas pendientes.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["#", "Caja", "Artículo", "Lote", "Vence", "Cantidad", "De", "A", ""].map((h, i) => <th key={i} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {pendientes.map((t) => (
                  <tr key={String(t.id)} className="border-b border-linea align-top last:border-0">
                    <td className="px-3 py-2">{String(t.id)}</td><td className="px-3 py-2 font-medium">{String(t.caja)}</td>
                    <td className="px-3 py-2">{String(t.articulo ?? t.ean)}</td><td className="px-3 py-2">{String(t.lote ?? "")}</td>
                    <td className="px-3 py-2">{t.vence instanceof Date && t.vence.getUTCFullYear() < 2999 ? formatearFecha(t.vence) : "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{n(t.cantidad)}</td><td className="px-3 py-2">{String(t.origen ?? "")}</td><td className="px-3 py-2 font-medium">{String(t.destino)}</td>
                    <td className="px-3 py-2"><AccionesTarea id={Number(t.id)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Resueltas</h2></div>
        {resueltas.length === 0 ? <p className="p-4 text-sm text-gris-500">Todavía no hay tareas resueltas.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["#", "Fecha", "Caja", "Cantidad", "De", "A", "Estado"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {resueltas.map((t) => (
                  <tr key={String(t.id)} className="border-b border-linea last:border-0">
                    <td className="px-3 py-2">{String(t.id)}</td><td className="px-3 py-2">{formatearFechaHora((t.hecha_en ?? t.creada_en) as Date)}</td><td className="px-3 py-2">{String(t.caja)}</td>
                    <td className="px-3 py-2 tabular-nums">{n(t.cantidad)}</td><td className="px-3 py-2">{String(t.origen ?? "")}</td><td className="px-3 py-2">{String(t.destino)}</td>
                    <td className="px-3 py-2"><Etiqueta tono={TONO[t.estado as keyof typeof TONO] ?? "neutro"}>{String(t.estado)}</Etiqueta>{t.nota ? <span className="ml-2 text-xs text-gris-500">{String(t.nota)}</span> : null}</td>
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
