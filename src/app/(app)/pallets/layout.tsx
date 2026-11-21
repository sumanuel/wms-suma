import type { ReactNode } from "react";
import { Pestanas } from "@/components/pestanas";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";

export default async function LayoutPallets({ children }: { children: ReactNode }) {
  await requerirPermiso("pallets", "ver");
  return (
    <div className="flex flex-col gap-6 print:gap-0">
      <div className="flex flex-col gap-6 print:hidden">
        <EncabezadoPagina titulo="Pallets y SSCC" descripcion="Pallets de cajas de inventario, y etiquetas de pallets, de cajas y de cajas de despacho con su SSCC." />
        <Pestanas pestanas={[{ href: "/pallets", etiqueta: "Pallets" }, { href: "/pallets/despacho", etiqueta: "Pallets de despacho" }, { href: "/pallets/etiquetas", etiqueta: "Etiquetas" }]} />
      </div>
      {children}
    </div>
  );
}
