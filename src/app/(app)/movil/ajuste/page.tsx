import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { MOTIVOS } from "@/lib/inventario/ajustes-tipos";
import { CabeceraMovil } from "../cabecera";
import { Escaner } from "../escaner";
import { ajustarMovil } from "../acciones";

export default async function Ajuste() {
  await requerirPermiso("inventario", "editar");
  return (
    <>
      <CabeceraMovil titulo="Ajuste de caja" texto="Escribe el saldo real de la caja: el sistema calcula la diferencia y la deja como ajuste." />
      <Tarjeta className="p-4"><Escaner accion={ajustarMovil} boton="Ajustar" refrescar={false} campos={[{ name: "caja", etiqueta: "Caja", inputMode: "numeric" }, { name: "cantidad", etiqueta: "Saldo real", inputMode: "decimal" }, { name: "motivo", etiqueta: "Motivo", opciones: [...MOTIVOS].filter((m) => m !== "Otro"), conservar: true }]} /></Tarjeta>
    </>
  );
}
