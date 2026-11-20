import type { ReactNode } from "react";
import { Pestanas } from "@/components/pestanas";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";

export default async function LayoutPrepacking({ children }: { children: ReactNode }) {
  await requerirPermiso("prepacking", "ver");
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Prepacking" descripcion="Ejecución del picking: confirmar cada caja pickeada y dejar el pedido listo para la aduana." />
      <Pestanas
        pestanas={[
          { href: "/prepacking", etiqueta: "Por pickear" },
          { href: "/prepacking/pickeados", etiqueta: "Pickeados" },
        ]}
      />
      {children}
    </div>
  );
}
