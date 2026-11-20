import Link from "next/link";
import { Undo2 } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { Tarjeta, clasesBoton, formatearFechaHora } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { COLUMNAS, MAX_CAJAS_TOTAL, cargasAnteriores } from "@/lib/inventario/carga";
import { MAXIMO_FILAS } from "@/lib/pedidos/importacion";
import { IconoPlanilla } from "../../pedidos/importar/importador";
import { deshacerAccion } from "./acciones";
import { ImportadorCarga } from "./importador-carga";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(v ?? 0));

export default async function CargaInicial() {
  const { db } = await requerirPermiso("inventario", "crear");
  const historial = await cargasAnteriores(db);
  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex max-w-2xl flex-col gap-2 text-[13.5px] text-gris-700">
            <h2 className="text-base font-semibold text-tinta">Carga de inventario inicial</h2>
            <p>Registra las existencias de arranque desde una planilla: una fila por artículo, ubicación y lote, con la cantidad de cada caja y cuántas cajas hay (hasta {MAXIMO_FILAS} filas y {MAX_CAJAS_TOTAL.toLocaleString("es-CO")} cajas por carga).</p>
            <p>Obligatorias: <strong>{COLUMNAS.filter((c) => c.obligatoria).map((c) => c.titulo).join(", ")}</strong>. Opcionales: {COLUMNAS.filter((c) => !c.obligatoria).map((c) => c.titulo).join(", ")}.</p>
            <p>Los artículos, bodegas y ubicaciones deben existir. Un lote nuevo se crea con su vencimiento (vacío = no controla vencimiento) y su estado de calidad (por omisión <em>Aprobado</em>); si el lote ya existe se usa tal cual. Cada caja queda con un ajuste que lleva la referencia de la carga.</p>
            <p>Es <strong>todo o nada</strong>: con un solo error no se carga nada. La referencia no se puede repetir, así no se duplica el inventario por subir dos veces el mismo archivo.</p>
          </div>
          <Link href="/inventario/carga-inicial/modelo" prefetch={false} className={clasesBoton("secundario")}>
            <IconoPlanilla />
            Descargar planilla modelo
          </Link>
        </div>
      </Tarjeta>

      <ImportadorCarga />

      <Tarjeta>
        <div className="border-b border-linea px-5 py-3.5">
          <h2 className="text-base font-semibold">Cargas anteriores</h2>
          <p className="text-[13px] text-gris-500">Una carga se puede deshacer mientras ninguna de sus cajas se haya movido, reservado o ajustado.</p>
        </div>
        {historial.length === 0 ? (
          <p className="px-5 py-6 text-[13.5px] text-gris-500">Todavía no hay cargas.</p>
        ) : (
          <ul className="divide-y divide-linea">
            {historial.map((h) => (
              <li key={h.referencia} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <span><span className="font-semibold">{h.referencia}</span> <span className="text-gris-500">· {formatearFechaHora(h.fecha)}</span></span>
                <span className="flex items-center gap-4">
                  <span className="tabular-nums text-gris-500">{n(h.cajas)} cajas · {n(h.unidades)} unidades</span>
                  <BotonConfirmar etiqueta="Deshacer" titulo="Deshacer la carga" confirmar="Sí, deshacer" variante="peligro" icono={<Undo2 className="size-4" aria-hidden />} accion={deshacerAccion.bind(null, h.referencia)}>
                    Se borran las {n(h.cajas)} cajas de la carga «{h.referencia}», sus ajustes y los lotes que creó. Solo se puede si ninguna caja se movió. Esta acción no se puede deshacer.
                  </BotonConfirmar>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}
