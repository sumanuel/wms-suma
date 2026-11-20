import { Download } from "lucide-react";
import { EncabezadoFicha } from "@/components/ficha";
import { Tarjeta, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { COLUMNAS } from "@/lib/compras/ordenes";
import { ImportadorOrdenes } from "./importador";

export default async function ImportarOrdenes() {
  await requerirPermiso("inventario", "crear");
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/inventario/ordenes" textoVolver="Órdenes de compra" titulo="Importar órdenes de compra" descripcion="Trae las órdenes de tu ERP o de tu hoja de cálculo: una fila por línea; las filas con el mismo número forman una orden." />
      <Tarjeta className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="max-w-3xl text-[13.5px] text-gris-500">Columnas: {COLUMNAS.map((c) => `${c.titulo}${c.obligatoria ? " *" : ""}`).join(", ")}. Se revisa todo antes de importar. El número de la planilla queda en las observaciones; el sistema asigna el número de orden.</p>
          <a href="/inventario/ordenes/importar/modelo" className={clasesBoton("secundario")}><Download className="size-4" aria-hidden />Planilla modelo</a>
        </div>
      </Tarjeta>
      <ImportadorOrdenes />
    </div>
  );
}
