import Link from "next/link";
import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { Tarjeta, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { buscarImportable } from "@/lib/maestros/importable";
import { MAXIMO_FILAS } from "@/lib/pedidos/importacion";
import { camposDe } from "@/lib/maestros/nucleo";
import type { CampoForm } from "@/lib/formularios";
import { ImportadorMaestro } from "../importador";
import { IconoPlanilla } from "../../pedidos/importar/importador";

const tipoTexto = (c: CampoForm) => {
  switch (c.tipo) {
    case "entero": return "Número entero";
    case "decimal": return "Número";
    case "fecha": return "Fecha (AAAA-MM-DD o DD/MM/AAAA)";
    case "booleano": return "Sí o No";
    case "seleccion": {
      const v = (c.opciones ?? []).slice(0, 8).map((o) => o.valor);
      return `Una de las opciones${v.length ? `: ${v.join(", ")}${(c.opciones?.length ?? 0) > 8 ? "…" : ""}` : ""}`;
    }
    default: return c.max ? `Texto (hasta ${c.max})` : "Texto";
  }
};

export default async function ImportarMaestro({ params }: { params: Promise<{ id: string }> }) {
  const m = buscarImportable((await params).id);
  if (!m) notFound();
  const ctx = await requerirPermiso(m.modulo, "crear");
  const campos = await camposDe(m, ctx.db);
  const obligatoria = (c: CampoForm) => c.requerido || (c.nombre === m.clave.campo && !m.clave.autogenerada);
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver={m.ruta} textoVolver={m.plural.charAt(0).toUpperCase() + m.plural.slice(1)} titulo={`Importar ${m.plural}`} descripcion="Carga muchos registros de una vez desde una planilla de Excel o un CSV." />
      <Tarjeta className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-2xl flex-col gap-2 text-[13.5px] text-gris-700">
            <h2 className="text-base font-semibold text-tinta">Cómo preparar la planilla</h2>
            <p>Una fila por registro; los encabezados son los nombres de los campos del formulario (los obligatorios llevan *). Hasta {MAXIMO_FILAS} filas.</p>
            <p>Primero se revisa todo sin guardar nada. Se aplican las mismas reglas del formulario: longitudes, números, fechas, opciones y datos que deben existir.</p>
          </div>
          <Link href={`/importar-maestros/${m.id}/modelo`} prefetch={false} className={clasesBoton("secundario")}>
            <IconoPlanilla />
            Descargar planilla modelo
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto rounded-[10px] border border-linea">
          <table className="w-full min-w-[520px] border-collapse text-left text-sm">
            <thead className="bg-[#fafaf8] text-xs text-gris-500">
              <tr>
                <th className="border-b border-linea px-4 py-2.5 font-medium">Columna</th>
                <th className="border-b border-linea px-4 py-2.5 font-medium">Obligatoria</th>
                <th className="border-b border-linea px-4 py-2.5 font-medium">Qué se espera</th>
              </tr>
            </thead>
            <tbody>
              {campos.map((c) => (
                <tr key={c.nombre}>
                  <td className="border-b border-[#f1f1ee] px-4 py-2 font-medium">{c.etiqueta.replace(/\s*\(opcional\)\s*$/i, "")}</td>
                  <td className="border-b border-[#f1f1ee] px-4 py-2">{obligatoria(c) ? "Sí" : "No"}</td>
                  <td className="border-b border-[#f1f1ee] px-4 py-2 text-gris-700">{tipoTexto(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      <ImportadorMaestro id={m.id} plural={m.plural} ruta={m.ruta} puedeActualizar={tienePermiso(ctx, m.modulo, "editar")} puedeActualizarClave={!m.clave.autogenerada} />
    </div>
  );
}
