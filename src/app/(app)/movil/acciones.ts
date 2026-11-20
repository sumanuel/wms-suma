"use server";

import { requerirPermisoAccion, tienePermiso } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ajustarCaja, buscarCaja, simularAjuste, type DatosAjuste } from "@/lib/inventario/ajustes";
import { leerUmbral, requiereAprobacion, solicitarAjuste } from "@/lib/inventario/aprobacion";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { registrarCantidades } from "@/lib/conteo/servicio";
import { reubicarCaja } from "@/lib/movil/servicio";
import { completarTarea } from "@/lib/resurtido/servicio";
import { recibir } from "@/lib/recepcion/servicio";

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
  const ctx = await requerirPermisoAccion("inventario", "editar");
  const { db, usuario } = ctx;
  const caja = entero(form.get("caja"));
  const cantidad = decimal(form.get("cantidad"));
  const motivo = String(form.get("motivo") ?? "");
  if (!Number.isFinite(caja)) return { error: "Lee o escribe el número de la caja." };
  if (!Number.isFinite(cantidad) || cantidad < 0) return { error: "Escribe el saldo real (cero o más)." };
  try {
    const c = await buscarCaja(db, caja);
    if (c.length === 0) return { error: `La caja ${caja} no existe en el inventario.` };
    if (c.length > 1) return { error: `Hay ${c.length} cajas con el número ${caja}: ajústala desde el escritorio.` };
    const datos: DatosAjuste = { caja, ean: c[0].ean, bodega: c[0].bodega, modo: "fijar", cantidad, motivo: motivo as never, detalle: "Terminal móvil", soporte: null };
    const umbral = await leerUmbral(db);
    if (umbral > 0 && !tienePermiso(ctx, "inventario", "eliminar")) {
      const sim = await simularAjuste(db, datos);
      if (requiereAprobacion(umbral, sim.diferencia, false)) {
        const s = await solicitarAjuste(db, datos, { id: usuario.id, nombre: usuario.nombre });
        await registrarCambio(db, { usuarioId: usuario.id, entidad: "ajuste_solicitud", entidadId: String(s.id), accion: "crear", despues: { caja, diferencia: s.diferencia, motivo, origen: "terminal móvil" } });
        return { aviso: `La diferencia (${s.diferencia}) supera el umbral: quedó como solicitud #${s.id} por aprobar.` };
      }
    }
    const r = await ajustarCaja(db, datos);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_pic_ajuste", entidadId: `${caja}|${r.id}`, accion: "crear", antes: { saldo: r.antes }, despues: { saldo: r.despues, motivo: r.motivo, origen: "terminal móvil" } });
    return { aviso: `Caja ${caja}: ${r.antes} → ${r.despues}.` };
  } catch (e) {
    return falla(e);
  }
}

/** Resurtido desde el lector: se lee la caja de la tarea y la ubicación de picking donde queda. */
export async function resurtirCaja(tarea: number, _p: Resultado, form: FormData): Promise<Resultado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  const caja = entero(form.get("caja"));
  const ub = String(form.get("ubicacion") ?? "").trim();
  if (!Number.isFinite(caja)) return { error: "Lee o escribe el número de la caja." };
  try {
    const t = await db.resurtidoTarea.findUnique({ where: { id: tarea } });
    if (!t || t.estado !== "pendiente") return { error: "La tarea ya fue resuelta o no existe." };
    if (ub.toUpperCase() !== t.ubicacion_destino.toUpperCase()) return { error: `La ubicación correcta es ${t.ubicacion_destino}, no ${ub || "la leída"}.` };
    const r = await completarTarea(db, tarea, usuario.id, caja);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "resurtido_tarea", entidadId: String(tarea), accion: "editar", despues: { estado: "hecha", caja: r.caja, desde: r.desde, hasta: r.hasta, origen: "terminal móvil" } });
    return { aviso: `Caja ${r.caja} → ${r.hasta}.` };
  } catch (e) {
    return falla(e);
  }
}

/** Recepción contra una orden de compra desde el lector: se lee el artículo y se indican lote, vencimiento, cajas y cantidad por caja. */
export async function recibirMovil(orden: number, _p: Resultado, form: FormData): Promise<Resultado> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "crear");
  const ean = String(form.get("ean") ?? "").trim();
  const lote = String(form.get("lote") ?? "").trim();
  const vence = String(form.get("vence") ?? "").trim();
  const cajas = decimal(form.get("cajas"));
  const cantidad = decimal(form.get("cantidad"));
  if (!Number.isInteger(cajas)) return { error: "El número de cajas debe ser un entero." };
  try {
    const b = await db.$queryRaw<{ bodega: string | null }[]>`SELECT DISTINCT bodega FROM t_detalle_orden_compra WHERE nordencompra = ${orden} AND eanproveedores = ${ean}`;
    if (!b[0]?.bodega) return { error: `El artículo ${ean} no está en la orden ${orden}.` };
    const cfg = await db.configuracion.findUnique({ where: { clave: "recepcion.calidad_inicial" } });
    const estado = cfg && typeof cfg.valor === "object" && cfg.valor && typeof (cfg.valor as { estado?: unknown }).estado === "string" ? String((cfg.valor as { estado: string }).estado) : "Cuarentena";
    const r = await recibir(db, { bodega: b[0].bodega, documento: "", nit: null, estado, lineas: [{ ean, lote, vence: vence || null, cajas, cantidad }], orden });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "recepcion", entidadId: r.documento, accion: "crear", despues: { cajas: r.cajas, unidades: r.unidades, desde: r.desde, hasta: r.hasta, origen: "terminal móvil" } });
    return { aviso: `${r.cajas} caja${r.cajas === 1 ? "" : "s"} (${r.desde}–${r.hasta}) en ${r.ubicacion}.${r.ordenCompleta ? " La orden quedó completa." : ""}` };
  } catch (e) {
    return falla(e);
  }
}
