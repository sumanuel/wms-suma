"use client";

import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ubicacion } from "@/lib/menu";

export function Ubicacion() {
  const lugar = ubicacion(usePathname());
  return (
    <nav aria-label="Ubicación" className="flex items-center gap-2 text-sm text-gris-500">
      {lugar?.area ? (
        <>
          <span>{lugar.area}</span>
          <ChevronRight className="size-3.5 text-[#a1a1a8]" aria-hidden />
        </>
      ) : null}
      <span aria-current="page" className="font-semibold text-tinta">
        {lugar?.item.etiqueta ?? "WMS"}
      </span>
    </nav>
  );
}
