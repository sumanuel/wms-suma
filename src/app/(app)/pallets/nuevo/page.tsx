import { EncabezadoFicha } from "@/components/ficha";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { siguienteNumero } from "@/lib/pallets/servicio";
import { FormularioNuevoPallet } from "../formulario-nuevo";

export default async function NuevoPallet() {
  const { db } = await requerirPermiso("pallets", "crear");
  return (
    <div className="flex flex-col gap-4">
      <EncabezadoFicha volver="/pallets" textoVolver="Pallets" titulo="Nuevo pallet" descripcion="Un pallet agrupa cajas de inventario. Empieza con la primera caja y agrega las demás en la ficha del pallet." />
      <Tarjeta className="p-5"><FormularioNuevoPallet sugerido={await siguienteNumero(db)} /></Tarjeta>
    </div>
  );
}
