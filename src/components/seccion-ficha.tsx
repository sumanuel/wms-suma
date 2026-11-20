import type { ReactNode } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Tarjeta, clasesBoton } from "@/components/ui";

export const celda = "border-b border-[#f1f1ee] px-4 py-3";
export const celdaAcciones = "sticky right-0 w-px border-b border-[#f1f1ee] bg-white py-1.5 pr-3 pl-2 whitespace-nowrap group-hover:bg-[#fafaf8]";

export function cantidad(n: number, uno: string, varios: string) {
  return n === 0 ? null : `${n} ${n === 1 ? uno : varios}`;
}

// Registros que pertenecen a otro (puntos y permisos de un cliente, sanciones de un colaborador) dentro de su ficha.
export function SeccionRegistros({
  titulo,
  resumen,
  agregar,
  extra,
  vacio,
  columnas,
  children,
}: {
  titulo: string;
  resumen: string;
  agregar?: { href: string; texto: string };
  // Otras acciones de la sección, antes de «Agregar» (por ejemplo, importar o copiar).
  extra?: ReactNode;
  vacio: string | null;
  columnas: string[];
  children: ReactNode;
}) {
  return (
    <Tarjeta>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea px-5 py-3.5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">{titulo}</h2>
          <p className="text-[13px] text-gris-500">{resumen}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {extra}
          {agregar ? (
            <Link href={agregar.href} className={clasesBoton("secundario")}>
              <Plus className="size-4" aria-hidden />
              {agregar.texto}
            </Link>
          ) : null}
        </div>
      </div>
      {vacio ? (
        <p className="px-5 py-6 text-[13.5px] text-gris-500">{vacio}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead className="bg-[#fafaf8] text-xs text-gris-500">
              <tr>
                {columnas.map((t) => (
                  <th key={t} scope="col" className="border-b border-linea px-4 py-2.5 font-medium whitespace-nowrap">
                    {t}
                  </th>
                ))}
                <th scope="col" className="sticky right-0 w-px border-b border-linea bg-[#fafaf8] py-2.5 pr-3 pl-2 text-right font-medium whitespace-nowrap">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>{children}</tbody>
          </table>
        </div>
      )}
    </Tarjeta>
  );
}
