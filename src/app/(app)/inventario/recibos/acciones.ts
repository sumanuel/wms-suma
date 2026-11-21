"use server";

import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { autorizarCiego, rechazarCiego, registrarCiego } from "@/lib/compras/recibo-ciego";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import type { LineaRecepcion } from "@/lib/recepcion/servicio";

export type Estado = { error?: string; aviso?: string };
const falla = (e: unknown): Estado => { if (e instanceof ErrorDeNegocio) return { error: e.message }; throw e; };
const numero = (v: unknown) => { const t = String(v ?? "").trim(); if (t === "") return NaN; return Number(t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t); };

export async function contarACiegas(_p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "crear");
  const orden = Number(form.get("orden"));
  const lineas: LineaRecepcion[] = [];
  const total = Math.min(Number(form.get("lineas") ?? 0), 100);
  for (let i = 0; i < total; i++) {
    const ean = String(form.get(`ean_${i}`) ?? "").trim(), lote = String(form.get(`lote_${i}`) ?? "").trim(), vence = String(form.get(`vence_${i}`) ?? "").trim();
    const cajas = String(form.get(`cajas_${i}`) ?? "").trim(), cant = String(form.get(`cantidad_${i}`) ?? "").trim();
    if (!ean && !lote && !vence && !cajas && !cant) continue;
    lineas.push({ ean, lote, vence: vence || null, cajas: numero(cajas), cantidad: numero(cant) });
  }
  try {
    const id = await registrarCiego(db, orden, String(form.get("estado") ?? ""), lineas, { id: usuario.id, nombre: usuario.nombre });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "recibo_ciego", entidadId: String(id), accion: "crear", despues: { orden, lineas: lineas.length } });
    return { aviso: `Conteo registrado (recibo ${id}). Queda por conciliar: un aprobador lo compara con la orden.` };
  } catch (e) {
    return falla(e);
  }
}

export async function autorizar(id: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "eliminar");
  const nota = String(form.get("nota") ?? "");
  try {
    const r = await autorizarCiego(db, id, { id: usuario.id, nombre: usuario.nombre }, nota);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "recibo_ciego", entidadId: String(id), accion: "editar", despues: { estado: "autorizado", cajas: r.cajas, desde: r.desde, hasta: r.hasta, diferencias: r.diferencias, nota } });
  } catch (e) {
    return falla(e);
  }
  redirect(`/inventario/recibos/${id}?aviso=autorizado`);
}

export async function rechazar(id: number, _p: Estado, form: FormData): Promise<Estado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "eliminar");
  const nota = String(form.get("nota") ?? "");
  try {
    await rechazarCiego(db, id, { id: usuario.id, nombre: usuario.nombre }, nota);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "recibo_ciego", entidadId: String(id), accion: "editar", despues: { estado: "rechazado", nota } });
  } catch (e) {
    return falla(e);
  }
  redirect(`/inventario/recibos/${id}?aviso=rechazado`);
}
