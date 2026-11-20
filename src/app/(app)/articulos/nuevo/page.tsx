import { EncabezadoFicha } from "@/components/ficha";
import { FormularioFicha } from "@/components/formulario-ficha";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { valoresDe } from "@/lib/formularios";
import { guardarArticulo } from "../acciones";
import { camposArticulo } from "../campos";

export default async function NuevoArticulo() {
  const { db } = await requerirPermiso("articulos", "crear");
  const refs = await db.insReferencias.findMany({ select: { codigoreferencia: true, nombreref: true }, orderBy: { codigoreferencia: "asc" } });
  const campos = camposArticulo(refs.map((r) => ({ valor: r.codigoreferencia, etiqueta: `${r.codigoreferencia} · ${r.nombreref ?? ""}` })));
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/articulos" textoVolver="Artículos" titulo="Nuevo artículo" />
      <Tarjeta className="p-5">
        <FormularioFicha campos={campos} valores={{ ...valoresDe(campos, null), inventariable: "1", estado: "0" }} accion={guardarArticulo.bind(null, null)} cancelar="/articulos" editando={false} />
      </Tarjeta>
    </div>
  );
}
