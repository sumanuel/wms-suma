import type { ReactNode } from "react";
import { requerirPermiso } from "@/lib/dal";

export default async function LayoutMovil({ children }: { children: ReactNode }) {
  await requerirPermiso("movil", "ver");
  return <div className="mx-auto flex w-full max-w-xl flex-col gap-4">{children}</div>;
}
