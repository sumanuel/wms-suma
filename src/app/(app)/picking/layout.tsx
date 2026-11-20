import type { ReactNode } from "react";
import { Pestanas } from "@/components/pestanas";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";

export default async function LayoutPicking({ children }: { children: ReactNode }) {
  await requerirPermiso("picking", "ver");
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Picking" descripcion="Planeación de olas y picking por zona, pedido o lote." />
      <Pestanas
        pestanas={[
          { href: "/picking", etiqueta: "Pickings" },
          { href: "/picking/pendientes", etiqueta: "Pedidos listos para picking" },
        ]}
      />
      {children}
    </div>
  );
}
