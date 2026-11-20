import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function CabeceraMovil({ titulo, texto, volver = "/movil" }: { titulo: string; texto?: ReactNode; volver?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Link href={volver} className="inline-flex h-10 w-fit items-center gap-1.5 text-sm font-medium text-gris-700"><ArrowLeft className="size-4" aria-hidden />Volver</Link>
      <h1 className="text-2xl font-semibold tracking-[-0.02em]">{titulo}</h1>
      {texto ? <p className="text-sm text-gris-500">{texto}</p> : null}
    </div>
  );
}
