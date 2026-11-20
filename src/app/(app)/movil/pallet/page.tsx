import { Tarjeta } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { agregarAlPallet, ubicar } from "../../pallets/acciones";
import { CabeceraMovil } from "../cabecera";
import { Escaner } from "../escaner";

// Las acciones de pallets reciben el número de pallet como primer argumento: aquí se lee del formulario.
async function agregar(_p: { error?: string; aviso?: string }, form: FormData) {
  "use server";
  const pallet = Number(String(form.get("pallet") ?? "").trim());
  if (!Number.isInteger(pallet) || pallet <= 0) return { error: "Lee o escribe el número de pallet." };
  return agregarAlPallet(pallet, {}, form);
}
async function ubicarPallet(_p: { error?: string; aviso?: string }, form: FormData) {
  "use server";
  const pallet = Number(String(form.get("pallet") ?? "").trim());
  if (!Number.isInteger(pallet) || pallet <= 0) return { error: "Lee o escribe el número de pallet." };
  return ubicar(pallet, {}, form);
}

export default async function PalletMovil() {
  const ctx = await requerirPermiso("pallets", "editar");
  return (
    <>
      <CabeceraMovil titulo="Pallets" texto="El pallet se crea con su primera caja. Cada caja nueva se lleva a la ubicación del pallet." />
      {tienePermiso(ctx, "pallets", "crear") ? (
        <Tarjeta className="flex flex-col gap-3 p-4">
          <h2 className="text-base font-bold">Agregar cajas</h2>
          <Escaner accion={agregar} boton="Agregar" campos={[{ name: "pallet", etiqueta: "Pallet", inputMode: "numeric", conservar: true }, { name: "caja", etiqueta: "Caja", inputMode: "numeric" }]} />
        </Tarjeta>
      ) : null}
      <Tarjeta className="flex flex-col gap-3 p-4">
        <h2 className="text-base font-bold">Ubicar pallet</h2>
        <Escaner accion={ubicarPallet} boton="Ubicar pallet" campos={[{ name: "pallet", etiqueta: "Pallet", inputMode: "numeric" }, { name: "ubicacion", etiqueta: "Ubicación de destino" }]} />
      </Tarjeta>
    </>
  );
}
