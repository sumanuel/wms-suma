import { Aviso, Etiqueta, Tarjeta, claseControl, clasesBoton } from "@/components/ui";
import { requerirPermiso } from "@/lib/dal";
import { formatearFecha } from "@/lib/indicadores/formato";
import { consultar, TIPOS, type Fila, type TipoBusqueda } from "@/lib/movil/servicio";
import { CabeceraMovil } from "../cabecera";

const n = (v: unknown) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(Number(v ?? 0));
const fila = (a: string, b: string) => <div className="flex justify-between gap-3 border-b border-linea py-1.5 text-sm last:border-0"><dt className="text-gris-500">{a}</dt><dd className="text-right font-medium">{b || "—"}</dd></div>;

export default async function Consulta({ searchParams }: { searchParams: Promise<{ q?: string; tipo?: string }> }) {
  const { db } = await requerirPermiso("inventario", "ver");
  const p = await searchParams;
  const tipo = (p.tipo && p.tipo in TIPOS ? p.tipo : "auto") as TipoBusqueda;
  const r = p.q?.trim() ? await consultar(db, p.q, tipo) : null;
  return (
    <>
      <CabeceraMovil titulo="Consultas rápidas" texto="Lee una caja, una ubicación, un artículo o un pallet." />
      <Tarjeta className="p-4">
        <form method="get" className="flex flex-col gap-3">
          <input name="q" required autoFocus autoComplete="off" autoCapitalize="characters" defaultValue={p.q ?? ""} aria-label="Código a consultar" placeholder="Lee o escribe el código" className={`${claseControl} h-12 text-lg`} />
          <select name="tipo" defaultValue={tipo} aria-label="Qué se consulta" className={`${claseControl} h-12 pr-9 text-base`}>
            {Object.entries(TIPOS).map(([k, t]) => <option key={k} value={k}>{t}</option>)}
          </select>
          <button type="submit" className={clasesBoton("primario", "h-12 text-base")}>Consultar</button>
        </form>
      </Tarjeta>
      {r?.tipo === "nada" ? <Aviso tono="aviso">No se encontró «{p.q}». Prueba eligiendo el tipo de código.</Aviso> : null}
      {r?.tipo === "caja" ? (
        <Tarjeta className="p-4">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">Caja {String(r.caja.caja)} {r.caja.calidad ? <Etiqueta tono={String(r.caja.calidad) === "Aprobado" ? "exito" : "aviso"}>{String(r.caja.calidad)}</Etiqueta> : null}</h2>
          <dl>
            {fila("Artículo", String(r.caja.descripcion ?? r.caja.ean))}
            {fila("Código", String(r.caja.ean))}
            {fila("Lote", String(r.caja.lote ?? ""))}
            {fila("Vence", r.caja.vence instanceof Date ? formatearFecha(r.caja.vence) : "")}
            {fila("Saldo", `${n(r.caja.saldo)} ${String(r.caja.unidad ?? "")}`)}
            {fila("Reservado", n(r.caja.reservado))}
            {fila("Ubicación", String(r.caja.ubicacion ?? ""))}
            {fila("Bodega", String(r.caja.bodega ?? ""))}
            {fila("Pallet", r.pallet ? String(r.pallet) : "No está en un pallet")}
          </dl>
        </Tarjeta>
      ) : null}
      {r?.tipo === "ubicacion" ? (
        <Tarjeta className="p-4">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-bold">{r.ubicacion} {r.bloqueada ? <Etiqueta tono="error">Bloqueada</Etiqueta> : null}</h2>
          <p className="mb-2 text-sm text-gris-500">Bodega {r.bodega ?? "—"} · {r.cajas.length} {r.cajas.length === 1 ? "caja" : "cajas"} con saldo</p>
          <Lista filas={r.cajas.map((c) => ({ a: `Caja ${c.caja}`, b: `${n(c.saldo)}`, c: `${c.descripcion ?? c.ean} · lote ${c.lote ?? "—"}` }))} />
        </Tarjeta>
      ) : null}
      {r?.tipo === "articulo" ? (
        <Tarjeta className="p-4">
          <h2 className="text-lg font-bold">{r.descripcion ?? r.ean}</h2>
          <p className="mb-2 text-sm text-gris-500">{r.ean} · total {n(r.total)}</p>
          <Lista filas={r.filas.map((c) => ({ a: String(c.ubicacion || "Sin ubicación"), b: n(c.saldo), c: `lote ${c.lote ?? "—"}${c.vence instanceof Date ? ` · vence ${formatearFecha(c.vence)}` : ""} · ${c.cajas} cajas${c.calidad ? ` · ${c.calidad}` : ""}` }))} />
        </Tarjeta>
      ) : null}
      {r?.tipo === "pallet" ? (
        <Tarjeta className="p-4">
          <h2 className="text-lg font-bold">Pallet {r.pallet}</h2>
          <p className="mb-2 text-sm text-gris-500">{r.cajas.length} cajas · {n(r.unidades)} unidades</p>
          <Lista filas={r.cajas.map((c: Fila) => ({ a: `Caja ${c.caja}`, b: n(c.saldo), c: `${c.descripcion ?? c.ean ?? ""} · ${c.ubicacion ?? "sin ubicación"}` }))} />
        </Tarjeta>
      ) : null}
    </>
  );
}

function Lista({ filas }: { filas: { a: string; b: string; c: string }[] }) {
  if (filas.length === 0) return <p className="text-sm text-gris-500">Sin existencias.</p>;
  return (
    <ul className="flex flex-col">
      {filas.map((f, i) => (
        <li key={i} className="flex items-start justify-between gap-3 border-b border-linea py-2 last:border-0">
          <span className="flex flex-col"><span className="font-semibold">{f.a}</span><span className="text-xs text-gris-500">{f.c}</span></span>
          <span className="font-bold tabular-nums">{f.b}</span>
        </li>
      ))}
    </ul>
  );
}
