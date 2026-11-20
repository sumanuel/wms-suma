"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { anularGuia, despachar, marcarEntregada, marcarEnviada } from "@/lib/despacho/servicio";

export type EstadoDespacho = { error?: string };
const texto = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
};
function numeroOpcional(v: FormDataEntryValue | null) {
  const t = String(v ?? "").trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n < 1e13 ? n : NaN;
}

export async function despacharAccion(picking: number, _previo: EstadoDespacho, form: FormData): Promise<EstadoDespacho> {
  const { db, usuario, cliente } = await requerirPermisoAccion("despacho", "crear");
  const valorDeclarado = numeroOpcional(form.get("valorDeclarado"));
  const total = numeroOpcional(form.get("total"));
  if (Number.isNaN(valorDeclarado) || Number.isNaN(total)) return { error: "El valor declarado y el flete deben ser números (cero o más)." };
  let auto: number;
  try {
    const r = await despachar(db, picking, {
      transportador: String(form.get("transportador") ?? "").trim(), factura: texto(form.get("factura")), valorDeclarado, total, comentario: texto(form.get("comentario")), nombreEmpresa: cliente.nombre,
    });
    auto = r.guia;
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_guias_generadas", entidadId: String(auto), accion: "crear", despues: { picking, guia: r.numGuia, unidades: r.unidades, estadoPedido: r.estadoPedido } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath("/pedidos");
  redirect(`/despacho/guias/${auto}?aviso=creada`);
}

async function seguimiento(auto: number, evento: string, fn: (db: Awaited<ReturnType<typeof requerirPermisoAccion>>["db"]) => Promise<unknown>): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("despacho", "editar");
  try {
    await fn(db);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_guias_generadas", entidadId: String(auto), accion: "editar", despues: { evento } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath("/pedidos");
  redirect(`/despacho/guias/${auto}?aviso=${encodeURIComponent(evento)}`);
}

export async function enviarAccion(auto: number) {
  return seguimiento(auto, "enviada", (db) => marcarEnviada(db, auto));
}
export async function entregarAccion(auto: number) {
  return seguimiento(auto, "entregada", (db) => marcarEntregada(db, auto));
}
export async function anularAccion(auto: number) {
  return seguimiento(auto, "anulada", (db) => anularGuia(db, auto));
}
