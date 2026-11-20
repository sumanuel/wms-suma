import { EncabezadoFicha } from "@/components/ficha";
import { FormularioFicha } from "@/components/formulario-ficha";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { valoresDe } from "@/lib/formularios";
import { guardarReferencia } from "../../acciones";
import { camposReferencia } from "../../campos";

export default async function NuevaReferencia() {
  await requerirPermiso("articulos", "crear");
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/articulos/referencias" textoVolver="Referencias" titulo="Nueva referencia" />
      <Tarjeta className="p-5">
        <FormularioFicha campos={camposReferencia} valores={valoresDe(camposReferencia, null)} accion={guardarReferencia.bind(null, null)} cancelar="/articulos/referencias" editando={false} />
      </Tarjeta>
    </div>
  );
}
