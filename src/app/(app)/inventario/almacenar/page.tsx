import { Etiqueta, Tarjeta, claseControl, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { contarPendientes, pendientesAlmacenar, sugerirUbicaciones } from "@/lib/recepcion/servicio";
import { formatearFecha } from "@/lib/indicadores/formato";
import { AlmacenarFila } from "./fila-almacenar";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(v ?? 0));

export default async function Almacenar({ searchParams }: { searchParams: Promise<{ bodega?: string }> }) {
  const { db } = await requerirPermiso("inventario", "editar");
  const q = await searchParams;
  const bodega = q.bodega?.trim() || null;
  const [bodegas, pendientes, total] = await Promise.all([bodegasConStock(db), pendientesAlmacenar(db, bodega), contarPendientes(db)]);
  const filas = await Promise.all(pendientes.map(async (p) => ({ p, sug: await sugerirUbicaciones(db, Number(p.caja)) })));
  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <h2 className="mb-1 text-base font-semibold">Almacenamiento dirigido</h2>
        <p className="mb-4 max-w-3xl text-[13.5px] text-gris-500">Cajas que están en el recibo y deben ir a su ubicación. Se sugiere, en este orden, la ubicación fija del artículo, una donde ya está el mismo lote o la posición libre más cercana por la ruta de la bodega. Puedes escribir otra.</p>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bodega" className="text-[13px] font-medium">Bodega</label>
            <select id="bodega" name="bodega" defaultValue={bodega ?? ""} className={`${claseControl} w-64 pr-9`}>
              <option value="">Todas las bodegas</option>
              {bodegas.map((b) => <option key={b.valor} value={b.valor}>{b.etiqueta}</option>)}
            </select>
          </div>
          <button type="submit" className={clasesBoton("secundario")}>Filtrar</button>
          <span className="pb-2 text-sm text-gris-500">{total} caja{total === 1 ? "" : "s"} en el recibo{filas.length < total && !bodega ? ` (se muestran ${filas.length})` : ""}</span>
        </form>
      </Tarjeta>
      <Tarjeta>
        {filas.length === 0 ? <p className="p-4 text-sm text-gris-500">No hay cajas por almacenar.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Caja", "Artículo", "Lote", "Vence", "Calidad", "Saldo", "Está en", "Almacenar en"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {filas.map(({ p, sug }) => (
                  <tr key={String(p.caja)} className="border-b border-linea align-top last:border-0">
                    <td className="px-3 py-2 font-medium">{String(p.caja)}</td>
                    <td className="px-3 py-2">{String(p.articulo ?? p.ean)}<span className="block text-xs text-gris-500">{String(p.origen ?? "")}</span></td>
                    <td className="px-3 py-2">{String(p.lote ?? "")}</td>
                    <td className="px-3 py-2">{p.vence instanceof Date && p.vence.getUTCFullYear() < 2999 ? formatearFecha(p.vence) : "—"}</td>
                    <td className="px-3 py-2">{p.calidad ? <Etiqueta tono={String(p.calidad) === "Aprobado" ? "exito" : "aviso"}>{String(p.calidad)}</Etiqueta> : "—"}</td>
                    <td className="px-3 py-2 tabular-nums">{n(p.saldo)}</td>
                    <td className="px-3 py-2">{String(p.ubicacion)}</td>
                    <td className="px-3 py-2"><AlmacenarFila caja={Number(p.caja)} sugerencias={sug} /></td>
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
