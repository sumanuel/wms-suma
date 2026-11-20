"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { leerFormulario, type EstadoForm } from "@/lib/formularios";
import { agregarLinea, actualizarCabecera, cambiarEstado, crearPedido, eliminarPedido, guardarLineas, quitarLinea, reservarExistencias, type DatosPedido } from "@/lib/pedidos/servicio";
import { camposPedido } from "./campos";

const ENT = "t_narth_encabezado_pedido";
const texto = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
const ruta = (n: string) => `/pedidos/${encodeURIComponent(n)}`;

function datosDe(d: Record<string, unknown>): Omit<DatosPedido, "registradopor"> {
  return {
    npedido: texto(d.npedido), sede: Number(d.sede), fechapedido: (d.fechapedido as Date | null) ?? null, fechavence: (d.fechavence as Date | null) ?? null,
    ocompra: texto(d.ocompra), tipoventa: texto(d.tipoventa), prioridad: d.prioridad === null || d.prioridad === undefined ? null : Number(d.prioridad),
    direcciondeenvio: texto(d.direcciondeenvio), personasolicitapedido: texto(d.personasolicitapedido), requisitos: texto(d.requisitos),
  };
}

export async function guardarPedido(numero: string | null, previo: EstadoForm, form: FormData): Promise<EstadoForm> {
  const editando = numero !== null;
  const { db, usuario } = await requerirPermisoAccion("pedidos", editando ? "editar" : "crear");
  const f = leerFormulario(await camposPedido(db, !editando), form, editando);
  const intento = (previo.intento ?? 0) + 1;
  if (!f.ok) return { errores: f.errores, valores: f.valores, error: "Revisa los campos marcados.", intento };
  const d = datosDe(f.datos);
  let destino: string;
  try {
    if (editando) {
      const antes = await actualizarCabecera(db, numero, d);
      await registrarCambio(db, { usuarioId: usuario.id, entidad: ENT, entidadId: numero, accion: "editar", antes: { sede: antes.nitvble, fechavence: antes.fechavence, ocompra: antes.ocompra }, despues: d });
      destino = `${ruta(numero)}?aviso=editado`;
    } else {
      const n = await crearPedido(db, { ...d, registradopor: usuario.nombre });
      await registrarCambio(db, { usuarioId: usuario.id, entidad: ENT, entidadId: n, accion: "crear", despues: d });
      destino = `${ruta(n)}?aviso=creado`;
    }
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message, valores: f.valores, intento };
    throw e;
  }
  redirect(destino);
}

export type EstadoLineas = { error?: string; mensaje?: string };

export async function agregarLineaPedido(numero: string, _previo: EstadoLineas, form: FormData): Promise<EstadoLineas> {
  const { db, usuario } = await requerirPermisoAccion("pedidos", "editar");
  const ean = String(form.get("ean") ?? "").trim();
  const bodega = String(form.get("bodega") ?? "").trim();
  const cantidad = Number(String(form.get("cantidad") ?? "").replace(",", "."));
  const precio = Number(String(form.get("precio") ?? "0").replace(",", ".") || "0");
  if (!ean || !bodega) return { error: "Indica el artículo (código de barras) y la bodega." };
  if (!Number.isFinite(cantidad) || cantidad <= 0 || cantidad > 1e9) return { error: "La cantidad debe ser un número mayor que cero." };
  if (!Number.isFinite(precio) || precio < 0 || precio > 1e12) return { error: "El precio debe ser un número, cero o más." };
  try {
    const id = await agregarLinea(db, numero, { ean, bodega, cantidad, precio, observaciones: texto(String(form.get("observaciones") ?? "").trim()) });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_narth_serie_pedido", entidadId: `${numero}|${id}`, accion: "crear", despues: { ean, bodega, cantidad, precio } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath(ruta(numero));
  return { mensaje: "Se agregó la línea." };
}

export async function guardarLineasPedido(numero: string, _previo: EstadoLineas, form: FormData): Promise<EstadoLineas> {
  const { db, usuario } = await requerirPermisoAccion("pedidos", "editar");
  const porLinea = new Map<number, { cantidad?: number; precio?: number }>();
  for (const [k, v] of form.entries()) {
    const m = /^(c|p)_(\d+)$/.exec(k);
    if (!m || typeof v !== "string") continue;
    const n = Number(v.trim().replace(",", "."));
    if (v.trim() === "" || !Number.isFinite(n) || n < 0 || n > 1e12) return { error: "Hay cantidades o precios que no son un número válido (cero o más)." };
    const o = porLinea.get(Number(m[2])) ?? {};
    if (m[1] === "c") o.cantidad = n;
    else o.precio = n;
    porLinea.set(Number(m[2]), o);
  }
  const cambios = [...porLinea].filter(([, o]) => o.cantidad !== undefined && o.precio !== undefined).map(([contador, o]) => ({ contador, cantidad: o.cantidad!, precio: o.precio! }));
  try {
    const n = await guardarLineas(db, numero, cambios);
    if (n > 0) await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_narth_serie_pedido", entidadId: numero, accion: "editar", despues: { lineasModificadas: n } });
    revalidatePath(ruta(numero));
    return { mensaje: n === 0 ? "No hubo cambios." : `Se guardaron ${n} línea${n === 1 ? "" : "s"}.` };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}

export async function quitarLineaPedido(numero: string, contador: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("pedidos", "editar");
  try {
    const l = await quitarLinea(db, numero, contador);
    if (l) await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_narth_serie_pedido", entidadId: `${numero}|${contador}`, accion: "eliminar", antes: { ean: l.ref, pares: l.pares } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath(ruta(numero));
  return {};
}

export async function cambiarEstadoPedido(numero: string, nuevo: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("pedidos", "editar");
  try {
    const r = await cambiarEstado(db, numero, nuevo, usuario.nombre);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: ENT, entidadId: numero, accion: "editar", antes: { estado: r.anterior }, despues: { estado: r.nuevo } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  redirect(`${ruta(numero)}?aviso=estado`);
}

export async function reservarPedido(numero: string): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("pedidos", "editar");
  try {
    const r = await reservarExistencias(db, numero);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_narth_serie_pedido", entidadId: numero, accion: "otro", despues: { reservado: r.reservado } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  redirect(`${ruta(numero)}?aviso=reservado`);
}

export async function eliminarPedidoAccion(numero: string): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("pedidos", "eliminar");
  try {
    if (await eliminarPedido(db, numero)) await registrarCambio(db, { usuarioId: usuario.id, entidad: ENT, entidadId: numero, accion: "eliminar" });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  redirect("/pedidos?aviso=eliminado");
}
