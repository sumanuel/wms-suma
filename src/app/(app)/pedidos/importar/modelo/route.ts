import writeXlsxFile, { type Cell } from "write-excel-file/node";
import { requerirPermiso } from "@/lib/dal";
import { COLUMNAS } from "@/lib/pedidos/importacion";

// Planilla modelo: encabezados y dos filas de ejemplo (el mismo pedido con dos líneas).
export async function GET() {
  await requerirPermiso("pedidos", "crear");
  const encabezado: Cell[] = COLUMNAS.map((c) => ({ value: c.obligatoria ? `${c.titulo}` : c.titulo, fontWeight: "bold", backgroundColor: c.obligatoria ? "#FFE3DC" : "#F1F1EF" }));
  const ejemplo = (linea: number): Cell[] => [
    { value: "PED-1001" }, { value: "900111222" }, { value: "Sede Centro" }, { value: "2026-11-20" }, { value: "2026-12-05" }, { value: "OC-778" },
    { value: linea === 1 ? "7701234567890" : "7701234567891" }, { value: "B01" }, { value: linea === 1 ? 24 : 12 }, { value: linea === 1 ? 4500 : 3200 }, { value: linea === 1 ? "Entregar en la mañana" : "" },
  ];
  const archivo = await writeXlsxFile([encabezado, ejemplo(1), ejemplo(2)], {
    sheet: "Pedidos",
    columns: COLUMNAS.map((c) => ({ width: c.campo === "observaciones" ? 32 : c.campo === "sede" || c.campo === "ean" ? 20 : 16 })),
    stickyRowsCount: 1,
  }).toBuffer();
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="planilla-de-pedidos.xlsx"',
    },
  });
}
