import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, PackageCheck, Pencil, Trash2 } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Etiqueta, Tarjeta, clasesBoton, formatearFechaHora } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { ESTADO, TRANSICIONES, esEditable, infoEstado } from "@/lib/pedidos/estados";
import { pedidoCompleto } from "@/lib/pedidos/servicio";
import { formatear } from "@/lib/listados";
import { normalizar } from "@/lib/maestros/tipos";
import { cambiarEstadoPedido, eliminarPedidoAccion, reservarPedido } from "../acciones";
import { LineasPedido, type LineaVista } from "../lineas-pedido";

const AVISOS: Record<string, string> = {
  creado: "Se creó el pedido. Agrega sus líneas abajo.",
  editado: "Se guardaron los datos del pedido.",
  estado: "Se cambió el estado del pedido.",
  reservado: "Se calculó la reserva de cada línea con lo disponible hoy.",
};

const dato = (titulo: string, valor: string) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-gris-500">{titulo}</dt>
    <dd className="font-medium">{valor}</dd>
  </div>
);
const f = (v: unknown, tipo: "fecha" | "texto" = "texto") => formatear(normalizar(v), tipo);

export default async function FichaPedido({ params, searchParams }: { params: Promise<{ numero: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const ctx = await requerirPermiso("pedidos", "ver");
  const numero = decodeURIComponent((await params).numero);
  const [p, { aviso }, bodegas] = await Promise.all([pedidoCompleto(ctx.db, numero), searchParams, bodegasConStock(ctx.db)]);
  if (!p) notFound();

  const e = p.encabezado;
  const estado = Number(e.busca_aprobacion ?? 0);
  const info = infoEstado(estado);
  const editable = esEditable(estado) && tienePermiso(ctx, "pedidos", "editar");
  const puedeEditar = tienePermiso(ctx, "pedidos", "editar");
  const lineas: LineaVista[] = p.lineas.map((l) => ({
    contador: l.contador, ean: l.ref ?? "", descripcion: l.descripcion ?? "", unidad: l.unidad ?? "", bodega: l.bodega ?? "", pedido: l.pares ?? 0, entregado: l.udsentreg ?? 0,
    reservado: l.reserva ?? 0, precio: l.precio_unitario ?? 0, disponible: l.disponible, observaciones: l.observaciones ?? "",
  }));
  const pendiente = lineas.reduce((s, l) => s + Math.max(l.pedido - l.entregado, 0), 0);
  const reservado = lineas.reduce((s, l) => s + l.reservado, 0);
  const idPicking = Number(e.idpicking ?? 0);
  const transiciones = puedeEditar && !(estado === ESTADO.APROBADO && idPicking > 0) ? (TRANSICIONES[estado] ?? []) : [];

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/pedidos" textoVolver="Pedidos" titulo={`Pedido ${e.npedido}`} descripcion={p.cliente?.nombrecliente ?? e.cliente ?? undefined} aviso={AVISOS[aviso ?? ""] ?? null} />

      <Tarjeta className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Datos del pedido</h2>
            <Etiqueta tono={info.tono}>{info.texto}</Etiqueta>
          </div>
          <div className="flex flex-wrap gap-2">
            {editable ? (
              <Link href={`/pedidos/${encodeURIComponent(numero)}/editar`} className={clasesBoton("secundario")}>
                <Pencil className="size-4" aria-hidden />
                Editar datos
              </Link>
            ) : null}
            {puedeEditar && ![ESTADO.CONGELADO, ESTADO.DESPACHO_TOTAL].includes(estado as 1 | 3) && lineas.length > 0 ? (
              <BotonConfirmar etiqueta="Reservar existencias" titulo="Reservar existencias" confirmar="Reservar" icono={<PackageCheck className="size-4" aria-hidden />} accion={reservarPedido.bind(null, numero)}>
                En cada línea se reservará lo que se pueda cumplir hoy: el menor entre lo pendiente y lo disponible en lotes aprobados y vigentes.
              </BotonConfirmar>
            ) : null}
            {transiciones.map((t) => (
              <BotonConfirmar key={t.a} etiqueta={t.etiqueta} titulo={t.etiqueta} confirmar="Confirmar" variante={t.a === ESTADO.APROBADO ? "primario" : t.a === ESTADO.CONGELADO ? "peligro" : "secundario"} icono={t.a === ESTADO.CONGELADO ? <Lock className="size-4" aria-hidden /> : undefined} accion={cambiarEstadoPedido.bind(null, numero, t.a)}>
                {t.descripcion}
              </BotonConfirmar>
            ))}
            {tienePermiso(ctx, "pedidos", "eliminar") && (estado === ESTADO.EN_ELABORACION || estado === 0) && idPicking === 0 ? (
              <BotonConfirmar etiqueta="Eliminar" titulo="Eliminar el pedido" confirmar="Sí, eliminar" variante="peligro" icono={<Trash2 className="size-4" aria-hidden />} accion={eliminarPedidoAccion.bind(null, numero)}>
                Se eliminará el pedido con todas sus líneas. Esta acción no se puede deshacer.
              </BotonConfirmar>
            ) : null}
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {dato("Cliente", p.cliente ? `${p.cliente.nombrecliente ?? ""} (${p.cliente.nit})` : (e.cliente ?? "—"))}
          {dato("Sede de entrega", p.sede ? `${p.sede.nombrecliente ?? p.sede.item}${p.sede.ciudad ? ` · ${p.sede.ciudad}` : ""}` : "—")}
          {dato("Fecha del pedido", f(e.fechapedido, "fecha"))}
          {dato("Vence", f(e.fechavence, "fecha"))}
          {dato("Orden de compra", f(e.ocompra))}
          {dato("Tipo de venta", f(e.tipoventa))}
          {dato("Prioridad", f(e.prioridad))}
          {dato("Solicita", f(e.personasolicitapedido))}
          {dato("Dirección de envío", f(e.direcciondeenvio ?? p.sede?.direccion))}
          {dato("Registrado por", f(e.registradopor))}
          {dato("Aprobado por", e.personaapruebapedido ? `${e.personaapruebapedido}${e.fecha_cartera ? ` · ${formatearFechaHora(e.fecha_cartera)}` : ""}` : "—")}
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-gris-500">Picking</dt>
            <dd className="font-medium">
              {idPicking > 0 ? (
                <Link href={`/picking/${idPicking}`} className="text-marca-texto hover:underline">{idPicking}</Link>
              ) : (
                "Sin asignar"
              )}
            </dd>
          </div>
        </dl>
        {e.requisitos ? <p className="mt-4 rounded-[10px] bg-neutro-suave px-3.5 py-2.5 text-[13.5px] text-gris-700">{e.requisitos}</p> : null}
        <p className="mt-4 text-[13px] text-gris-500">
          {lineas.length} línea{lineas.length === 1 ? "" : "s"} · pendiente {new Intl.NumberFormat("es-CO").format(pendiente)} und. · reservado {new Intl.NumberFormat("es-CO").format(reservado)} und.
        </p>
        {!esEditable(estado) && puedeEditar ? <div className="mt-3"><Aviso tono="aviso">El pedido está {info.texto.toLowerCase()}: sus datos y líneas no se pueden modificar.</Aviso></div> : null}
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea px-5 py-3.5">
          <h2 className="text-base font-semibold">Líneas del pedido</h2>
          <p className="text-[13px] text-gris-500">«Disponible» es lo que hay hoy en lotes aprobados y vigentes de esa bodega.</p>
        </div>
        <LineasPedido numero={numero} lineas={lineas} editable={editable} bodegas={bodegas} />
      </Tarjeta>
    </div>
  );
}
