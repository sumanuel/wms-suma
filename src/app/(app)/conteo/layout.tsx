import type { ReactNode } from "react";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";

export default async function LayoutConteo({ children }: { children: ReactNode }) {
  await requerirPermiso("conteo", "ver");
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Conteo de inventario" descripcion="Conteos de cajas por bodega, artículo o ubicación, con sus diferencias y ajustes." />
      {children}
    </div>
  );
}
