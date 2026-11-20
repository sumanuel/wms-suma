"use client";

import { Printer } from "lucide-react";
import { clasesBoton } from "@/components/ui";

export function BotonImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className={clasesBoton("secundario")}>
      <Printer className="size-4" aria-hidden />
      Imprimir
    </button>
  );
}
