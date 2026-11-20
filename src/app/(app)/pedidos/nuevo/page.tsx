import { EncabezadoFicha } from "@/components/ficha";
import { FormularioFicha } from "@/components/formulario-ficha";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { valoresDe } from "@/lib/formularios";
import { guardarPedido } from "../acciones";
import { camposPedido } from "../campos";

export default async function NuevoPedido() {
  const { db } = await requerirPermiso("pedidos", "crear");
  const campos = await camposPedido(db, true);
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/pedidos" textoVolver="Pedidos" titulo="Nuevo pedido" descripcion="Primero se crea la cabecera; las líneas se agregan en la ficha del pedido." />
      <Tarjeta className="p-5">
        <FormularioFicha campos={campos} valores={{ ...valoresDe(campos, null), fechapedido: new Date().toISOString().slice(0, 10) }} accion={guardarPedido.bind(null, null)} cancelar="/pedidos" editando={false} />
      </Tarjeta>
    </div>
  );
}
