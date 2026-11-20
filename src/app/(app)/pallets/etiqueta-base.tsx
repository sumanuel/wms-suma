import type { ReactNode } from "react";
import { codigoBarras } from "@/lib/etiquetas/codigos";

// Etiqueta de 100 × 150 mm. En pantalla se ven una bajo otra; al imprimir sale una por hoja.
export function Etiqueta100x150({ children }: { children: ReactNode }) {
  return (
    <article data-etiqueta className="relative flex h-[150mm] w-[100mm] shrink-0 flex-col gap-2 overflow-hidden border border-tinta bg-white p-[5mm] text-tinta print:break-after-page print:border-0">
      {children}
    </article>
  );
}

export function Barras({ texto, alto = 14, className = "" }: { texto: string; alto?: number; className?: string }) {
  return <div role="img" aria-label={`Código de barras ${texto}`} className={`w-full [&>svg]:h-full [&>svg]:w-full ${className}`} dangerouslySetInnerHTML={{ __html: codigoBarras(texto, alto) }} />;
}

export function BarraImpresion({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 print:hidden">{children}</div>;
}
