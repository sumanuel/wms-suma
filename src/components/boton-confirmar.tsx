"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { Aviso, clasesBoton } from "@/components/ui";

// Botón que pide confirmación en un diálogo antes de ejecutar una acción del servidor. Si la acción redirige, no vuelve;
// solo vuelve cuando no pudo, con el motivo en `error`.
export function BotonConfirmar({
  etiqueta,
  titulo,
  children,
  confirmar,
  accion,
  variante = "secundario",
  icono,
}: {
  etiqueta: string;
  titulo: string;
  children: ReactNode;
  confirmar: string;
  accion: () => Promise<{ error?: string } | void>;
  variante?: "primario" | "secundario" | "peligro";
  icono?: ReactNode;
}) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();
  const [error, setError] = useState<string | null>(null);
  const [ejecutando, iniciar] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          dialogo.current?.showModal();
        }}
        className={clasesBoton(variante)}
      >
        {icono}
        {etiqueta}
      </button>
      <dialog
        ref={dialogo}
        aria-labelledby={idTitulo}
        onClick={(e) => e.target === dialogo.current && !ejecutando && dialogo.current.close()}
        onCancel={(e) => ejecutando && e.preventDefault()}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[14px] border border-borde bg-white p-5 text-left text-tinta shadow-[0_16px_48px_rgba(24,24,27,0.2)] backdrop:bg-tinta/40"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h2 id={idTitulo} className="text-[16px] font-semibold">
              {titulo}
            </h2>
            <div className="text-sm text-gris-600">{children}</div>
          </div>
          {error ? <Aviso tono="error">{error}</Aviso> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" disabled={ejecutando} onClick={() => dialogo.current?.close()} className={clasesBoton("secundario")}>
              Cancelar
            </button>
            <button
              type="button"
              disabled={ejecutando}
              onClick={() =>
                iniciar(async () => {
                  const r = await accion();
                  if (r && r.error) setError(r.error);
                  // Si la acción terminó bien y no redirigió, el diálogo ya cumplió su función.
                  else dialogo.current?.close();
                })
              }
              className={clasesBoton(variante === "peligro" ? "peligro" : "primario")}
            >
              {ejecutando ? "Procesando…" : confirmar}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
