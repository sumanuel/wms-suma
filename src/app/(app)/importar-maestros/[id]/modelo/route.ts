import { notFound } from "next/navigation";
import writeXlsxFile, { type Cell } from "write-excel-file/node";
import { requerirPermiso } from "@/lib/dal";
import { buscarImportable } from "@/lib/maestros/importable";
import { encabezadosModelo } from "@/lib/maestros/importacion";
import { camposDe } from "@/lib/maestros/nucleo";

// Planilla modelo del maestro: una fila de encabezados (con * en los obligatorios).
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const m = buscarImportable((await params).id);
  if (!m) notFound();
  const { db } = await requerirPermiso(m.modulo, "crear");
  const campos = await camposDe(m, db);
  const titulos = encabezadosModelo(campos, m);
  const encabezado: Cell[] = titulos.map((t) => ({ value: t, fontWeight: "bold", backgroundColor: t.endsWith("*") ? "#FFE3DC" : "#F1F1EF" }));
  const archivo = await writeXlsxFile([encabezado], {
    sheet: m.plural.slice(0, 30),
    columns: titulos.map((t) => ({ width: Math.max(14, Math.min(40, t.length + 4)) })),
    stickyRowsCount: 1,
  }).toBuffer();
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="planilla-${m.id}.xlsx"`,
    },
  });
}
