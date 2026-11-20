import Link from "next/link";
import { Aviso, Tarjeta, claseControl, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { buscarCaja } from "@/lib/inventario/ajustes";
import { contarPendientes, pendientesAlmacenar, sugerirUbicaciones } from "@/lib/recepcion/servicio";
import { almacenarCaja } from "../../inventario/recepcion/acciones";
import { CabeceraMovil } from "../cabecera";
import { Escaner } from "../escaner";

export default async function AlmacenarMovil({ searchParams }: { searchParams: Promise<{ caja?: string }> }) {
  const { db } = await requerirPermiso("inventario", "editar");
  const q = await searchParams;
  const t = (q.caja ?? "").trim();
  const numero = /^\d+$/.test(t) ? Number(t) : null;
  const [cajas, sugerencias, pendientes, total] = await Promise.all([
    numero ? buscarCaja(db, numero) : [],
    numero ? sugerirUbicaciones(db, numero) : [],
    numero ? [] : pendientesAlmacenar(db, null, 8),
    contarPendientes(db),
  ]);
  const c = cajas[0];
  async function almacenar(_p: { error?: string; aviso?: string }, form: FormData) {
    "use server";
    return almacenarCaja(numero ?? 0, {}, form);
  }
  return (
    <>
      <CabeceraMovil titulo="Almacenar" texto={`Lee la caja del recibo: el sistema sugiere dónde guardarla. ${total} en el recibo.`} />
      <Tarjeta className="p-4">
        <form method="get" className="flex flex-col gap-3">
          <input name="caja" required autoFocus inputMode="numeric" autoComplete="off" defaultValue={t} aria-label="Caja a almacenar" placeholder="Lee la caja" className={`${claseControl} h-12 text-lg`} />
          <button type="submit" className={clasesBoton("secundario", "h-12 text-base")}>Buscar caja</button>
        </form>
      </Tarjeta>
      {t && !numero ? <Aviso tono="error">El número de caja debe ser un entero.</Aviso> : null}
      {numero && !c ? <Aviso tono="aviso">No existe la caja {numero} en el inventario.</Aviso> : null}
      {c ? (
        <>
          <Tarjeta className="flex flex-col gap-1 p-4">
            <p className="text-xl font-bold">Caja {c.caja}</p>
            <p className="font-semibold">{c.descripcion ?? c.ean}</p>
            <p className="text-sm text-gris-500">Lote {c.lote} · saldo {c.saldo} · está en {c.ubicacion || "—"}</p>
          </Tarjeta>
          {sugerencias.length > 0 ? (
            <Tarjeta className="flex flex-col gap-1 p-4">
              <p className="text-xs font-semibold uppercase text-gris-500">Sugerida</p>
              <p className="text-3xl font-extrabold tracking-tight">{sugerencias[0].ubicacion}</p>
              <p className="text-sm text-gris-500">{sugerencias[0].razon}{sugerencias.length > 1 ? ` · también: ${sugerencias.slice(1).map((s) => s.ubicacion).join(", ")}` : ""}</p>
            </Tarjeta>
          ) : <Aviso tono="aviso">No hay una ubicación sugerida: lee la ubicación donde la vas a guardar.</Aviso>}
          <Tarjeta className="p-4">
            <Escaner key={`${c.caja}-${c.ubicacion}`} accion={almacenar} boton="Almacenar" campos={[{ name: "ubicacion", etiqueta: "Lee la ubicación de destino" }]} />
          </Tarjeta>
        </>
      ) : null}
      {!numero && pendientes.length > 0 ? (
        <Tarjeta className="p-4">
          <h2 className="mb-2 text-base font-bold">En el recibo</h2>
          <ul className="flex flex-col">
            {pendientes.map((p) => (
              <li key={String(p.caja)} className="border-b border-linea py-2 last:border-0">
                <Link href={`/movil/almacenar?caja=${p.caja}`} className="flex items-center justify-between gap-3">
                  <span className="flex flex-col"><span className="font-semibold">Caja {String(p.caja)}</span><span className="text-xs text-gris-500">{String(p.articulo ?? p.ean)} · lote {String(p.lote ?? "")}</span></span>
                  <span className="font-bold tabular-nums">{new Intl.NumberFormat("es-CO").format(Number(p.saldo))}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Tarjeta>
      ) : null}
    </>
  );
}
