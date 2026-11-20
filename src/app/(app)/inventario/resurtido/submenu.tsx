"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubMenuResurtido({ pendientes }: { pendientes: number }) {
  const ruta = usePathname();
  const opciones = [{ href: "/inventario/resurtido", etiqueta: "Tareas", activa: ruta === "/inventario/resurtido" }, { href: "/inventario/resurtido/reglas", etiqueta: "Reglas", activa: ruta.startsWith("/inventario/resurtido/reglas") }];
  return (
    <nav aria-label="Resurtido" className="flex flex-wrap gap-2">
      {opciones.map((o) => (
        <Link key={o.href} href={o.href} aria-current={o.activa ? "page" : undefined} className={`inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-sm font-medium ${o.activa ? "bg-tinta text-white" : "bg-neutro-suave text-gris-700 hover:bg-hover"}`}>
          {o.etiqueta}
          {o.etiqueta === "Tareas" && pendientes > 0 ? <span className="rounded-full bg-marca px-1.5 text-xs font-semibold text-white">{pendientes}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
