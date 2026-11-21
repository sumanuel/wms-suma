import { notFound } from "next/navigation";
import Link from "next/link";
import { Tarjeta, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { impresorasActivas } from "@/lib/etiquetas/impresion";
import { esTipo, plantillaDe } from "@/lib/etiquetas/plantillas";
import { ETIQUETAS } from "@/lib/etiquetas/plantillas-defecto";
import { EditorPlantilla } from "./editor";

export default async function EditarPlantilla({ params }: { params: Promise<{ tipo: string }> }) {
  const ctx = await requerirPermiso("pallets", "ver");
  const { tipo } = await params;
  if (!esTipo(tipo)) notFound();
  const info = ETIQUETAS[tipo];
  const [p, impresoras] = await Promise.all([plantillaDe(ctx.db, tipo), impresorasActivas(ctx.db)]);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3"><Link href="/pallets/plantillas" className={clasesBoton("fantasma")}>← Volver a plantillas</Link></div>
      <div>
        <h2 className="text-lg font-semibold">{info.titulo}</h2>
        <p className="text-[13.5px] text-gris-500">{p.personalizada ? "Plantilla personalizada." : "Plantilla predeterminada del sistema."} {info.descripcion}</p>
      </div>
      <EditorPlantilla tipo={tipo} contenido={p.contenido} personalizada={p.personalizada} defecto={info.defecto} impresoras={impresoras} puedeEditar={tienePermiso(ctx, "pallets", "eliminar")} puedeProbar={tienePermiso(ctx, "pallets", "editar")} />
      <Tarjeta className="p-5">
        <h3 className="mb-2 text-base font-semibold">Datos que puedes usar</h3>
        <p className="mb-3 text-[13.5px] text-gris-500">Escríbelos entre dobles llaves. Para un dato de texto usa <code>^FH^FD{"{{campo}}"}^FS</code> (así los caracteres raros no dañan la etiqueta).</p>
        <dl className="grid gap-x-6 gap-y-1 text-[13.5px] sm:grid-cols-2">
          {info.variables.map((v) => <div key={v.nombre} className="flex gap-2"><dt className="font-mono font-semibold">{`{{${v.nombre}}}`}</dt><dd className="text-gris-500">{v.descripcion}</dd></div>)}
        </dl>
        {info.listas.map((l) => (
          <div key={l.nombre} className="mt-4">
            <p className="text-[13.5px]"><span className="font-mono font-semibold">{`{{#${l.nombre} ${l.max}}} … {{/${l.nombre}}}`}</span> <span className="text-gris-500">repite el bloque por cada elemento (hasta {l.max}); {"{{i}}"} es su número desde 0 y dentro puedes usar:</span></p>
            <dl className="mt-1 grid gap-x-6 gap-y-1 text-[13.5px] sm:grid-cols-2">
              {l.campos.map((v) => <div key={v.nombre} className="flex gap-2"><dt className="font-mono font-semibold">{`{{${v.nombre}}}`}</dt><dd className="text-gris-500">{v.descripcion}</dd></div>)}
            </dl>
          </div>
        ))}
        <h3 className="mb-1 mt-5 text-base font-semibold">Operaciones</h3>
        <ul className="flex flex-col gap-1 text-[13.5px] text-gris-600">
          <li><span className="font-mono font-semibold">{"{{=5*mm}}"}</span> cuenta en puntos: aquí, 5 milímetros. Admite + − × ÷ y paréntesis, y sirve igual a 203 y a 300 dpi. Ejemplo dentro de una lista: <span className="font-mono">{"{{=(44+i*9.5)*mm}}"}</span>.</li>
          <li><span className="font-mono font-semibold">{"{{centrar sscc}}"}</span> da la columna que centra el código de barras de ese dato: <span className="font-mono">{"^FO{{centrar sscc}},{{=114*mm}}^BCN,…"}</span>.</li>
          <li><span className="font-mono font-semibold">{"{{#si campo}} … {{/si}}"}</span> incluye el bloque solo si el dato no está vacío.</li>
          <li>Debe ser un trabajo completo: empieza en <span className="font-mono">^XA</span> y termina en <span className="font-mono">^XZ</span>. Las etiquetas son de 100 × 150 mm.</li>
        </ul>
      </Tarjeta>
    </div>
  );
}
