"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { estaActivo } from "@/lib/menu";

// Gana la pestaña de ruta más larga que coincida: en /clientes/puntos/… se marca «Puntos», no «Clientes».
export function Pestanas({ pestanas }: { pestanas: { href: string; etiqueta: string }[] }) {
  const ruta = usePathname();
  const activa = pestanas
    .filter((p) => estaActivo(p.href, ruta))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Secciones" className="flex flex-wrap gap-x-6 border-b border-borde">
      {pestanas.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          aria-current={p.href === activa ? "page" : undefined}
          className={`-mb-px flex h-11 items-center border-b-2 px-0.5 text-sm ${p.href === activa ? "border-marca font-semibold text-tinta" : "border-transparent font-medium text-gris-500 hover:text-tinta"}`}
        >
          {p.etiqueta}
        </Link>
      ))}
    </nav>
  );
}
