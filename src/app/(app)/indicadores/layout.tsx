import type { ReactNode } from "react";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";

export default async function LayoutIndicadores({ children }: { children: ReactNode }) {
  await requerirPermiso("indicadores", "ver");
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Indicadores y reportes" descripcion="Productividad, cumplimiento de despachos e inventario, con exportación a Excel." />
      {children}
    </div>
  );
}
