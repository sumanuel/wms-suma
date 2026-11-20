import { EncabezadoFicha } from "@/components/ficha";
import { FormularioFicha } from "@/components/formulario-ficha";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { valoresDe } from "@/lib/formularios";
import { programar } from "../acciones";
import { camposProgramar } from "../campos";

export default async function ProgramarConteo() {
  const { db, usuario } = await requerirPermiso("conteo", "crear");
  const campos = await camposProgramar(db);
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/conteo" textoVolver="Conteos" titulo="Programar conteo" descripcion="Se genera una línea por cada caja con saldo que cumpla lo elegido, con su saldo actual como cantidad teórica." />
      <Tarjeta className="p-5">
        <FormularioFicha campos={campos} valores={{ ...valoresDe(campos, null), realiza: usuario.nombre }} accion={programar} cancelar="/conteo" editando={false} />
      </Tarjeta>
    </div>
  );
}
