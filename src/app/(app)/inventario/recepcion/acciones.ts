"use server";

import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { almacenar, recibir, type LineaRecepcion } from "@/lib/recepcion/servicio";

export type EstadoRecepcion = { error?: string; resultado?: { ordenCompleta?: boolean; documento: string; desde: number; hasta: number; cajas: number; unidades: number; ubicacion: string; lotesNuevos: number } };
const numero = (v: unknown) => { const t = String(v ?? "").trim(); if (t === "") return NaN; const n = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t; return Number(n); };

export async function registrarRecepcion(_p: EstadoRecepcion, form: FormData): Promise<EstadoRecepcion> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "crear");
  const lineas: LineaRecepcion[] = [];
  const total = Math.min(Number(form.get("lineas") ?? 0), 200);
  for (let i = 0; i < total; i++) {
    const ean = String(form.get(`ean_${i}`) ?? "").trim();
    const lote = String(form.get(`lote_${i}`) ?? "").trim();
    const vence = String(form.get(`vence_${i}`) ?? "").trim();
    const cajasT = String(form.get(`cajas_${i}`) ?? "").trim();
    const cantT = String(form.get(`cantidad_${i}`) ?? "").trim();
    if (!lote && !vence && !cajasT && !cantT) continue; // fila vacía (el código puede venir prellenado desde la orden)
    lineas.push({ ean, lote, vence: vence || null, cajas: numero(cajasT), cantidad: numero(cantT) });
  }
  try {
    const r = await recibir(db, { bodega: String(form.get("bodega") ?? ""), documento: String(form.get("documento") ?? ""), nit: String(form.get("nit") ?? "") || null, estado: String(form.get("estado") ?? ""), lineas, orden: /^\d+$/.test(String(form.get("orden") ?? "")) ? Number(form.get("orden")) : null });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "recepcion", entidadId: r.documento, accion: "crear", despues: { cajas: r.cajas, unidades: r.unidades, desde: r.desde, hasta: r.hasta, ubicacion: r.ubicacion } });
    return { resultado: r };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}

export async function almacenarCaja(caja: number, _p: { error?: string; aviso?: string }, form: FormData): Promise<{ error?: string; aviso?: string }> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  const ub = String(form.get("ubicacion") ?? "");
  try {
    const r = await almacenar(db, caja, ub);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pic", entidadId: String(caja), accion: "editar", antes: { ubicacion: r.desde }, despues: { ubicacion: r.hasta, origen: "almacenamiento dirigido", siguioSugerencia: r.sugerida } });
    return { aviso: r.sugerida ? `Caja ${caja} almacenada en ${r.hasta}.` : `Caja ${caja} almacenada en ${r.hasta} (distinta a la sugerida).` };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}
