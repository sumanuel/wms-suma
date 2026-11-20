import { notFound } from "next/navigation";
import Link from "next/link";
import { Aviso, Tarjeta, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { ejecucionPicking, VALIDA_PICKING } from "@/lib/prepacking/servicio";
import { pickear } from "../../../prepacking/acciones";
import { CabeceraMovil } from "../../cabecera";
import { Escaner } from "../../escaner";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(v ?? 0));

export default async function PickearMovil({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requerirPermiso("prepacking", "editar");
  const { id: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const id = Number(t);
  const e = await ejecucionPicking(db, id);
  if (!e) notFound();
  const lineas = e.lineas;
  const hechas = lineas.filter((l) => Number(l.estado) === 3).length;
  const siguiente = lineas.find((l) => Number(l.estado) === 0);
  const enPicking = Number(e.encabezado.valida ?? 0) === VALIDA_PICKING;
  async function pickearLinea(_p: { error?: string; aviso?: string }, form: FormData) {
    "use server";
    const r = await pickear(id, Number(siguiente?.id), {}, form);
    return r.error ? r : { aviso: "Línea pickeada." };
  }
  return (
    <>
      <CabeceraMovil titulo={`Picking ${id}`} texto={`Pedido ${e.encabezado.npedid ?? "—"} · ${hechas} de ${lineas.length} líneas`} volver="/movil/picking" />
      {!enPicking || !siguiente ? (
        <div className="flex flex-col gap-3">
          <Aviso tono="exito">{hechas === lineas.length ? "Picking completo: todas las líneas están pickeadas y el picking pasó a la aduana." : "Este picking ya no está en la etapa de picking."}</Aviso>
          <Link href="/movil/picking" className={clasesBoton("primario", "h-12")}>Volver a los pickings</Link>
        </div>
      ) : (
        <>
          <Tarjeta className="flex flex-col gap-1 p-4">
            <p className="text-xs font-semibold uppercase text-gris-500">Siguiente línea</p>
            <p className="text-3xl font-extrabold tracking-tight">{String(siguiente.ubicacion ?? "Sin ubicación")}</p>
            <p className="text-base font-semibold">{String(siguiente.descripcion ?? siguiente.ean)}</p>
            <p className="text-sm text-gris-500">Lote {String(siguiente.lote ?? "—")} · {String(siguiente.ean)}</p>
            <p className="mt-1 text-xl font-bold">Cantidad: {n(siguiente.planeada)}</p>
          </Tarjeta>
          <Tarjeta className="p-4">
            <Escaner key={String(siguiente.id)} accion={pickearLinea} boton="Confirmar pickeo" campos={[
              { name: "caja", etiqueta: "Caja leída", inputMode: "numeric", defaultValue: siguiente.asignada ? String(siguiente.asignada) : undefined },
              { name: "cantidad", etiqueta: "Cantidad pickeada", inputMode: "decimal", defaultValue: String(Number(siguiente.planeada)) },
              { name: "despacho", etiqueta: "Caja de despacho", inputMode: "numeric", defaultValue: "1", conservar: true },
            ]} />
          </Tarjeta>
        </>
      )}
    </>
  );
}
