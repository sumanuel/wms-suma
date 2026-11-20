"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const OPCIONES = [
  { href: "/inventario/ajustes", etiqueta: "Ajustes", exacta: true },
  { href: "/inventario/ajustes/por-aprobar", etiqueta: "Por aprobar" },
  { href: "/inventario/ajustes/en-bloque", etiqueta: "En bloque" },
];

export function SubMenuAjustes({ pendientes }: { pendientes: number }) {
  const ruta = usePathname();
  return (
    <nav aria-label="Ajustes" className="flex flex-wrap gap-2">
      {OPCIONES.map((o) => {
        const activa = o.exacta ? ruta === o.href || /^\/inventario\/ajustes\/(\d+|nuevo)/.test(ruta) : ruta.startsWith(o.href);
        return (
          <Link key={o.href} href={o.href} aria-current={activa ? "page" : undefined} className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium ${activa ? "bg-tinta text-white" : "bg-neutro-suave text-gris-700 hover:bg-hover"}`}>
            {o.etiqueta}
            {o.href.endsWith("por-aprobar") && pendientes > 0 ? <span className="rounded-full bg-marca px-1.5 text-xs font-semibold text-white">{pendientes}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
