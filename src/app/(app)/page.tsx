import Link from "next/link";
import { iconos } from "@/components/menu/iconos";
import { EncabezadoPagina, Tarjeta } from "@/components/ui";
import { requerirSesion, tienePermiso } from "@/lib/dal";
import { menuPara } from "@/lib/menu";

export default async function Inicio() {
  const ctx = await requerirSesion();
  const areas = menuPara((modulo) => tienePermiso(ctx, modulo, "ver"));

  return (
    <div className="flex flex-col gap-8">
      <EncabezadoPagina
        titulo={`Hola, ${ctx.usuario.nombre.split(" ")[0]}`}
        descripcion="Estos son los módulos a los que tienes acceso."
      />
      {areas.length === 0 ? (
        <Tarjeta className="px-6 py-12 text-center text-gris-500">
          Tu usuario todavía no tiene módulos asignados. Pide al administrador del sistema que te asigne un perfil.
        </Tarjeta>
      ) : null}
      {areas.map((area) => (
        <section key={area.id} className="flex flex-col gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-gris-500">{area.etiqueta}</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {area.items.map((item) => {
              const Icono = iconos[item.icono];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex gap-4 rounded-[14px] border border-borde bg-white p-4 transition hover:border-borde-campo hover:shadow-[0_6px_20px_rgba(24,24,27,0.06)]"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-marca-suave">
                    <Icono className="size-5 text-marca" strokeWidth={1.8} aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="font-semibold">{item.etiqueta}</span>
                    <span className="text-[13px] leading-snug text-gris-500">{item.descripcion}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
