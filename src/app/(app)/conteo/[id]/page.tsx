import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCheck, RefreshCw, Trash2 } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { EncabezadoFicha } from "@/components/ficha";
import { celda } from "@/components/seccion-ficha";
import { Aviso, Etiqueta, Tarjeta, formatearFechaHora } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { ESTADO_APLICADO, POR_PAGINA, VISTAS, detalleConteo, type Vista } from "@/lib/conteo/servicio";
import { formatear } from "@/lib/listados";
import { normalizar } from "@/lib/maestros/tipos";
import { aplicar, eliminar, reconteo } from "../acciones";
import { FormularioCantidades, type LineaConteo } from "../formulario-cantidades";
import { textoEstado, textoTipo, tonoEstado } from "../estados";

const AVISOS: Record<string, string> = {
  creado: "Se programó el conteo.",
  reconteo: "Se programó el reconteo con las cajas que tenían diferencia.",
  aplicado: "Se aplicó el conteo al inventario. Cada diferencia quedó registrada como ajuste.",
};
const num = (v: unknown) => formatear(normalizar(v));
const dif = (c: unknown, t: unknown) => (c === null || c === undefined ? null : Math.round((Number(c) - Number(t ?? 0)) * 10000) / 10000);

export default async function FichaConteo({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ver?: string; pagina?: string; aviso?: string }>;
}) {
  const ctx = await requerirPermiso("conteo", "ver");
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) notFound();
  const q = await searchParams;
  const vista: Vista = (VISTAS as readonly string[]).includes(q.ver ?? "") ? (q.ver as Vista) : "todas";
  const pagina = Math.max(1, Number.parseInt(q.pagina ?? "1", 10) || 1);
  const d = await detalleConteo(ctx.db, id, vista, pagina);
  if (!d) notFound();

  const { encabezado: e, resumen: r, filas, total } = d;
  const aplicado = e.estado === ESTADO_APLICADO;
  const puedeEditar = tienePermiso(ctx, "conteo", "editar");
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const href = (ver: Vista, p = 1) => `/conteo/${id}?${new URLSearchParams({ ...(ver !== "todas" ? { ver } : {}), ...(p > 1 ? { pagina: String(p) } : {}) })}`.replace(/\?$/, "");
  const lineas: LineaConteo[] = filas.map((l) => ({
    id: Number(l.id), caja: String(l.caja), ean: String(l.ean), descripcion: String(l.descripcion ?? ""), ubicacion: String(l.ubicacion ?? ""),
    teorico: num(l.teorico), contado: l.contado === null ? "" : String(l.contado), estado: Number(l.estado), diferencia: Number(l.estado) === 1 ? dif(l.contado, l.teorico) : null,
  }));
  const pendientes = Number(r.lineas) - Number(r.contadas);
  const dato = (titulo: string, valor: string) => (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-gris-500">{titulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/conteo" textoVolver="Conteos" titulo={`${textoTipo(e.tipoconteo)} ${e.idconteo}`} descripcion={e.lenguajesql ?? undefined} aviso={AVISOS[q.aviso ?? ""] ?? null} />

      <Tarjeta className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold">Resumen</h2>
            <Etiqueta tono={tonoEstado(e.estado)}>{textoEstado(e.estado)}</Etiqueta>
          </div>
          <div className="flex flex-wrap gap-2">
            {!aplicado && puedeEditar ? (
              <BotonConfirmar etiqueta="Aplicar al inventario" titulo="Aplicar el conteo" confirmar="Sí, aplicar" variante="primario" icono={<CheckCheck className="size-4" aria-hidden />} accion={aplicar.bind(null, id)}>
                El saldo de las {String(r.contadas)} cajas contadas pasará a ser lo contado y cada diferencia quedará como ajuste.
                {pendientes > 0 ? ` Las ${pendientes} cajas sin contar no se modifican.` : ""} Esta acción no se puede deshacer.
              </BotonConfirmar>
            ) : null}
            {!aplicado && tienePermiso(ctx, "conteo", "crear") && Number(r.diferencias) > 0 ? (
              <BotonConfirmar etiqueta="Programar reconteo" titulo="Programar reconteo" confirmar="Programar" icono={<RefreshCw className="size-4" aria-hidden />} accion={reconteo.bind(null, id)}>
                Se creará un conteo nuevo con las {String(r.diferencias)} cajas que tuvieron diferencia.
              </BotonConfirmar>
            ) : null}
            {!aplicado && tienePermiso(ctx, "conteo", "eliminar") ? (
              <BotonConfirmar etiqueta="Eliminar" titulo="Eliminar el conteo" confirmar="Sí, eliminar" variante="peligro" icono={<Trash2 className="size-4" aria-hidden />} accion={eliminar.bind(null, id)}>
                Se eliminará el conteo y todas sus líneas. El inventario no cambia. Esta acción no se puede deshacer.
              </BotonConfirmar>
            ) : null}
          </div>
        </div>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
          {dato("Bodega", e.bodega ?? "—")}
          {dato("Fecha", formatearFechaHora(e.fecha))}
          {dato("Programó", e.programa ?? "—")}
          {dato("Responsable", e.realiza ?? "—")}
          {dato("Cajas", String(r.lineas))}
          {dato("Contadas", `${r.contadas} de ${r.lineas}`)}
          {dato("Con diferencia", String(r.diferencias))}
          {dato("Teórico / contado", `${num(r.teorico)} / ${num(r.contado)}`)}
        </dl>
        {!aplicado && pendientes > 0 && Number(r.contadas) > 0 ? <div className="mt-4"><Aviso tono="aviso">Faltan {pendientes} cajas por contar.</Aviso></div> : null}
      </Tarjeta>

      <Tarjeta>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea px-5 py-3.5">
          <div>
            <h2 className="text-base font-semibold">Cajas del conteo</h2>
            <p className="text-[13px] text-gris-500">{total} {total === 1 ? "caja" : "cajas"}{vista !== "todas" ? ` (${vista})` : ""}</p>
          </div>
          <nav aria-label="Ver" className="flex gap-1.5">
            {VISTAS.map((x) => (
              <Link key={x} href={href(x)} aria-current={x === vista ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${x === vista ? "bg-marca-suave text-marca-texto" : "text-gris-700 hover:bg-hover"}`}>
                {x === "todas" ? "Todas" : x === "pendientes" ? "Pendientes" : "Con diferencia"}
              </Link>
            ))}
          </nav>
        </div>
        {total === 0 ? (
          <p className="px-5 py-8 text-center text-gris-500">{vista === "todas" ? "Este conteo no tiene cajas." : "No hay cajas en esta vista."}</p>
        ) : aplicado || !puedeEditar ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead className="bg-[#fafaf8] text-xs text-gris-500">
                <tr>
                  {["Ubicación", "Caja", "Artículo"].map((t) => <th key={t} className="border-b border-linea px-4 py-2.5 font-medium">{t}</th>)}
                  {["Teórico", "Contado", "Diferencia"].map((t) => <th key={t} className="border-b border-linea px-4 py-2.5 text-right font-medium">{t}</th>)}
                </tr>
              </thead>
              <tbody>
                {lineas.map((l) => (
                  <tr key={l.id}>
                    <td className={celda}>{l.ubicacion || "—"}</td>
                    <td className={`${celda} tabular-nums`}>{l.caja}</td>
                    <td className={celda}>{l.descripcion || l.ean}</td>
                    <td className={`${celda} text-right tabular-nums`}>{l.teorico}</td>
                    <td className={`${celda} text-right tabular-nums`}>{l.contado || "—"}</td>
                    <td className={`${celda} text-right tabular-nums`}>{l.diferencia === null ? "—" : l.diferencia > 0 ? `+${l.diferencia}` : l.diferencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <FormularioCantidades idConteo={id} lineas={lineas} />
        )}
        {paginas > 1 ? (
          <nav aria-label="Paginación" className="flex items-center justify-between gap-3 border-t border-linea px-5 py-3 text-[13px] text-gris-500">
            <span>Página {pagina} de {paginas}</span>
            <span className="flex gap-2">
              {pagina > 1 ? <Link href={href(vista, pagina - 1)} className="font-medium text-marca-texto hover:underline">Anterior</Link> : null}
              {pagina < paginas ? <Link href={href(vista, pagina + 1)} className="font-medium text-marca-texto hover:underline">Siguiente</Link> : null}
            </span>
          </nav>
        ) : null}
      </Tarjeta>
    </div>
  );
}
