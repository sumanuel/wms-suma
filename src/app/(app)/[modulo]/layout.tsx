import type { ReactNode } from "react";
import { Pestanas } from "@/components/pestanas";
import { EncabezadoPagina } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { itemsMenu } from "@/lib/menu";
import { buscarModulo } from "@/lib/maestros/registro";

// Encabezado y pestañas de los módulos armados con el motor de maestros. Los demás muestran solo su marcador.
export default async function LayoutModulo({ children, params }: { children: ReactNode; params: Promise<{ modulo: string }> }) {
  const { modulo } = await params;
  const mod = buscarModulo(modulo);
  const item = itemsMenu.find((i) => i.modulo === modulo);
  if (!mod || !item?.modulo) return children;
  await requerirPermiso(mod.modulo, "ver");
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo={item.etiqueta} descripcion={item.descripcion} />
      {mod.secciones.length > 1 ? (
        <Pestanas pestanas={mod.secciones.map((s) => ({ href: s.slug ? `/${modulo}/${s.slug}` : `/${modulo}`, etiqueta: s.titulo }))} />
      ) : null}
      {children}
    </div>
  );
}
