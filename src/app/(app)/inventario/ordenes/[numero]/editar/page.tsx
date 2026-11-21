import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { ESTADOS, fichaOrden } from "@/lib/compras/ordenes";
import { bodegasConStock } from "@/lib/inventario/consultas";
import { editar } from "../../acciones";
import { FormularioOrden } from "../../nueva/formulario-orden";

export default async function EditarOrden({ params }: { params: Promise<{ numero: string }> }) {
  const { db } = await requerirPermiso("inventario", "editar");
  const { numero: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const numero = Number(t);
  const f = await fichaOrden(db, numero);
  if (!f) notFound();
  const abierta = f.orden.estado === ESTADOS.abierta || f.orden.estado === ESTADOS.parcial;
  const hayRecibo = f.lineas.some((l) => Number(l.recibido) > 0);
  const esperada = f.lineas.find((l) => l.esperada instanceof Date)?.esperada as Date | undefined;
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver={`/inventario/ordenes/${numero}`} textoVolver={`Orden ${numero}`} titulo={`Editar la orden ${numero}`} descripcion="Cambia las cantidades, agrega o quita líneas. Lo ya recibido no se puede quitar ni dejar por debajo." />
      {!abierta ? <Aviso tono="error">La orden está {String(f.orden.estado).toLowerCase()}: ya no se puede editar.</Aviso> : (
        <Tarjeta className="p-5">
          <FormularioOrden
            bodegas={await bodegasConStock(db)} accion={editar.bind(null, numero)}
            inicial={{ numero, nit: f.orden.proveedor ?? "", bodega: String(f.lineas[0]?.bodega ?? ""), esperada: esperada ? esperada.toISOString().slice(0, 10) : "", observaciones: f.orden.observacionescompra ?? "", bloquear: hayRecibo, lineas: f.lineas.map((l) => ({ ean: String(l.ean), cantidad: Number(l.pedido), precio: l.precio === null ? null : Number(l.precio), recibido: Number(l.recibido) })) }}
          />
        </Tarjeta>
      )}
    </div>
  );
}
