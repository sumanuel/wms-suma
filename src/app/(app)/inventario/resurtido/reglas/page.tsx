import { Trash2 } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { listarReglas } from "@/lib/resurtido/servicio";
import { borrarRegla } from "../acciones";
import { FormularioRegla } from "./formulario-regla";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(v ?? 0));

export default async function Reglas() {
  const ctx = await requerirPermiso("inventario", "editar");
  const [reglas, bodegas] = await Promise.all([listarReglas(ctx.db), bodegasConStock(ctx.db)]);
  return (
    <div className="flex flex-col gap-5">
      {tienePermiso(ctx, "inventario", "crear") ? (
        <Tarjeta className="p-5">
          <h2 className="mb-1 text-base font-semibold">Nueva regla</h2>
          <p className="mb-4 max-w-3xl text-[13.5px] text-gris-500">Cuánto debe haber de un artículo en una ubicación de picking: cuando lo libre llega al mínimo se piden cajas hasta el máximo.</p>
          <FormularioRegla bodegas={bodegas} />
        </Tarjeta>
      ) : null}
      <Tarjeta>
        <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Reglas ({reglas.length})</h2></div>
        {reglas.length === 0 ? <p className="p-4 text-sm text-gris-500">Todavía no hay reglas de resurtido.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Bodega", "Ubicación", "Artículo", "Mínimo", "Máximo", "Libre hoy", "En camino", ""].map((h, i) => <th key={i} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {reglas.map((r) => (
                  <tr key={String(r.id)} className="border-b border-linea last:border-0">
                    <td className="px-3 py-2">{String(r.bodega)}</td><td className="px-3 py-2 font-medium">{String(r.ubicacion)}</td>
                    <td className="px-3 py-2">{String(r.articulo ?? r.ean)}<span className="block text-xs text-gris-500">{String(r.ean)}</span></td>
                    <td className="px-3 py-2 tabular-nums">{n(r.minimo)}</td><td className="px-3 py-2 tabular-nums">{n(r.maximo)}</td>
                    <td className={`px-3 py-2 tabular-nums ${Number(r.libre) <= Number(r.minimo) ? "font-semibold text-error" : ""}`}>{n(r.libre)}</td><td className="px-3 py-2 tabular-nums">{n(r.en_camino)}</td>
                    <td className="px-3 py-2 text-right">
                      {tienePermiso(ctx, "inventario", "eliminar") ? (
                        <BotonConfirmar etiqueta="Eliminar" titulo="Eliminar la regla" confirmar="Sí, eliminar" variante="peligro" icono={<Trash2 className="size-4" aria-hidden />} accion={borrarRegla.bind(null, Number(r.id))}>
                          Se elimina la regla y se cancelan sus tareas pendientes. El inventario no cambia.
                        </BotonConfirmar>
                      ) : null}
                    </td>
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
