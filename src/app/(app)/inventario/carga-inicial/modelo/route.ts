import writeXlsxFile, { type Cell } from "write-excel-file/node";
import { requerirPermiso } from "@/lib/dal";
import { COLUMNAS } from "@/lib/inventario/carga";

export async function GET() {
  await requerirPermiso("inventario", "crear");
  const encabezado: Cell[] = COLUMNAS.map((c) => ({ value: c.obligatoria ? `${c.titulo} *` : c.titulo, fontWeight: "bold", backgroundColor: c.obligatoria ? "#FFE3DC" : "#F1F1EF" }));
  const ejemplo: Cell[] = [
    { value: "7701234567890" }, { value: "B01" }, { value: "A-01-01" }, { value: "L2026-001" }, { value: 100 }, { value: 4 }, { value: "2027-06-30" }, { value: "2026-11-01" }, { value: "900111222" }, { value: "Aprobado" }, { value: "" },
  ];
  const archivo = await writeXlsxFile([encabezado, ejemplo], { sheet: "Inventario inicial", columns: COLUMNAS.map(() => ({ width: 18 })), stickyRowsCount: 1 }).toBuffer();
  return new Response(new Uint8Array(archivo), {
    headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="planilla-inventario-inicial.xlsx"' },
  });
}
