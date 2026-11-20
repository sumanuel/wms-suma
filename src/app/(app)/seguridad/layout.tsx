import type { ReactNode } from "react";
import { Pestanas } from "@/components/pestanas";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";

export default async function LayoutSeguridad({ children }: { children: ReactNode }) {
  await requerirPermiso("seguridad", "ver");
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Usuarios y perfiles" descripcion="Quién entra al sistema y qué puede hacer en cada módulo." />
      <Pestanas
        pestanas={[
          { href: "/seguridad", etiqueta: "Usuarios" },
          { href: "/seguridad/perfiles", etiqueta: "Perfiles" },
        ]}
      />
      {children}
    </div>
  );
}
