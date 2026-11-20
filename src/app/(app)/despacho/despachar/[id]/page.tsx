import Link from "next/link";
import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { resumenDespacho, VALIDA_FACTURABLE } from "@/lib/despacho/servicio";
import { FormularioDespachar } from "../../formulario-despachar";

const n = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(v);
const dato = (titulo: string, valor: string) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-gris-500">{titulo}</dt>
    <dd className="font-medium">{valor}</dd>
  </div>
);

export default async function Despachar({ params }: { params: Promise<{ id: string }> }) {
  const { db } = await requerirPermiso("despacho", "crear");
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const d = await resumenDespacho(db, id);
  if (!d) notFound();
  const e = d.encabezado;
  const listo = Number(e.valida ?? 0) === VALIDA_FACTURABLE && !d.guiaActiva;

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/despacho" textoVolver="Por despachar" titulo={`Despachar el picking ${id}`} descripcion={e.npedid ? `Pedido ${e.npedid}${d.cliente ? ` · ${d.cliente.nombrecliente}` : ""}` : undefined} />
      {d.guiaActiva ? (
        <Aviso tono="aviso">
          Este picking ya tiene la guía {d.guiaActiva.num_guia}.{" "}
          <Link href={`/despacho/guias/${d.guiaActiva.auto}`} className="font-semibold underline">Ver la guía</Link>
        </Aviso>
      ) : null}
      {!d.guiaActiva && !listo ? <Aviso tono="aviso">El picking todavía no está listo para despachar: debe tener la aduana terminada.</Aviso> : null}
      <Tarjeta className="p-5">
        <h2 className="mb-4 text-base font-semibold">Lo que se despacha</h2>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {dato("Destinatario", d.sede?.nombrecliente ?? d.cliente?.nombrecliente ?? "—")}
          {dato("Dirección", d.pedido?.direcciondeenvio ?? d.sede?.direccion ?? "—")}
          {dato("Ciudad", d.sede?.ciudad ?? "—")}
          {dato("Teléfono", d.sede?.telefono ?? "—")}
          {dato("Cajas", String(d.cajas))}
          {dato("Unidades", n(d.unidades))}
          {dato("Peso", n(d.kilos))}
          {dato("Valor de la mercancía", n(d.valorMercancia))}
        </dl>
      </Tarjeta>
      {listo ? (
        <Tarjeta className="p-5">
          <h2 className="mb-1 text-base font-semibold">Guía de transporte</h2>
          <p className="mb-4 text-[13.5px] text-gris-500">Se toma el siguiente número del transportador, se descuenta lo entregado del pedido y el picking queda despachado.</p>
          <FormularioDespachar picking={id} transportadores={d.transportadores} predeterminado={e.transportador ?? ""} valorMercancia={d.valorMercancia} />
        </Tarjeta>
      ) : null}
    </div>
  );
}
