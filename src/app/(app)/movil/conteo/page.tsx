import Link from "next/link";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { conteosAbiertos } from "@/lib/movil/servicio";
import { CabeceraMovil } from "../cabecera";

export default async function ConteoMovil() {
  const { db } = await requerirPermiso("conteo", "editar");
  const lista = await conteosAbiertos(db);
  return (
    <>
      <CabeceraMovil titulo="Conteo" texto="Elige un conteo abierto." />
      {lista.length === 0 ? <p className="text-sm text-gris-500">No hay conteos abiertos.</p> : null}
      <div className="flex flex-col gap-3">
        {lista.map((c) => (
          <Link key={String(c.id)} href={`/movil/conteo/${c.id}`}>
            <Tarjeta className="flex items-center justify-between gap-3 p-4 hover:bg-hover">
              <span className="flex flex-col"><span className="text-base font-bold">Conteo {String(c.id)}{Number(c.tipo) === 2 ? " · reconteo" : ""}</span><span className="text-[13px] text-gris-500">Bodega {String(c.bodega ?? "—")}</span></span>
              <span className="text-sm font-semibold tabular-nums">{String(c.contadas)} / {String(c.lineas)}</span>
            </Tarjeta>
          </Link>
        ))}
      </div>
    </>
  );
}
