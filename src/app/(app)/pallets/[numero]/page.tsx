import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, LockOpen, Printer, Trash2, X } from "lucide-react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { EncabezadoFicha } from "@/components/ficha";
import { Aviso, Etiqueta, Tarjeta, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { detallePallet } from "@/lib/pallets/servicio";
import { formatearFecha } from "@/lib/indicadores/formato";
import { abrirCerrar, eliminar, quitar } from "../acciones";
import { FormularioAgregar, FormularioUbicar } from "./formularios";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(v ?? 0));
const AVISOS: Record<string, string> = { creado: "Se creó el pallet con su primera caja." };

export default async function FichaPallet({ params, searchParams }: { params: Promise<{ numero: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const ctx = await requerirPermiso("pallets", "ver");
  const { numero: t } = await params;
  if (!/^\d+$/.test(t)) notFound();
  const numero = Number(t);
  const p = await detallePallet(ctx.db, numero);
  if (!p) notFound();
  const aviso = AVISOS[(await searchParams).aviso ?? ""];
  const puedeCrear = tienePermiso(ctx, "pallets", "crear");
  const puedeEditar = tienePermiso(ctx, "pallets", "editar");
  return (
    <div className="flex flex-col gap-4">
      <EncabezadoFicha volver="/pallets" textoVolver="Pallets" titulo={`Pallet ${numero}`} descripcion={`${p.cajas.length} cajas · ${n(p.unidades)} unidades · ${p.ubicaciones.length > 1 ? "en varias ubicaciones" : p.ubicaciones[0] ? `en ${p.ubicaciones[0]}` : "sin ubicación"}`} aviso={aviso} />
      <Tarjeta className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta tono={p.abierto ? "exito" : "neutro"}>{p.abierto ? "Abierto" : "Cerrado"}</Etiqueta>
          <div className="ml-auto flex flex-wrap gap-2">
            <Link href={`/pallets/${numero}/etiqueta`} className={clasesBoton("secundario")}><Printer className="size-4" aria-hidden />Etiqueta</Link>
            {puedeEditar ? (
              <BotonConfirmar etiqueta={p.abierto ? "Cerrar" : "Abrir"} titulo={p.abierto ? "Cerrar el pallet" : "Abrir el pallet"} confirmar={p.abierto ? "Sí, cerrar" : "Sí, abrir"} icono={p.abierto ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />} accion={abrirCerrar.bind(null, numero, !p.abierto)}>
                {p.abierto ? "Un pallet cerrado no admite más cajas ni que se le saquen." : "Podrás agregarle y sacarle cajas otra vez."}
              </BotonConfirmar>
            ) : null}
            {tienePermiso(ctx, "pallets", "eliminar") && p.abierto ? (
              <BotonConfirmar etiqueta="Eliminar" titulo="Eliminar el pallet" confirmar="Sí, eliminar" variante="peligro" icono={<Trash2 className="size-4" aria-hidden />} accion={eliminar.bind(null, numero)}>
                Se deshace el pallet; las cajas siguen en su ubicación.
              </BotonConfirmar>
            ) : null}
          </div>
        </div>
        {(puedeCrear && p.abierto) || puedeEditar ? (
          <div className="mt-4 grid gap-6 border-t border-linea pt-4 md:grid-cols-2">
            {puedeCrear && p.abierto ? <FormularioAgregar pallet={numero} /> : <div />}
            {puedeEditar ? <FormularioUbicar pallet={numero} /> : null}
          </div>
        ) : null}
        {!p.abierto && puedeCrear ? <div className="mt-4"><Aviso tono="aviso">El pallet está cerrado: ábrelo para agregarle cajas.</Aviso></div> : null}
      </Tarjeta>
      <Tarjeta>
        <div className="overflow-x-auto">
          <table className="w-full min-w-max text-left text-[13.5px]">
            <thead>
              <tr className="border-b border-linea text-[12.5px] text-gris-500">
                {["Caja", "Artículo", "Lote", "Vence", "Calidad", "Saldo", "Ubicación", ""].map((h, i) => <th key={i} scope="col" className={`px-3 py-2.5 font-medium ${h === "Saldo" ? "text-right" : ""}`}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {p.cajas.map((c) => (
                <tr key={String(c.caja)} className="border-b border-linea last:border-0">
                  <td className="px-3 py-2 font-medium">{String(c.caja)}</td>
                  <td className="px-3 py-2">{String(c.articulo ?? "—")}<span className="block text-xs text-gris-500">{String(c.ean ?? "")}</span></td>
                  <td className="px-3 py-2">{String(c.lote ?? "—")}</td>
                  <td className="px-3 py-2">{c.vence instanceof Date ? formatearFecha(c.vence) : "—"}</td>
                  <td className="px-3 py-2">{String(c.calidad ?? "—")}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{n(c.saldo)}</td>
                  <td className="px-3 py-2">{String(c.ubicacion ?? "—")}</td>
                  <td className="px-3 py-2 text-right">
                    {puedeEditar && p.abierto ? (
                      <BotonConfirmar etiqueta="Sacar" titulo={`Sacar la caja ${c.caja}`} confirmar="Sí, sacar" icono={<X className="size-4" aria-hidden />} accion={quitar.bind(null, numero, Number(c.caja))}>
                        La caja deja de pertenecer al pallet; sigue en su ubicación actual.
                      </BotonConfirmar>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
    </div>
  );
}
