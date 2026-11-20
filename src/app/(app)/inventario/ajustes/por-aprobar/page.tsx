import Link from "next/link";
import { Aviso, Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { leerUmbral, listarSolicitudes } from "@/lib/inventario/aprobacion";
import { FormularioUmbral, ResolverSolicitud } from "../formularios-aprobacion";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(Number(v ?? 0));
const TONO = { aprobada: "exito", rechazada: "error", pendiente: "aviso" } as const;

export default async function PorAprobar() {
  const ctx = await requerirPermiso("inventario", "editar");
  const aprobador = tienePermiso(ctx, "inventario", "eliminar");
  const [umbral, pendientes, resueltas] = await Promise.all([leerUmbral(ctx.db), listarSolicitudes(ctx.db, "pendiente"), listarSolicitudes(ctx.db, "resueltas")]);
  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <h2 className="mb-1 text-base font-semibold">Umbral de aprobación</h2>
        <p className="mb-4 text-[13.5px] text-gris-500">
          {umbral > 0 ? `Un ajuste manual con una diferencia de más de ${n(umbral)} unidades, hecho por alguien que no puede aprobar, queda pendiente hasta que un aprobador lo resuelva.` : "Hoy todos los ajustes se aplican de inmediato."} Aprobar y anular requiere el permiso de eliminar en Inventario.
        </p>
        {aprobador ? <FormularioUmbral actual={umbral} /> : <Aviso tono="neutro">Solo quien puede aprobar cambia el umbral.</Aviso>}
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Pendientes ({pendientes.length})</h2></div>
        {pendientes.length === 0 ? <p className="p-4 text-sm text-gris-500">No hay solicitudes pendientes.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["#", "Fecha", "Caja", "Artículo", "Saldo", "Diferencia", "Motivo", "Solicitó", aprobador ? "Resolver" : ""].map((h, i) => <th key={i} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {pendientes.map((s) => (
                  <tr key={String(s.id)} className="border-b border-linea align-top last:border-0">
                    <td className="px-3 py-2">{String(s.id)}</td>
                    <td className="px-3 py-2">{formatearFechaHora(s.fecha as Date)}</td>
                    <td className="px-3 py-2 font-medium">{String(s.caja)}</td>
                    <td className="px-3 py-2">{String(s.articulo ?? s.ean)}</td>
                    <td className="px-3 py-2 tabular-nums">{n(s.saldo)}{s.saldo_actual !== null && Number(s.saldo_actual) !== Number(s.saldo) ? <span className="block text-xs text-aviso">hoy: {n(s.saldo_actual)}</span> : null}</td>
                    <td className={`px-3 py-2 font-semibold tabular-nums ${Number(s.diferencia) < 0 ? "text-error" : "text-exito"}`}>{Number(s.diferencia) > 0 ? "+" : ""}{n(s.diferencia)}</td>
                    <td className="px-3 py-2">{String(s.motivo)}{s.detalle ? <span className="block text-xs text-gris-500">{String(s.detalle)}</span> : null}</td>
                    <td className="px-3 py-2">{String(s.solicitante ?? "—")}</td>
                    {aprobador ? <td className="px-3 py-2"><ResolverSolicitud id={Number(s.id)} /></td> : <td />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Resueltas</h2></div>
        {resueltas.length === 0 ? <p className="p-4 text-sm text-gris-500">Todavía no hay solicitudes resueltas.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["#", "Resuelta", "Caja", "Diferencia", "Estado", "Resolvió", "Nota"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {resueltas.map((s) => (
                  <tr key={String(s.id)} className="border-b border-linea last:border-0">
                    <td className="px-3 py-2">{String(s.id)}</td>
                    <td className="px-3 py-2">{formatearFechaHora(s.fecha_resolucion as Date)}</td>
                    <td className="px-3 py-2">{String(s.caja)}</td>
                    <td className="px-3 py-2 tabular-nums">{n(s.diferencia)}</td>
                    <td className="px-3 py-2"><Etiqueta tono={TONO[s.estado as keyof typeof TONO] ?? "neutro"}>{String(s.estado)}</Etiqueta></td>
                    <td className="px-3 py-2">{String(s.resolvio ?? "—")}</td>
                    <td className="px-3 py-2">{String(s.nota ?? "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
      <Link href="/inventario/ajustes" className="text-sm font-medium text-marca-texto hover:underline">Volver a los ajustes</Link>
    </div>
  );
}
