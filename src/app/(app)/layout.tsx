import type { ReactNode } from "react";
import { BarraSuperior } from "@/components/menu/barra-superior";
import { MenuLateral } from "@/components/menu/menu-lateral";

export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <MenuLateral />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior />
        <main className="w-full px-4 py-6 sm:px-8 sm:py-7">{children}</main>
      </div>
    </div>
  );
}
