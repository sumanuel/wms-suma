import type { ReactNode } from "react";
import { Pestanas } from "@/components/pestanas";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";

export default async function LayoutArticulos({ children }: { children: ReactNode }) {
  await requerirPermiso("articulos", "ver");
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Artículos" descripcion="Artículos, sus unidades, códigos de barras y datos logísticos." />
      <Pestanas
        pestanas={[
          { href: "/articulos", etiqueta: "Artículos" },
          { href: "/articulos/referencias", etiqueta: "Referencias" },
        ]}
      />
      {children}
    </div>
  );
}
