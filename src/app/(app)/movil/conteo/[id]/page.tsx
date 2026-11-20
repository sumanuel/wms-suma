import { notFound } from "next/navigation";
import Link from "next/link";
import { Aviso, Tarjeta, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { detalleConteo, ESTADO_APLICADO } from "@/lib/conteo/servicio";
import { contarCaja } from "../../acciones";
import { CabeceraMovil } from "../../cabecera";
import { Escaner } from "../../escaner";

export default async function ContarMovil({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requerirPermiso("conteo", "editar");
  const { id: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const id = Number(t);
  const d = await detalleConteo(db, id, "pendientes", 1);
  if (!d) notFound();
  const aplicado = d.encabezado.estado === ESTADO_APLICADO;
  const siguiente = d.filas[0];
  const r = d.resumen as { lineas: number; contadas: number };
  async function contar(_p: { error?: string; aviso?: string }, form: FormData) {
    "use server";
    return contarCaja(id, {}, form);
  }
  return (
    <>
      <CabeceraMovil titulo={`Conteo ${id}`} texto={`Bodega ${d.encabezado.bodega ?? "—"} · ${r.contadas} de ${r.lineas} cajas contadas`} volver="/movil/conteo" />
      {aplicado || !siguiente ? (
        <div className="flex flex-col gap-3">
          <Aviso tono="exito">{aplicado ? "Este conteo ya fue aplicado." : "Ya se contaron todas las cajas. Un supervisor puede aplicar el conteo desde el escritorio."}</Aviso>
          <Link href="/movil/conteo" className={clasesBoton("primario", "h-12")}>Volver a los conteos</Link>
        </div>
      ) : (
        <>
          <Tarjeta className="flex flex-col gap-1 p-4">
            <p className="text-xs font-semibold uppercase text-gris-500">Siguiente caja (por ubicación)</p>
            <p className="text-3xl font-extrabold tracking-tight">{String(siguiente.ubicacion ?? "Sin ubicación")}</p>
            <p className="text-base font-semibold">Caja {String(siguiente.caja)}</p>
            <p className="text-sm text-gris-500">{String(siguiente.descripcion ?? siguiente.ean)}</p>
          </Tarjeta>
          <Tarjeta className="p-4">
            <Escaner key={String(siguiente.id)} accion={contar} boton="Guardar conteo" campos={[{ name: "caja", etiqueta: "Caja leída", inputMode: "numeric" }, { name: "cantidad", etiqueta: "Cantidad contada", inputMode: "decimal" }]} />
          </Tarjeta>
        </>
      )}
    </>
  );
}
