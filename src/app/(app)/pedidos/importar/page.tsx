import Link from "next/link";
import { EncabezadoFicha } from "@/components/ficha";
import { Tarjeta, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { COLUMNAS, MAXIMO_FILAS } from "@/lib/pedidos/importacion";
import { IconoPlanilla, Importador } from "./importador";

export default async function ImportarPedidos() {
  await requerirPermiso("pedidos", "crear");
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/pedidos" textoVolver="Pedidos" titulo="Importar pedidos" descripcion="Carga varios pedidos de una vez desde una planilla de Excel o un CSV." />
      <Tarjeta className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-2xl flex-col gap-2 text-[13.5px] text-gris-700">
            <h2 className="text-base font-semibold text-tinta">Cómo preparar la planilla</h2>
            <p>Una fila por línea de pedido. Las filas con el mismo número de pedido forman un pedido (hasta {MAXIMO_FILAS} filas por planilla).</p>
            <p>
              Obligatorias: <strong>{COLUMNAS.filter((c) => c.obligatoria).map((c) => c.titulo).join(", ")}</strong>. Además, indica el cliente con el <strong>NIT</strong> (y la <strong>Sede</strong> por nombre o número si tiene varias) o solo el número de sede.
            </p>
            <p>Opcionales: {COLUMNAS.filter((c) => !c.obligatoria && !["nit", "sede"].includes(c.campo)).map((c) => c.titulo).join(", ")}. Las fechas pueden ir como AAAA-MM-DD o DD/MM/AAAA; los números con coma o punto decimal.</p>
            <p>Primero se revisa todo sin guardar nada: verás qué pedidos están listos y cuáles tienen errores.</p>
          </div>
          <Link href="/pedidos/importar/modelo" prefetch={false} className={clasesBoton("secundario")}>
            <IconoPlanilla />
            Descargar planilla modelo
          </Link>
        </div>
      </Tarjeta>
      <Importador />
    </div>
  );
}
