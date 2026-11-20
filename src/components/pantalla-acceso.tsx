import type { ReactNode } from "react";
import { Marca } from "@/components/marca";

export function PantallaAcceso({ children, pie }: { children: ReactNode; pie?: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        <div className="rounded-[18px] border border-borde bg-white p-8 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_12px_32px_rgba(24,24,27,0.06)]">
          <Marca />
          {children}
        </div>
        {pie ? <p className="mt-6 text-center text-[13px] leading-relaxed text-gris-500">{pie}</p> : null}
      </div>
    </main>
  );
}
