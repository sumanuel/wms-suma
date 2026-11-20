import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { celda } from "@/components/seccion-ficha";
import { Aviso, Etiqueta, Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { pedidoCompleto } from "@/lib/pedidos/servicio";
import { infoEstado } from "@/lib/pedidos/estados";
import { FormularioGenerar } from "../../formulario-generar";

const n = (v: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(v);

export default async function GenerarPicking({ params }: { params: Promise<{ numero: string }> }) {
  const { db } = await requerirPermiso("picking", "crear");
  const numero = decodeURIComponent((await params).numero);
  const p = await pedidoCompleto(db, numero);
  if (!p) notFound();
  const e = p.encabezado;
  const idPicking = Number(e.idpicking ?? 0);
  const aprobado = [7, 4].includes(Number(e.busca_aprobacion ?? 0));
  const lineas = p.lineas.map((l) => ({ ...l, pendiente: Math.max((l.pares ?? 0) - (l.udsentreg ?? 0), 0) })).filter((l) => l.pendiente > 0);
  const cubre = lineas.reduce((s, l) => s + Math.min(l.pendiente, l.disponible), 0);
  const total = lineas.reduce((s, l) => s + l.pendiente, 0);
  const transportadores = (await db.transportador.findMany({ where: { estado: 1 }, select: { transportador: true }, orderBy: { transportador: "asc" } })).map((t) => t.transportador);
  const bodegas = [...new Set(lineas.map((l) => l.bodega))];

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/picking/pendientes" textoVolver="Pedidos listos para picking" titulo={`Generar picking del pedido ${e.npedido}`} descripcion={p.cliente?.nombrecliente ?? e.cliente ?? undefined} />
      <Tarjeta className="p-5">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-base font-semibold">Lo que se puede cubrir hoy</h2>
          <Etiqueta tono={infoEstado(e.busca_aprobacion).tono}>{infoEstado(e.busca_aprobacion).texto}</Etiqueta>
        </div>
        {!aprobado ? <Aviso tono="aviso">El pedido no está aprobado: no se puede generar su picking.</Aviso> : null}
        {idPicking > 0 ? <Aviso tono="aviso">El pedido ya tiene el picking {idPicking}.</Aviso> : null}
        {bodegas.length > 1 ? <Aviso tono="error">El pedido tiene líneas en varias bodegas ({bodegas.join(", ")}): un picking es de una sola bodega.</Aviso> : null}
        <p className="mb-3 text-[13.5px] text-gris-500">
          Se asignan primero las cajas de lotes que vencen antes y, a igual vencimiento, las de la ubicación que va primero en la ruta. Cubre {n(cubre)} de {n(total)} unidades pendientes.
        </p>
        <div className="overflow-x-auto rounded-[10px] border border-linea">
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead className="bg-[#fafaf8] text-xs text-gris-500">
              <tr>
                <th className="border-b border-linea px-4 py-2.5 font-medium">Artículo</th>
                <th className="border-b border-linea px-4 py-2.5 font-medium">Bodega</th>
                {["Pendiente", "Disponible", "Faltaría"].map((t) => <th key={t} className="border-b border-linea px-4 py-2.5 text-right font-medium">{t}</th>)}
              </tr>
            </thead>
            <tbody>
              {lineas.map((l) => {
                const falta = Math.max(l.pendiente - l.disponible, 0);
                return (
                  <tr key={l.contador}>
                    <td className={celda}><span className="font-medium">{l.descripcion ?? l.ref}</span><span className="block text-xs text-gris-500">{l.ref}</span></td>
                    <td className={celda}>{l.bodega}</td>
                    <td className={`${celda} text-right tabular-nums`}>{n(l.pendiente)}</td>
                    <td className={`${celda} text-right tabular-nums`}>{n(l.disponible)}</td>
                    <td className={`${celda} text-right tabular-nums ${falta > 0 ? "font-semibold text-error" : "text-gris-500"}`}>{falta > 0 ? n(falta) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      {aprobado && idPicking === 0 && bodegas.length <= 1 ? (
        <Tarjeta className="p-5">
          <h2 className="mb-3 text-base font-semibold">Datos del picking</h2>
          <FormularioGenerar numero={numero} transportadores={transportadores} />
        </Tarjeta>
      ) : null}
    </div>
  );
}
