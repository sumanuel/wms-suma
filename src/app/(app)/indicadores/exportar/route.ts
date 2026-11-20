import writeXlsxFile, { type Cell, type Sheet } from "write-excel-file/node";
import { requerirPermiso } from "@/lib/dal";
import { aNumero } from "@/lib/indicadores/formato";
import { leerRango } from "@/lib/indicadores/rango";
import { buscarReporte, REPORTES, type Columna, type Reporte } from "@/lib/indicadores/reportes";

function celda(v: unknown, c: Columna): Cell {
  if (v === null || v === undefined || v === "") return { value: "" } as Cell;
  switch (c.tipo) {
    case "numero": { const n = aNumero(v); return (n === null ? { value: "" } : { value: n, format: "#,##0.##" }) as Cell; }
    case "porcentaje": { const n = aNumero(v); return (n === null ? { value: "" } : { value: n / 100, format: "0.0%" }) as Cell; }
    case "fecha": return (v instanceof Date ? { value: v, format: "yyyy-mm-dd" } : { value: String(v) }) as Cell;
    case "fechaHora": return (v instanceof Date ? { value: v, format: "yyyy-mm-dd hh:mm" } : { value: String(v) }) as Cell;
    case "hora": { const n = aNumero(v); return { value: n === null ? String(v) : `${String(n).padStart(2, "0")}:00` } as Cell; }
    default: return { value: String(v) } as Cell;
  }
}

const nombreHoja = (t: string) => t.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);

export async function GET(req: Request) {
  const ctx = await requerirPermiso("indicadores", "exportar");
  const url = new URL(req.url);
  const rango = leerRango(Object.fromEntries(url.searchParams));
  const id = url.searchParams.get("reporte") ?? "";
  const lista: Reporte[] = id === "todos" ? REPORTES : (() => { const r = buscarReporte(id); return r ? [r] : []; })();
  if (lista.length === 0) return new Response("Reporte no encontrado.", { status: 404 });

  const hojas: Sheet<Buffer>[] = [];
  for (const r of lista) {
    const filas = await r.cargar(ctx.db, rango);
    const encabezado: Cell[] = r.columnas.map((c) => ({ value: c.titulo, fontWeight: "bold", backgroundColor: "#F1F1EF" }) as Cell);
    const datos: Cell[][] = filas.map((f) => r.columnas.map((c) => celda(f[c.id], c)));
    hojas.push({ data: [encabezado, ...datos], sheet: nombreHoja(r.titulo.replace(/ \(foto de hoy\)/, "")), columns: r.columnas.map((c) => ({ width: c.tipo === "texto" ? 30 : 18 })), stickyRowsCount: 1 } as Sheet<Buffer>);
  }
  const archivo = await (hojas.length === 1 ? writeXlsxFile(hojas[0].data, hojas[0]) : writeXlsxFile(hojas)).toBuffer();
  const nombre = `${id === "todos" ? "indicadores" : id}-${rango.desde}_${rango.hasta}.xlsx`;
  return new Response(new Uint8Array(archivo), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${nombre}"` },
  });
}
