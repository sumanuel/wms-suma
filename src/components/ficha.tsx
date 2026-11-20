import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Aviso } from "@/components/ui";

// Ficha dentro de un módulo con pestañas: el título del módulo ya es el h1 del layout, la ficha usa h2.
export function EncabezadoFicha({
  volver,
  textoVolver,
  titulo,
  descripcion,
  aviso,
}: {
  volver: string;
  textoVolver: string;
  titulo: ReactNode;
  descripcion?: ReactNode;
  aviso?: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Link href={volver} className="inline-flex w-fit items-center gap-1 text-[13px] font-medium text-gris-600 hover:text-tinta">
        <ChevronLeft className="size-4" aria-hidden />
        {textoVolver}
      </Link>
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold leading-tight tracking-[-0.01em]">{titulo}</h2>
        {descripcion ? <p className="text-sm text-gris-500">{descripcion}</p> : null}
      </div>
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}
    </div>
  );
}

export function textoAviso(aviso: unknown, elemento: { singular: string }, el = "el") {
  const textos: Record<string, string> = {
    creado: `Se creó ${el} ${elemento.singular}.`,
    editado: "Se guardaron los cambios.",
    eliminado: `Se eliminó ${el} ${elemento.singular}.`,
  };
  return typeof aviso === "string" ? (textos[aviso] ?? null) : null;
}
