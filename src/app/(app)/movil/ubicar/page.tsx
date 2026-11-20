import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { CabeceraMovil } from "../cabecera";
import { Escaner } from "../escaner";
import { ubicarCaja } from "../acciones";

export default async function Ubicar() {
  await requerirPermiso("inventario", "editar");
  return (
    <>
      <CabeceraMovil titulo="Ubicar caja" texto="Lee la caja y, después, la ubicación de destino. Si la caja estaba en un pallet, sale de él." />
      <Tarjeta className="p-4"><Escaner accion={ubicarCaja} boton="Ubicar" refrescar={false} campos={[{ name: "caja", etiqueta: "Caja", inputMode: "numeric" }, { name: "ubicacion", etiqueta: "Ubicación de destino" }]} /></Tarjeta>
    </>
  );
}
