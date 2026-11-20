import type { ReactNode } from "react";
import { Pestanas } from "@/components/pestanas";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";

export default async function LayoutInventario({ children }: { children: ReactNode }) {
  const ctx = await requerirPermiso("inventario", "ver");
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Inventario y lotes" descripcion="Existencias por artículo, cajas con su ubicación y lotes con su estado de calidad." />
      <Pestanas
        pestanas={[
          { href: "/inventario", etiqueta: "Existencias" },
          { href: "/inventario/cajas", etiqueta: "Cajas" },
          { href: "/inventario/lotes", etiqueta: "Lotes" },
          ...(tienePermiso(ctx, "inventario", "editar") ? [{ href: "/inventario/ajustes", etiqueta: "Ajustes" }] : []),
          ...(tienePermiso(ctx, "inventario", "crear") ? [{ href: "/inventario/carga-inicial", etiqueta: "Carga inicial" }] : []),
        ]}
      />
      {children}
    </div>
  );
}
