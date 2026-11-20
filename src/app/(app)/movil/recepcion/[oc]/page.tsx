import { notFound } from "next/navigation";
import Link from "next/link";
import { Aviso, Tarjeta, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { ESTADOS, fichaOrden } from "@/lib/compras/ordenes";
import { recibirMovil } from "../../acciones";
import { CabeceraMovil } from "../../cabecera";
import { Escaner } from "../../escaner";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(v ?? 0));

export default async function RecibirOrdenMovil({ params }: { params: Promise<{ oc: string }> }) {
  const { db } = await requerirPermiso("inventario", "crear");
  const { oc } = await params;
  if (!/^\d+$/.test(oc)) notFound();
  const numero = Number(oc);
  const f = await fichaOrden(db, numero);
  if (!f) notFound();
  const abierta = f.orden.estado === ESTADOS.abierta || f.orden.estado === ESTADOS.parcial;
  const pendientes = f.lineas.filter((l) => Number(l.pendiente) > 0);
  async function recibir(_p: { error?: string; aviso?: string }, form: FormData) {
    "use server";
    return recibirMovil(numero, {}, form);
  }
  return (
    <>
      <CabeceraMovil titulo={`Orden ${numero}`} texto={`${f.proveedor?.nombrecliente ?? f.orden.proveedor ?? "—"} · ${String(f.orden.estado)}`} volver="/movil/recepcion" />
      {!abierta || pendientes.length === 0 ? (
        <div className="flex flex-col gap-3">
          <Aviso tono="exito">{abierta ? "No queda nada pendiente en esta orden." : `La orden está ${String(f.orden.estado).toLowerCase()}.`}</Aviso>
          <Link href="/movil/recepcion" className={clasesBoton("primario", "h-12")}>Volver a las órdenes</Link>
        </div>
      ) : (
        <>
          <Tarjeta className="p-4">
            <h2 className="mb-2 text-base font-bold">Pendiente</h2>
            <ul className="flex flex-col">
              {pendientes.map((l) => (
                <li key={String(l.id)} className="flex items-start justify-between gap-3 border-b border-linea py-2 last:border-0">
                  <span className="flex flex-col"><span className="font-semibold">{String(l.articulo ?? l.ean)}</span><span className="text-xs text-gris-500">{String(l.ean)}</span></span>
                  <span className="font-bold tabular-nums">{n(l.pendiente)}</span>
                </li>
              ))}
            </ul>
          </Tarjeta>
          <Tarjeta className="p-4">
            <Escaner key={`${pendientes.length}-${pendientes.map((l) => l.pendiente).join(",")}`} accion={recibir} boton="Registrar recibo" campos={[
              { name: "ean", etiqueta: "Código de barras del artículo" },
              { name: "lote", etiqueta: "Lote" },
              { name: "vence", etiqueta: "Vence (AAAA-MM-DD)", opcional: true, ayuda: "Déjalo vacío si el lote no vence." },
              { name: "cajas", etiqueta: "Número de cajas", inputMode: "numeric" },
              { name: "cantidad", etiqueta: "Cantidad por caja", inputMode: "decimal" },
            ]} />
          </Tarjeta>
          <p className="text-xs text-gris-500">Las cajas quedan en la ubicación de recibo con calidad Cuarentena; imprime sus etiquetas desde el escritorio y luego usa «Almacenar».</p>
        </>
      )}
    </>
  );
}
