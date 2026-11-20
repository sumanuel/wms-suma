import type { ReactNode } from "react";
import { Pestanas } from "@/components/pestanas";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";

export default async function LayoutDespacho({ children }: { children: ReactNode }) {
  await requerirPermiso("despacho", "ver");
  return (
    <div className="flex flex-col gap-6 print:gap-3">
      <div className="print:hidden">
        <EncabezadoPagina titulo="Despacho y guías" descripcion="Despachos, guías de transporte y entregas." />
      </div>
      <div className="print:hidden">
        <Pestanas
          pestanas={[
            { href: "/despacho", etiqueta: "Por despachar" },
            { href: "/despacho/guias", etiqueta: "Guías" },
          ]}
        />
      </div>
      {children}
    </div>
  );
}
