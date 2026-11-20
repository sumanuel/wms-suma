"use client";

import { useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { Aviso, clasesBoton } from "@/components/ui";

// Si elimina, la acción redirige; solo vuelve cuando no pudo.
export type EliminarFila = () => Promise<{ error?: string }>;

const claseIcono = "flex size-8 items-center justify-center rounded-[9px] border bg-white shadow-[0_1px_2px_rgba(24,24,27,0.05)] transition";

export function AccionesFila({
  nombre,
  elemento,
  href,
  editable,
  eliminar,
}: {
  nombre: string;
  elemento: string;
  href?: string;
  editable: boolean;
  eliminar?: EliminarFila;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const titulo = useId();
  const [error, setError] = useState<string | null>(null);
  const [eliminando, iniciar] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1.5">
      {href ? (
        <Link
          href={href}
          aria-label={`${editable ? "Editar" : "Ver"} ${nombre}`}
          title={editable ? "Editar" : "Ver"}
          className={`${claseIcono} border-borde-campo text-gris-700 hover:border-[#f8c4b6] hover:bg-marca-suave hover:text-marca-texto`}
        >
          {editable ? <Pencil className="size-[15px]" strokeWidth={2.1} aria-hidden /> : <Eye className="size-[15px]" strokeWidth={2.1} aria-hidden />}
        </Link>
      ) : null}
      {eliminar ? (
        <>
          <button
            type="button"
            aria-label={`Eliminar ${nombre}`}
            title="Eliminar"
            onClick={() => {
              setError(null);
              dialogo.current?.showModal();
            }}
            className={`${claseIcono} border-[#f3c7c7] text-error hover:border-[#eaa5a5] hover:bg-error-suave`}
          >
            <Trash2 className="size-[15px]" strokeWidth={2.1} aria-hidden />
          </button>
          {/* El preflight de Tailwind le quita el margen al dialog: sin m-auto no queda centrado. Aunque se muestre
              encima de todo, hereda los estilos de la celda donde está: de ahí text-left y whitespace-normal. */}
          <dialog
            ref={dialogo}
            aria-labelledby={titulo}
            onClick={(e) => e.target === dialogo.current && !eliminando && dialogo.current.close()}
            onCancel={(e) => eliminando && e.preventDefault()}
            className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-[14px] border border-borde bg-white p-5 text-left whitespace-normal text-tinta shadow-[0_16px_48px_rgba(24,24,27,0.2)] backdrop:bg-tinta/40"
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <h2 id={titulo} className="text-[16px] font-semibold">
                  Eliminar {elemento}
                </h2>
                <p className="text-sm text-gris-600">
                  Se eliminará «{nombre}». Esta acción no se puede deshacer.
                </p>
              </div>
              {error ? <Aviso tono="error">{error}</Aviso> : null}
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" disabled={eliminando} onClick={() => dialogo.current?.close()} className={clasesBoton("secundario")}>
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={eliminando || !!error}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await eliminar();
                      if (r.error) setError(r.error);
                    })
                  }
                  className={clasesBoton("peligro")}
                >
                  {eliminando ? "Eliminando…" : "Sí, eliminar"}
                </button>
              </div>
            </div>
          </dialog>
        </>
      ) : null}
    </div>
  );
}
