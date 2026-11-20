import type { ReactNode } from "react";
import { requerirPermiso } from "@/lib/dal";
import { contarTareas } from "@/lib/resurtido/servicio";
import { SubMenuResurtido } from "./submenu";

export default async function LayoutResurtido({ children }: { children: ReactNode }) {
  const ctx = await requerirPermiso("inventario", "editar");
  const pendientes = await contarTareas(ctx.db);
  return (
    <div className="flex flex-col gap-5">
      <SubMenuResurtido pendientes={pendientes} />
      {children}
    </div>
  );
}
