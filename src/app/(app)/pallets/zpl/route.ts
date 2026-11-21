import { requerirPermiso } from "@/lib/dal";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { armarZpl, type Referencia, type TipoEtiqueta } from "@/lib/etiquetas/impresion";

const TIPOS: TipoEtiqueta[] = ["cajas-despacho", "cajas", "pallet", "pallet-despacho"];

// Descarga el ZPL de unas etiquetas, para imprimirlas con otra herramienta (Zebra Setup Utilities, impresora por USB, etc.).
export async function GET(req: Request) {
  const { db } = await requerirPermiso("pallets", "ver");
  const q = new URL(req.url).searchParams;
  const tipo = q.get("tipo") ?? "";
  if (!TIPOS.includes(tipo as TipoEtiqueta)) return new Response("Tipo de etiqueta no válido.", { status: 400 });
  const ref: Referencia = {};
  for (const k of ["picking", "caja", "desde", "hasta", "numero", "id"] as const) {
    const t = q.get(k);
    if (t === null) continue;
    if (!/^\d{1,12}$/.test(t) || Number(t) <= 0) return new Response("La referencia no es válida.", { status: 400 });
    ref[k] = Number(t);
  }
  const dpi = q.get("dpi") === "300" ? 300 : 203;
  try {
    const a = await armarZpl(db, tipo as TipoEtiqueta, ref, dpi);
    return new Response(a.zpl, { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="etiquetas-${tipo}.zpl"`, "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return new Response(e.message, { status: 404 });
    throw e;
  }
}
