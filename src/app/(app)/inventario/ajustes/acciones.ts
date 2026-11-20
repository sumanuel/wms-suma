"use server";

import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ajustarCaja, MODOS, MOTIVOS, type Modo, type Motivo } from "@/lib/inventario/ajustes";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";

export type EstadoAjuste = { error?: string };

function numero(v: FormDataEntryValue | null) {
  const t = String(v ?? "").trim();
  if (t === "") return NaN;
  // 1.234,5 · 1234,5 · 1234.5
  const n = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, "") : t;
  return Number(n);
}

export async function ajustar(_previo: EstadoAjuste, form: FormData): Promise<EstadoAjuste> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  const caja = numero(form.get("caja"));
  const ean = String(form.get("ean") ?? "");
  const bodega = String(form.get("bodega") ?? "");
  const modo = String(form.get("modo") ?? "") as Modo;
  const motivo = String(form.get("motivo") ?? "") as Motivo;
  const cantidad = numero(form.get("cantidad"));
  if (!Number.isFinite(caja) || !ean || !bodega) return { error: "Faltan los datos de la caja: búscala otra vez." };
  if (!(modo in MODOS)) return { error: "Elige qué hacer con el saldo." };
  if (!(MOTIVOS as readonly string[]).includes(motivo)) return { error: "Elige un motivo de la lista." };
  if (!Number.isFinite(cantidad)) return { error: "Escribe la cantidad (un número, cero o más)." };
  try {
    const r = await ajustarCaja(db, { caja, ean, bodega, modo, cantidad, motivo, detalle: String(form.get("detalle") ?? "").trim() || null, soporte: String(form.get("soporte") ?? "").trim() || null });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pic_ajuste", entidadId: `${caja}|${r.id}`, accion: "crear", antes: { saldo: r.antes }, despues: { saldo: r.despues, diferencia: r.diferencia, motivo: r.motivo } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  redirect("/inventario/ajustes?aviso=creado");
}
