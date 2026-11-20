import { EncabezadoFicha } from "@/components/ficha";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { FormularioOrden } from "./formulario-orden";

export default async function NuevaOrden() {
  const { db } = await requerirPermiso("inventario", "crear");
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/inventario/ordenes" textoVolver="Órdenes de compra" titulo="Nueva orden de compra" descripcion="Lo que esperas recibir de un proveedor. Después se recibe contra la orden y se descuenta lo que llega." />
      <Tarjeta className="p-5"><FormularioOrden bodegas={await bodegasConStock(db)} /></Tarjeta>
    </div>
  );
}
