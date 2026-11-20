import Link from "next/link";
import { Download } from "lucide-react";
import { Aviso, Tarjeta, clasesBoton, claseControl } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { formatear } from "@/lib/indicadores/formato";
import { consultaDe, leerRango } from "@/lib/indicadores/rango";
import { REPORTES, type Fila, type Reporte } from "@/lib/indicadores/reportes";
import { GraficoBarras, aSerie } from "./grafico-barras";

const GRUPOS = [
  { id: "operacion", titulo: "Operación", texto: "Picking, aduana, despachos y pedidos." },
  { id: "inventario", titulo: "Inventario", texto: "Antigüedad, vencimientos y ocupación de la bodega." },
  { id: "ajustes", titulo: "Calidad y ajustes", texto: "Estado de los lotes, ajustes y exactitud de los conteos." },
] as const;

export default async function Indicadores({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const ctx = await requerirPermiso("indicadores", "ver");
  const { db } = ctx;
  const rango = leerRango(await searchParams);
  const puedeExportar = tienePermiso(ctx, "indicadores", "exportar");
  const bodegas = await bodegasConStock(db);
  const q = consultaDe(rango);

  const resultados = await Promise.all(
    REPORTES.map(async (r) => {
      try {
        return { r, filas: await r.cargar(db, rango), error: false };
      } catch (e) {
        console.error(`Indicador ${r.id}:`, e);
        return { r, filas: [] as Fila[], error: true };
      }
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <Tarjeta className="print:hidden" recortar={false}>
        <form method="get" className="flex flex-wrap items-end gap-4 p-4">
          <label className="flex flex-col gap-1 text-[13px] font-medium text-gris-700">
            Desde
            <input type="date" name="desde" defaultValue={rango.desde} className={`${claseControl} w-44`} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-medium text-gris-700">
            Hasta
            <input type="date" name="hasta" defaultValue={rango.hasta} className={`${claseControl} w-44`} />
          </label>
          <label className="flex flex-col gap-1 text-[13px] font-medium text-gris-700">
            Bodega
            <select name="bodega" defaultValue={rango.bodega ?? ""} className={`${claseControl} w-56 pr-9`}>
              <option value="">Todas las bodegas</option>
              {bodegas.map((b) => <option key={b.valor} value={b.valor}>{b.etiqueta}</option>)}
            </select>
          </label>
          <button type="submit" className={clasesBoton("primario")}>Aplicar</button>
          {puedeExportar ? (
            <a href={`/indicadores/exportar?reporte=todos&${q}`} className={clasesBoton("secundario", "ml-auto")}>
              <Download className="size-4" aria-hidden="true" /> Exportar todo a Excel
            </a>
          ) : null}
        </form>
        <p className="border-t border-linea px-4 py-2.5 text-[13px] text-gris-500">
          Los reportes por fecha usan el rango elegido. Los marcados «foto de hoy» muestran el estado actual de la bodega y solo cambian con el filtro de bodega.
        </p>
      </Tarjeta>

      {GRUPOS.map((g) => (
        <section key={g.id} className="flex flex-col gap-4" aria-labelledby={`grupo-${g.id}`}>
          <div>
            <h2 id={`grupo-${g.id}`} className="text-lg font-bold text-tinta">{g.titulo}</h2>
            <p className="text-[13.5px] text-gris-500">{g.texto}</p>
          </div>
          {resultados.filter((x) => x.r.grupo === g.id).map((x) => (
            <TarjetaReporte key={x.r.id} r={x.r} filas={x.filas} error={x.error} exportar={puedeExportar ? `/indicadores/exportar?reporte=${x.r.id}&${q}` : null} />
          ))}
        </section>
      ))}
    </div>
  );
}

function TarjetaReporte({ r, filas, error, exportar }: { r: Reporte; filas: Fila[]; error: boolean; exportar: string | null }) {
  const serie = r.grafico ? aSerie(filas, (f) => formatear(f[r.grafico!.categoria], r.columnas.find((c) => c.id === r.grafico!.categoria)?.tipo ?? "texto"), r.grafico.valor) : [];
  return (
    <Tarjeta id={r.id} data-reporte={r.id}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-linea p-4">
        <div className="max-w-3xl">
          <h3 className="text-[15px] font-bold text-tinta">{r.titulo}</h3>
          <p className="mt-0.5 text-[13.5px] text-gris-500">{r.descripcion}</p>
        </div>
        {exportar ? (
          <Link href={exportar} prefetch={false} className={`${clasesBoton("secundario")} print:hidden`} aria-label={`Exportar a Excel: ${r.titulo}`}>
            <Download className="size-4" aria-hidden="true" /> Excel
          </Link>
        ) : null}
      </div>
      {error ? (
        <div className="p-4"><Aviso tono="error">No se pudo calcular este indicador. Inténtalo de nuevo; si sigue fallando, avisa a soporte.</Aviso></div>
      ) : filas.length === 0 ? (
        <p className="p-4 text-[13.5px] text-gris-500">Sin datos para este filtro.</p>
      ) : (
        <div className="flex flex-col gap-4 p-4">
          {r.grafico ? <GraficoBarras filas={serie} unidad={r.grafico.unidad} /> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead>
                <tr className="border-b border-linea text-[12.5px] text-gris-500">
                  {r.columnas.map((c) => <th key={c.id} scope="col" className={`px-3 py-2 font-medium ${c.tipo === "texto" || c.tipo === "fecha" || c.tipo === "fechaHora" || c.tipo === "hora" ? "" : "text-right"}`}>{c.titulo}</th>)}
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i} className="border-b border-linea last:border-0">
                    {r.columnas.map((c) => <td key={c.id} className={`px-3 py-2 ${c.tipo === "numero" || c.tipo === "porcentaje" ? "text-right tabular-nums" : ""}`}>{formatear(f[c.id], c.tipo)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Tarjeta>
  );
}
