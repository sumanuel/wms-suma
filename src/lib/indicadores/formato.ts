import type { Columna } from "./reportes";

// Valores que llegan de la base: Date, Decimal (con toNumber/toString), número o texto. Aquí se vuelven número o texto.
export function aNumero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v));
  return Number.isFinite(n) ? n : null;
}

const numero = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 });
const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });
const fechaHora = new Intl.DateTimeFormat("es-CO", { dateStyle: "short", timeStyle: "short", timeZone: "America/Bogota" });

export function formatear(v: unknown, tipo: Columna["tipo"]): string {
  if (v === null || v === undefined || v === "") return "—";
  switch (tipo) {
    case "numero": { const n = aNumero(v); return n === null ? "—" : numero.format(n); }
    case "porcentaje": { const n = aNumero(v); return n === null ? "—" : `${numero.format(n)} %`; }
    case "fecha": return v instanceof Date ? fecha.format(v) : String(v);
    case "fechaHora": return v instanceof Date ? fechaHora.format(v) : String(v);
    case "hora": { const n = aNumero(v); return n === null ? String(v) : `${String(n).padStart(2, "0")}:00`; }
    default: return String(v);
  }
}

export const formatearFecha = (d: Date) => fecha.format(d);
