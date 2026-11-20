import Link from "next/link";
import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { fichaAjuste, PREFIJO_ANULACION } from "@/lib/inventario/aprobacion";
import { FormularioAnular } from "../formularios-aprobacion";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(Number(v ?? 0));

export default async function FichaAjuste({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requerirPermiso("inventario", "editar");
  const { id: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const a = await fichaAjuste(ctx.db, Number(t));
  if (!a) notFound();
  const motivo = String(a.motivo ?? "");
  const esAnulacion = motivo.startsWith(PREFIJO_ANULACION);
  const manual = motivo.startsWith("Ajuste manual");
  const anulado = a.anulado_por !== null && a.anulado_por !== undefined;
  return (
    <div className="flex flex-col gap-4">
      <EncabezadoFicha volver="/inventario/ajustes" textoVolver="Ajustes" titulo={`Ajuste ${a.id}`} descripcion={`Caja ${a.caja} · ${formatearFechaHora(a.fecha as Date)}`} />
      <Tarjeta className="p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          <Etiqueta tono={esAnulacion ? "error" : manual ? "marca" : "neutro"}>{esAnulacion ? "Anulación" : manual ? "Manual" : "Otro origen"}</Etiqueta>
          {anulado ? <Etiqueta tono="neutro">Anulado por el ajuste {String(a.anulado_por)}</Etiqueta> : null}
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["Artículo", String(a.articulo ?? a.ean ?? "—")], ["Lote", String(a.lote ?? "—")], ["Ubicación", String(a.ubicacion ?? "—")], ["Documento", String(a.soporte ?? "—")], ["Saldo antes", n(a.antes)], ["Aumento", n(a.entrada)], ["Disminución", n(a.salida)], ["Saldo después", n(a.despues)], ["Saldo de la caja hoy", a.saldo_actual === null ? "—" : n(a.saldo_actual)]].map(([k, v]) => (
            <div key={k} className="flex flex-col gap-0.5"><dt className="text-xs text-gris-500">{k}</dt><dd className="font-medium">{v}</dd></div>
          ))}
          <div className="flex flex-col gap-0.5 sm:col-span-2 xl:col-span-4"><dt className="text-xs text-gris-500">Motivo</dt><dd className="font-medium">{motivo}</dd></div>
        </dl>
      </Tarjeta>
      {anulado ? <Link href={`/inventario/ajustes/${a.anulado_por}`} className="text-sm font-medium text-marca-texto hover:underline">Ver el ajuste que lo anuló</Link> : null}
      {manual && !anulado ? (
        tienePermiso(ctx, "inventario", "eliminar") ? (
          <Tarjeta className="p-5"><h2 className="mb-3 text-base font-semibold">Anular</h2><FormularioAnular id={Number(a.id)} /></Tarjeta>
        ) : <Aviso tono="neutro">Anular un ajuste requiere el permiso de eliminar en Inventario.</Aviso>
      ) : null}
      {!manual && !esAnulacion ? <Aviso tono="neutro">Solo se anulan ajustes manuales. Los de conteo se corrigen con otro conteo y los de carga inicial se deshacen desde la carga.</Aviso> : null}
    </div>
  );
}
