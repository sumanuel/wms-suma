"use client";

import { Printer } from "lucide-react";
import { useState, useTransition } from "react";
import { Aviso, clasesBoton } from "@/components/ui";
import { marcarImpresas } from "../../acciones";

// Imprime y deja constancia (t_entradas_ras.impresa) de que las etiquetas salieron: así se detectan reimpresiones.
export function ImprimirCajas({ cajas, puedeRegistrar }: { cajas: number[]; puedeRegistrar: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={pendiente}
        className={clasesBoton("primario")}
        onClick={() => iniciar(async () => {
          setError(null);
          if (puedeRegistrar) {
            const r = await marcarImpresas(cajas);
            if (r.error) { setError(r.error); return; }
          }
          window.print();
        })}
      >
        <Printer className="size-4" aria-hidden />{pendiente ? "Preparando…" : "Imprimir"}
      </button>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
    </>
  );
}
