import writeXlsxFile, { type Cell } from "write-excel-file/node";
import { requerirPermiso } from "@/lib/dal";
import { COLUMNAS_BLOQUE } from "@/lib/inventario/aprobacion";

export async function GET() {
  await requerirPermiso("inventario", "editar");
  const encabezado: Cell[] = COLUMNAS_BLOQUE.map((c) => ({ value: c.obligatoria ? `${c.titulo} *` : c.titulo, fontWeight: "bold", backgroundColor: c.obligatoria ? "#FFE3DC" : "#F1F1EF" }));
  const ejemplo: Cell[] = [{ value: 900001 }, { value: 95 }, { value: "Faltante de inventario" }, { value: "Conteo físico del pasillo 1" }, { value: "ACTA-7" }];
  const archivo = await writeXlsxFile([encabezado, ejemplo], { sheet: "Ajustes", columns: COLUMNAS_BLOQUE.map(() => ({ width: 24 })), stickyRowsCount: 1 }).toBuffer();
  return new Response(new Uint8Array(archivo), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": 'attachment; filename="planilla-ajustes.xlsx"' } });
}
