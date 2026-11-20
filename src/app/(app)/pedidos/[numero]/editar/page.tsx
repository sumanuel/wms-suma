import { notFound, redirect } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { FormularioFicha } from "@/components/formulario-ficha";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { valoresDe } from "@/lib/formularios";
import { esEditable } from "@/lib/pedidos/estados";
import { guardarPedido } from "../../acciones";
import { camposPedido } from "../../campos";

export default async function EditarPedido({ params }: { params: Promise<{ numero: string }> }) {
  const { db } = await requerirPermiso("pedidos", "editar");
  const numero = decodeURIComponent((await params).numero);
  const p = await db.narthEncabezadoPedido.findUnique({ where: { npedido: numero } });
  if (!p) notFound();
  const volver = `/pedidos/${encodeURIComponent(numero)}`;
  if (!esEditable(p.busca_aprobacion)) redirect(volver);
  const campos = await camposPedido(db, false);
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver={volver} textoVolver={`Pedido ${numero}`} titulo="Editar datos del pedido" />
      <Tarjeta className="p-5">
        <FormularioFicha campos={campos} valores={{ ...valoresDe(campos, p), sede: p.nitvble == null ? "" : String(p.nitvble) }} accion={guardarPedido.bind(null, numero)} cancelar={volver} editando />
      </Tarjeta>
    </div>
  );
}
