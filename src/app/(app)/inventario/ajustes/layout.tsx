import type { ReactNode } from "react";
import { requerirPermiso } from "@/lib/dal";
import { contarPendientes } from "@/lib/inventario/aprobacion";
import { SubMenuAjustes } from "./submenu";

export default async function LayoutAjustes({ children }: { children: ReactNode }) {
  const ctx = await requerirPermiso("inventario", "editar");
  const pendientes = await contarPendientes(ctx.db);
  return (
    <div className="flex flex-col gap-5">
      <SubMenuAjustes pendientes={pendientes} />
      {children}
    </div>
  );
}
