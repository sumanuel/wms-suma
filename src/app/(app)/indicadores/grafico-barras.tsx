import { aNumero } from "@/lib/indicadores/formato";

// Barras horizontales hechas con CSS: sin librería, se imprimen bien y se leen con lector de pantalla (cada barra es texto).
export function GraficoBarras({ filas, etiqueta, valor, unidad }: { filas: { etiqueta: string; valor: number }[]; etiqueta?: string; valor?: string; unidad?: string }) {
  void etiqueta; void valor;
  const max = Math.max(...filas.map((f) => f.valor), 0);
  if (filas.length === 0 || max <= 0) return null;
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Gráfico">
      {filas.map((f, i) => (
        <li key={`${f.etiqueta}-${i}`} className="grid grid-cols-[minmax(80px,180px)_1fr_auto] items-center gap-3 text-[13px]">
          <span className="truncate text-gris-700" title={f.etiqueta}>{f.etiqueta}</span>
          <span className="h-3 rounded-full bg-neutro-suave" aria-hidden="true">
            <span className="block h-3 rounded-full bg-marca" style={{ width: `${Math.max((f.valor / max) * 100, 1.5)}%` }} />
          </span>
          <span className="tabular-nums text-tinta">{new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(f.valor)}{unidad ? ` ${unidad}` : ""}</span>
        </li>
      ))}
    </ul>
  );
}

export const aSerie = (filas: Record<string, unknown>[], categoria: (f: Record<string, unknown>) => string, valor: string) =>
  filas.slice(0, 40).map((f) => ({ etiqueta: categoria(f), valor: aNumero(f[valor]) ?? 0 }));
