"use server";

import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ajustarCaja, buscarCaja } from "@/lib/inventario/ajustes";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { registrarCantidades } from "@/lib/conteo/servicio";
import { reubicarCaja } from "@/lib/movil/servicio";

export type Resultado = { error?: string; aviso?: string };

const entero = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  return /^\d+$/.test(t) ? Number(t) : NaN;
};
const decimal = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim().replace(",", ".");
  return t === "" ? NaN : Number(t);
};
const falla = (e: unknown): Resultado => {
  if (e instanceof ErrorDeNegocio) return { error: e.message };
  throw e;
};

export async function ubicarCaja(_p: Resultado, form: FormData): Promise<Resultado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  const caja = entero(form.get("caja"));
  const ub = String(form.get("ubicacion") ?? "");
  try {
    const r = await reubicarCaja(db, caja, ub);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pic", entidadId: String(caja), accion: "editar", antes: { ubicacion: r.desde }, despues: { ubicacion: r.hasta, origen: "terminal móvil" } });
    return { aviso: `Caja ${caja} → ${r.hasta}.` };
  } catch (e) {
    return falla(e);
  }
}

/** Cuenta una caja de un conteo: se busca la línea por el número de caja leído. */
export async function contarCaja(conteo: number, _p: Resultado, form: FormData): Promise<Resultado> {
  const { db, usuario } = await requerirPermisoAccion("conteo", "editar");
  const caja = entero(form.get("caja"));
  const cantidad = decimal(form.get("cantidad"));
  if (!Number.isFinite(caja)) return { error: "Lee o escribe el número de la caja." };
  if (!Number.isFinite(cantidad) || cantidad < 0) return { error: "Escribe la cantidad contada (cero o más)." };
  try {
    const l = await db.$queryRaw<{ id: number }[]>`SELECT idconsecutivo AS id FROM t_temporal_conteowms WHERE idconteo = ${conteo} AND caja = ${caja} LIMIT 1`;
    if (!l[0]) return { error: `La caja ${caja} no está en este conteo.` };
    const r = await registrarCantidades(db, conteo, [{ linea: l[0].id, cantidad }], null);
    if (r.cambios > 0) await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_temporal_conteowms", entidadId: `${conteo}|${caja}`, accion: "editar", despues: { cantidad, origen: "terminal móvil" } });
    return { aviso: `Caja ${caja}: ${cantidad}.` };
  } catch (e) {
    return falla(e);
  }
}

export async function ajustarMovil(_p: Resultado, form: FormData): Promise<Resultado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  const caja = entero(form.get("caja"));
  const cantidad = decimal(form.get("cantidad"));
  const motivo = String(form.get("motivo") ?? "");
  if (!Number.isFinite(caja)) return { error: "Lee o escribe el número de la caja." };
  if (!Number.isFinite(cantidad) || cantidad < 0) return { error: "Escribe el saldo real (cero o más)." };
  try {
    const c = await buscarCaja(db, caja);
    if (c.length === 0) return { error: `La caja ${caja} no existe en el inventario.` };
    if (c.length > 1) return { error: `Hay ${c.length} cajas con el número ${caja}: ajústala desde el escritorio.` };
    const r = await ajustarCaja(db, { caja, ean: c[0].ean, bodega: c[0].bodega, modo: "fijar", cantidad, motivo: motivo as never, detalle: "Terminal móvil", soporte: null });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pic_ajuste", entidadId: `${caja}|${r.id}`, accion: "crear", antes: { saldo: r.antes }, despues: { saldo: r.despues, motivo: r.motivo, origen: "terminal móvil" } });
    return { aviso: `Caja ${caja}: ${r.antes} → ${r.despues}.` };
  } catch (e) {
    return falla(e);
  }
}
