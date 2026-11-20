import writeXlsxFile, { type Cell } from "write-excel-file/node";
import { requerirPermiso } from "@/lib/dal";
import { COLUMNAS } from "@/lib/compras/ordenes";

export async function GET() {
  await requerirPermiso("inventario", "crear");
  const encabezado: Cell[] = COLUMNAS.map((c) => ({ value: c.obligatoria ? `${c.titulo} *` : c.titulo, fontWeight: "bold", backgroundColor: c.obligatoria ? "#FFE3DC" : "#F1F1EF" }));
  const f = (v: (string | number)[]): Cell[] => v.map((x) => ({ value: x }) as Cell);
  const archivo = await writeXlsxFile([encabezado, f(["PO-100", "900111222", "B01", "2026-12-15", "7701234567890", 500, 1200, "Entrega en muelle 2"]), f(["PO-100", "900111222", "B01", "2026-12-15", "7701234567891", 300, 800, ""])], { sheet: "Órdenes de compra", columns: COLUMNAS.map(() => ({ width: 20 })), stickyRowsCount: 1 }).toBuffer();
  return new Response(new Uint8Array(archivo), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="planilla-ordenes-compra.xlsx"' } });
}
