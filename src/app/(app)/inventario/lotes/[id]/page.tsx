import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { celda } from "@/components/seccion-ficha";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { cajasDelLote, loteCompleto } from "@/lib/inventario/consultas";
import { ESTADOS_CALIDAD } from "@/lib/inventario/calidad";
import { formatear } from "@/lib/listados";
import { normalizar } from "@/lib/maestros/tipos";
import { tonoEstado } from "../../estados";
import { FormularioEstado } from "../../formulario-estado";

const dato = (titulo: string, valor: string) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-xs text-gris-500">{titulo}</dt>
    <dd className="font-medium">{valor}</dd>
  </div>
);

export default async function FichaLote({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const ctx = await requerirPermiso("inventario", "ver");
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const lote = await loteCompleto(ctx.db, id);
  if (!lote) notFound();
  const [historial, cajas, { aviso }] = await Promise.all([
    ctx.db.historiaStatusCalidad.findMany({ where: { lote: String(lote.lote), productoean: String(lote.ean) }, orderBy: { id: "desc" } }),
    cajasDelLote(ctx.db, String(lote.lote), String(lote.ean)),
    searchParams,
  ]);
  const puedeCambiar = tienePermiso(ctx, "inventario", "editar");
  const estado = lote.estado ? String(lote.estado) : null;
  const rechazado = (estado ?? "").trim().toLowerCase() === "rechazado";
  const f = (k: string, tipo: "fecha" | "texto" = "texto") => formatear(normalizar(lote[k]), tipo);

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha
        volver="/inventario/lotes"
        textoVolver="Lotes"
        titulo={`Lote ${lote.lote}`}
        descripcion={`${lote.descripcion ?? lote.ean} · ${lote.ean}`}
        aviso={aviso === "estado" ? "Se cambió el estado de calidad del lote." : null}
      />

      <Tarjeta className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-base font-semibold">Datos del lote</h2>
          {estado ? <Etiqueta tono={tonoEstado(estado)}>{estado}</Etiqueta> : <Etiqueta>Sin estado</Etiqueta>}
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {dato("Proveedor (NIT)", f("proveedor"))}
          {dato("Ingreso", f("ingreso", "fecha"))}
          {dato("Vence", f("vence", "fecha"))}
          {dato("Control de liberación", f("control"))}
          {dato("Cajas", f("cajas"))}
          {dato("Saldo", `${f("saldo")} ${lote.unidad ?? ""}`.trim())}
          {dato("Pedido del proveedor", f("pedproveedor"))}
          {dato("Orden", f("ord_no"))}
        </dl>
      </Tarjeta>

      {puedeCambiar ? (
        <Tarjeta className="p-5">
          <h2 className="mb-1 text-base font-semibold">Cambiar estado de calidad</h2>
          {rechazado ? (
            <Aviso tono="aviso">Este lote está rechazado: su estado ya no se puede cambiar.</Aviso>
          ) : (
            <div className="mt-3">
              <FormularioEstado idlote={id} actual={estado} control={lote.control ? String(lote.control) : ""} opciones={[...ESTADOS_CALIDAD]} />
            </div>
          )}
        </Tarjeta>
      ) : null}

      <Tarjeta>
        <div className="border-b border-linea px-5 py-3.5">
          <h2 className="text-base font-semibold">Historial de estados</h2>
          <p className="text-[13px] text-gris-500">Cada cambio de estado, con el saldo del lote en ese momento.</p>
        </div>
        {historial.length === 0 ? (
          <p className="px-5 py-6 text-[13.5px] text-gris-500">Todavía no tiene estados registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead className="bg-[#fafaf8] text-xs text-gris-500">
                <tr>
                  <th className="border-b border-linea px-4 py-2.5 font-medium">Fecha</th>
                  <th className="border-b border-linea px-4 py-2.5 font-medium">Estado</th>
                  <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td className={`${celda} whitespace-nowrap tabular-nums`}>{formatearFechaHora(h.fecha_registro)}</td>
                    <td className={celda}>
                      <Etiqueta tono={tonoEstado(h.estado)}>{h.estado ?? "—"}</Etiqueta>
                    </td>
                    <td className={`${celda} text-right tabular-nums`}>{formatear(normalizar(h.saldo))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>

      <Tarjeta>
        <div className="border-b border-linea px-5 py-3.5">
          <h2 className="text-base font-semibold">Cajas del lote</h2>
          <p className="text-[13px] text-gris-500">{cajas.length === 0 ? "Todavía no tiene cajas generadas." : `${cajas.length} caja${cajas.length === 1 ? "" : "s"}.`}</p>
        </div>
        {cajas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-left text-sm">
              <thead className="bg-[#fafaf8] text-xs text-gris-500">
                <tr>
                  {["Caja", "Ubicación", "Bodega", "Tipo", "Calidad"].map((t) => (
                    <th key={t} className="border-b border-linea px-4 py-2.5 font-medium">
                      {t}
                    </th>
                  ))}
                  <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Saldo</th>
                  <th className="border-b border-linea px-4 py-2.5 text-right font-medium">Reservado</th>
                </tr>
              </thead>
              <tbody>
                {cajas.map((c) => (
                  <tr key={String(c.caja)}>
                    <td className={`${celda} tabular-nums`}>{String(c.caja)}</td>
                    <td className={celda}>{formatear(normalizar(c.ubicacion))}</td>
                    <td className={celda}>{formatear(normalizar(c.bodega))}</td>
                    <td className={celda}>{formatear(normalizar(c.tipo))}</td>
                    <td className={celda}>{c.estado ? <Etiqueta tono={tonoEstado(String(c.estado))}>{String(c.estado)}</Etiqueta> : "—"}</td>
                    <td className={`${celda} text-right tabular-nums`}>{formatear(normalizar(c.saldo))}</td>
                    <td className={`${celda} text-right tabular-nums`}>{formatear(normalizar(c.reserva))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Tarjeta>
    </div>
  );
}
