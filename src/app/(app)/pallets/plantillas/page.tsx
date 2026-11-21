import Link from "next/link";
import { Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { listarPlantillas } from "@/lib/etiquetas/plantillas";

export default async function Plantillas() {
  const ctx = await requerirPermiso("pallets", "ver");
  const lista = await listarPlantillas(ctx.db);
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-3xl text-[13.5px] text-gris-500">Cada etiqueta sale con una plantilla ZPL. Si el cliente no tiene la suya se usa la del sistema; puedes editarla para cambiar el diseño, el tamaño de las letras o los datos que lleva. Vale para la impresión directa y para el ZPL que se descarga.</p>
      <Tarjeta>
        <ul>
          {lista.map((p) => (
            <li key={p.tipo} className="border-b border-linea last:border-0">
              <Link href={`/pallets/plantillas/${p.tipo}`} className="flex flex-wrap items-center justify-between gap-3 p-4 transition hover:bg-hover">
                <span className="flex flex-col"><span className="text-base font-semibold">{p.titulo}</span><span className="text-[13px] text-gris-500">{p.descripcion}</span></span>
                <span className="text-[13px] text-gris-500">{p.personalizada ? `Personalizada${p.actualizada_en ? ` · ${formatearFechaHora(p.actualizada_en)}` : ""}` : "Predeterminada"}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  );
}
