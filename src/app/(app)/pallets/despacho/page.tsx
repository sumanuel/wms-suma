import Link from "next/link";
import { Aviso, Etiqueta, Tarjeta, formatearFechaHora, type Tono } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { ESTADOS, listarPalletsDespacho } from "@/lib/pallets/despacho";
import { FormularioNuevo } from "./formularios";

const TONO: Record<string, Tono> = { abierto: "exito", cerrado: "aviso", despachado: "neutro" };

export default async function PalletsDespacho({ searchParams }: { searchParams: Promise<{ aviso?: string }> }) {
  const ctx = await requerirPermiso("pallets", "ver");
  const [filas, bodegas] = await Promise.all([listarPalletsDespacho(ctx.db), bodegasConStock(ctx.db)]);
  const aviso = (await searchParams).aviso === "eliminado" ? "Se eliminó el pallet." : null;
  return (
    <div className="flex flex-col gap-5">
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}
      <Tarjeta className="p-5">
        <h2 className="mb-1 text-base font-semibold">Pallets de despacho</h2>
        <p className="mb-4 max-w-3xl text-[13.5px] text-gris-500">Agrupan las cajas de despacho que armó la aduana para cargarlas juntas. Se arma el pallet, se cierra con sus medidas y peso, se imprime su etiqueta SSCC y al despacharlo se genera la guía de cada picking que quedó completo.</p>
        {tienePermiso(ctx, "pallets", "crear") ? <FormularioNuevo bodegas={bodegas} /> : null}
      </Tarjeta>
      <Tarjeta>
        {filas.length === 0 ? <p className="p-4 text-sm text-gris-500">Todavía no hay pallets de despacho.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Pallet", "Bodega", "Creado", "Pickings", "Cajas", "Peso (kg)", "Transportador", "Estado"].map((h) => <th key={h} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {filas.map((p) => (
                  <tr key={String(p.id)} className="border-b border-linea last:border-0">
                    <td className="px-3 py-2"><Link href={`/pallets/despacho/${p.id}`} className="font-medium text-marca-texto hover:underline">{String(p.id)}</Link></td>
                    <td className="px-3 py-2">{String(p.bodega)}</td><td className="px-3 py-2">{formatearFechaHora(p.creado_en as Date)}</td>
                    <td className="px-3 py-2 tabular-nums">{String(p.pickings)}</td><td className="px-3 py-2 tabular-nums">{String(p.cajas)}</td>
                    <td className="px-3 py-2 tabular-nums">{p.peso === null ? "—" : String(p.peso)}</td><td className="px-3 py-2">{String(p.transportador ?? "—")}{p.remesa ? <span className="block text-xs text-gris-500">Remesa {String(p.remesa)}</span> : null}</td>
                    <td className="px-3 py-2"><Etiqueta tono={TONO[String(p.estado)] ?? "neutro"}>{ESTADOS[String(p.estado) as keyof typeof ESTADOS] ?? String(p.estado)}</Etiqueta></td>
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
