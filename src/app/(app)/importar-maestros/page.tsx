import Link from "next/link";
import { Upload } from "lucide-react";
import { EncabezadoPagina, Tarjeta } from "@/components/ui";
import { requerirSesion, tienePermiso } from "@/lib/dal";
import { IMPORTABLES } from "@/lib/maestros/importable";
import { itemsMenu } from "@/lib/menu";

export default async function ImportarMaestros() {
  const ctx = await requerirSesion();
  const visibles = IMPORTABLES.filter((m) => tienePermiso(ctx, m.modulo, "crear"));
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Importar datos" descripcion="Carga maestros desde una planilla de Excel o un CSV, con revisión previa." />
      {visibles.length === 0 ? (
        <Tarjeta className="px-6 py-12 text-center text-gris-500">Tu perfil no puede crear datos maestros.</Tarjeta>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibles.map((m) => (
            <Link key={m.id} href={`/importar-maestros/${m.id}`} className="flex gap-4 rounded-[14px] border border-borde bg-white p-4 transition hover:border-borde-campo hover:shadow-[0_6px_20px_rgba(24,24,27,0.06)]">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-marca-suave"><Upload className="size-5 text-marca" strokeWidth={1.8} aria-hidden /></span>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold">{m.plural.charAt(0).toUpperCase() + m.plural.slice(1)}</span>
                <span className="text-[13px] text-gris-500">{itemsMenu.find((i) => i.modulo === m.modulo)?.etiqueta ?? m.modulo}</span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
