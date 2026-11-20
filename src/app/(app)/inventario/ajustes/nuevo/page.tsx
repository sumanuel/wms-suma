import Link from "next/link";
import { Search } from "lucide-react";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Etiqueta, Tarjeta, claseControl, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { buscarCaja } from "@/lib/inventario/ajustes";
import { tonoEstado } from "../../estados";
import { FormularioAjuste } from "../formulario-ajuste";

const n = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(v);

export default async function NuevoAjuste({ searchParams }: { searchParams: Promise<{ caja?: string; i?: string }> }) {
  const { db } = await requerirPermiso("inventario", "editar");
  const q = await searchParams;
  const texto = (q.caja ?? "").trim().replace(/\./g, "");
  const numero = texto === "" ? null : Number(texto);
  const validoNumero = numero !== null && Number.isFinite(numero) && numero > 0;
  const cajas = validoNumero ? await buscarCaja(db, numero) : [];
  const elegida = cajas[Math.min(Math.max(Number(q.i ?? 0) || 0, 0), Math.max(cajas.length - 1, 0))];

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/inventario/ajustes" textoVolver="Ajustes" titulo="Nuevo ajuste de inventario" descripcion="Corrige el saldo de una caja con su motivo. Queda registrado y en la auditoría." />
      <Tarjeta className="p-5">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="caja" className="text-[13px] font-medium">Número de caja</label>
            <input id="caja" name="caja" inputMode="numeric" defaultValue={texto} autoFocus className={`${claseControl} w-56`} />
          </div>
          <button type="submit" className={clasesBoton("secundario")}><Search className="size-4" aria-hidden />Buscar caja</button>
        </form>
        {texto !== "" && !validoNumero ? <div className="mt-4"><Aviso tono="error">El número de caja debe ser un número entero mayor que cero.</Aviso></div> : null}
        {validoNumero && cajas.length === 0 ? <div className="mt-4"><Aviso tono="aviso">No existe la caja {texto} en el inventario.</Aviso></div> : null}
      </Tarjeta>

      {elegida ? (
        <>
          {cajas.length > 1 ? (
            <Aviso tono="aviso">
              Hay {cajas.length} cajas con ese número: elige cuál ajustar.{" "}
              {cajas.map((c, i) => <Link key={`${c.ean}-${c.bodega}`} href={`/inventario/ajustes/nuevo?caja=${texto}&i=${i}`} className="ml-2 font-semibold underline">{c.ean} · {c.bodega}</Link>)}
            </Aviso>
          ) : null}
          <Tarjeta className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h2 className="text-base font-semibold">Caja {elegida.caja}</h2>
              {elegida.estado ? <Etiqueta tono={tonoEstado(elegida.estado)}>{elegida.estado}</Etiqueta> : null}
            </div>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
              {[["Artículo", `${elegida.descripcion ?? elegida.ean}`], ["Código de barras", elegida.ean], ["Lote", elegida.lote], ["Bodega", elegida.bodega], ["Ubicación", elegida.ubicacion || "—"], ["Saldo actual", n(elegida.saldo)], ["Reservado", n(elegida.reservado)], ["Libre", n(elegida.saldo - elegida.reservado)]].map(([t, v]) => (
                <div key={t} className="flex flex-col gap-0.5"><dt className="text-xs text-gris-500">{t}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </Tarjeta>
          <Tarjeta className="p-5">
            <h2 className="mb-4 text-base font-semibold">Ajuste</h2>
            <FormularioAjuste key={`${elegida.caja}-${elegida.ean}-${elegida.bodega}`} caja={elegida.caja} ean={elegida.ean} bodega={elegida.bodega} saldo={elegida.saldo} reservado={elegida.reservado} unidad={elegida.unidad ?? ""} />
          </Tarjeta>
        </>
      ) : null}
    </div>
  );
}
