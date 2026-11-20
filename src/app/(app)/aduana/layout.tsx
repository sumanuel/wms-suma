import type { ReactNode } from "react";
import { Pestanas } from "@/components/pestanas";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";

export default async function LayoutAduana({ children }: { children: ReactNode }) {
  await requerirPermiso("aduana", "ver");
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Aduana" descripcion="Verificación y empaque de lo pickeado, en cajas con su tipo y su peso." />
      <Pestanas
        pestanas={[
          { href: "/aduana", etiqueta: "Por aduanar" },
          { href: "/aduana/pickeados", etiqueta: "Aduanados" },
        ]}
      />
      {children}
    </div>
  );
}
