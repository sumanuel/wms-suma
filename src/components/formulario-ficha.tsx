"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Aviso, claseControl, claseSoloLectura, clasesBoton } from "@/components/ui";
import type { CampoForm, EstadoForm, Valores } from "@/lib/formularios";

const columnas = { 1: "", 2: "sm:col-span-2", 3: "sm:col-span-2 xl:col-span-3" } as const;

export function FormularioFicha({
  campos,
  valores,
  accion,
  cancelar,
  editando,
  soloLectura = false,
}: {
  campos: CampoForm[];
  valores: Valores;
  accion: (estado: EstadoForm, form: FormData) => Promise<EstadoForm>;
  cancelar: string;
  editando: boolean;
  soloLectura?: boolean;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {});
  const actuales = estado.valores ?? valores;
  const errores = estado.errores ?? {};

  return (
    // La clave rehace los campos no controlados con lo último que se envió (React los vacía al terminar la acción).
    <form action={enviar} key={estado.intento ?? 0} className="flex flex-col gap-5" noValidate>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
        {campos.map((c) => {
          const id = `campo-${c.nombre}`;
          const error = errores[c.nombre];
          const bloqueado = soloLectura || (c.soloCrear && editando);
          const detalle = error || c.ayuda ? `${id}-detalle` : undefined;
          const etiqueta = (
            <label htmlFor={id} className="text-[13px] font-medium">
              {c.etiqueta}
              {c.requerido ? null : <span className="font-normal text-gris-500"> (opcional)</span>}
            </label>
          );
          const pie = error ? (
            <p id={detalle} className="text-[12.5px] text-error">
              {error}
            </p>
          ) : c.ayuda ? (
            <p id={detalle} className="text-[12.5px] text-gris-500">
              {c.ayuda}
            </p>
          ) : null;

          if (c.tipo === "booleano") {
            return (
              <div key={c.nombre} className={`flex items-start gap-2.5 pt-1 ${columnas[c.ancho ?? 1]}`}>
                <input
                  id={id}
                  name={c.nombre}
                  type="checkbox"
                  defaultChecked={actuales[c.nombre] === true}
                  disabled={bloqueado}
                  aria-describedby={detalle}
                  className="mt-0.5 size-4 accent-marca-fuerte"
                />
                <div className="flex flex-col gap-0.5">
                  <label htmlFor={id} className="text-[13.5px] font-medium">
                    {c.etiqueta}
                  </label>
                  {pie}
                </div>
              </div>
            );
          }

          const comun = {
            id,
            name: c.nombre,
            disabled: bloqueado,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": detalle,
          } as const;

          return (
            <div key={c.nombre} className={`flex flex-col gap-1.5 ${columnas[c.ancho ?? 1]}`}>
              {etiqueta}
              {c.tipo === "seleccion" ? (
                <select {...comun} defaultValue={String(actuales[c.nombre] ?? "")} className={`${claseControl} pr-9`}>
                  <option value="">Elegir…</option>
                  {c.opciones?.map((o) => (
                    <option key={o.valor} value={o.valor}>
                      {o.etiqueta}
                    </option>
                  ))}
                </select>
              ) : c.tipo === "textoLargo" ? (
                <textarea
                  {...comun}
                  rows={3}
                  defaultValue={String(actuales[c.nombre] ?? "")}
                  className={`${claseControl} ${claseSoloLectura} h-auto py-2`}
                />
              ) : (
                <input
                  {...comun}
                  type={c.tipo === "fecha" ? "date" : "text"}
                  inputMode={c.tipo === "entero" ? "numeric" : c.tipo === "decimal" ? "decimal" : undefined}
                  maxLength={c.max}
                  defaultValue={String(actuales[c.nombre] ?? "")}
                  className={`${claseControl} ${claseSoloLectura}`}
                />
              )}
              {pie}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-linea pt-5">
        {soloLectura ? null : (
          <button type="submit" disabled={pendiente} className={clasesBoton("primario")}>
            {pendiente ? "Guardando…" : editando ? "Guardar cambios" : "Crear"}
          </button>
        )}
        <Link href={cancelar} className="text-sm font-medium text-gris-700 hover:text-tinta">
          {soloLectura ? "Volver" : "Cancelar"}
        </Link>
      </div>
    </form>
  );
}
