import { Tarjeta } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { listarImpresoras } from "@/lib/etiquetas/impresion";
import { AccionesImpresora, FormularioImpresora } from "./formularios";

export default async function Impresoras() {
  const ctx = await requerirPermiso("pallets", "ver");
  const lista = await listarImpresoras(ctx.db);
  const admin = tienePermiso(ctx, "pallets", "eliminar");
  const probar = tienePermiso(ctx, "pallets", "editar");
  return (
    <div className="flex flex-col gap-5">
      {admin ? (
        <Tarjeta className="p-5">
          <h2 className="mb-1 text-base font-semibold">Registrar impresora</h2>
          <p className="mb-4 max-w-3xl text-[13.5px] text-gris-500">Impresoras Zebra (o compatibles con ZPL) conectadas a la red. El servidor del WMS debe poder llegar a la dirección; el puerto habitual es el 9100. Las etiquetas son de 100 × 150 mm.</p>
          <FormularioImpresora />
        </Tarjeta>
      ) : null}
      <Tarjeta>
        <div className="border-b border-linea p-4"><h2 className="text-base font-semibold">Impresoras ({lista.length})</h2></div>
        {lista.length === 0 ? <p className="p-4 text-sm text-gris-500">Todavía no hay impresoras. Mientras tanto puedes descargar el ZPL de cada etiqueta o imprimirlas desde el navegador.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-left text-[13.5px]">
              <thead><tr className="border-b border-linea text-[12.5px] text-gris-500">{["Nombre", "Dirección", "Puerto", "Resolución", "Estado", ""].map((h, i) => <th key={i} scope="col" className="px-3 py-2.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {lista.map((i) => (
                  <tr key={i.id} className="border-b border-linea last:border-0">
                    <td className="px-3 py-2 font-medium">{i.nombre}</td><td className="px-3 py-2">{i.host}</td><td className="px-3 py-2 tabular-nums">{i.puerto}</td><td className="px-3 py-2">{i.dpi} dpi</td>
                    <td className="px-3 py-2">{i.activa ? "Activa" : "Desactivada"}</td>
                    <td className="px-3 py-2"><AccionesImpresora id={i.id} activa={i.activa} puedeProbar={probar} puedeAdministrar={admin} /></td>
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
