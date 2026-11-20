// Filtros de los indicadores: un rango de fechas (días completos) y, opcionalmente, una bodega. Sin dependencias del servidor:
// lo usan las páginas, las consultas y la exportación.

export type Rango = { desde: string; hasta: string; bodega: string | null };

const hoyEn = (zona: string) => new Intl.DateTimeFormat("en-CA", { timeZone: zona }).format(new Date());
export const hoy = () => hoyEn("America/Bogota");

export function sumarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const esFecha = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00.000Z`).getTime()) && new Date(`${s}T00:00:00.000Z`).toISOString().slice(0, 10) === s;

/** Lee ?desde=&hasta=&bodega= con valores por omisión (últimos 30 días) y los corrige si vienen mal (por ejemplo, desde > hasta). */
export function leerRango(q: Record<string, string | string[] | undefined>): Rango {
  const uno = (k: string) => (Array.isArray(q[k]) ? q[k]?.[0] : (q[k] as string | undefined))?.trim();
  const h = uno("hasta");
  const d = uno("desde");
  const hasta = esFecha(h) ? h : hoy();
  let desde = esFecha(d) ? d : sumarDias(hasta, -29);
  if (desde > hasta) desde = hasta;
  // Rangos absurdos se acotan a cinco años.
  if (desde < sumarDias(hasta, -1826)) desde = sumarDias(hasta, -1826);
  const b = uno("bodega");
  return { desde, hasta, bodega: b && b.length <= 15 ? b : null };
}

export function consultaDe(r: Rango) {
  const p = new URLSearchParams({ desde: r.desde, hasta: r.hasta });
  if (r.bodega) p.set("bodega", r.bodega);
  return p.toString();
}
