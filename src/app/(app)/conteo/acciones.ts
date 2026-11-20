"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { leerFormulario, type EstadoForm } from "@/lib/formularios";
import { aplicarConteo, eliminarConteo, programarConteo, programarReconteo, registrarCantidades } from "@/lib/conteo/servicio";
import { camposProgramar } from "./campos";

function numeroValido(texto: string) {
  const t = String(texto).trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 && n < 1e9 ? n : NaN;
}

export async function programar(previo: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { db, usuario } = await requerirPermisoAccion("conteo", "crear");
  const campos = await camposProgramar(db);
  const f = leerFormulario(campos, form, false);
  const intento = (previo.intento ?? 0) + 1;
  const errores = { ...f.errores };
  const ean = f.datos.ean ? String(f.datos.ean) : null;
  if (ean && !(await db.detalleReferencia.findUnique({ where: { productoean: ean }, select: { productoean: true } }))) {
    errores.ean = "No existe un artículo con ese código de barras.";
  }
  if (Object.keys(errores).length > 0) return { errores, valores: f.valores, error: "Revisa los campos marcados.", intento };

  let id: number;
  try {
    const r = await programarConteo(db, {
      bodega: String(f.datos.bodega), ean, ubicacion: f.datos.ubicacion ? String(f.datos.ubicacion) : null,
      programa: usuario.nombre, realiza: String(f.datos.realiza),
    });
    id = r.id;
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_temporar_encabezado_conteowms", entidadId: String(id), accion: "crear", despues: { ...f.datos, lineas: r.lineas } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message, valores: f.valores, intento };
    throw e;
  }
  redirect(`/conteo/${id}?aviso=creado`);
}

export type EstadoCantidades = { error?: string; mensaje?: string };

export async function guardarCantidades(id: number, _previo: EstadoCantidades, form: FormData): Promise<EstadoCantidades> {
  const { db, usuario } = await requerirPermisoAccion("conteo", "editar");
  const cantidades: { linea: number; cantidad: number }[] = [];
  for (const [nombre, valor] of form.entries()) {
    if (!nombre.startsWith("c_") || typeof valor !== "string") continue;
    const linea = Number(nombre.slice(2));
    const n = numeroValido(valor);
    if (n === null) continue;
    if (!Number.isSafeInteger(linea) || Number.isNaN(n)) return { error: "Hay cantidades que no son un número válido (use cero o más, con coma o punto decimal)." };
    cantidades.push({ linea, cantidad: n });
  }
  if (cantidades.length === 0) return { error: "No escribió ninguna cantidad." };
  try {
    const r = await registrarCantidades(db, id, cantidades, null);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_temporal_conteowms", entidadId: String(id), accion: "editar", despues: { cantidadesGuardadas: r.cambios } });
    // La página (resumen, diferencias) se vuelve a calcular con lo guardado.
    revalidatePath(`/conteo/${id}`);
    return { mensaje: r.cambios === 0 ? "No hubo cambios." : `Se guardaron ${r.cambios} cantidad${r.cambios === 1 ? "" : "es"}.` };
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
}

export async function aplicar(id: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("conteo", "editar");
  try {
    const r = await aplicarConteo(db, id);
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_temporar_encabezado_conteowms", entidadId: String(id), accion: "otro", despues: { aplicado: true, ...r } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  redirect(`/conteo/${id}?aviso=aplicado`);
}

export async function reconteo(id: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("conteo", "crear");
  let nuevo: number;
  try {
    const base = await db.temporarEncabezadoConteowms.findUnique({ where: { idconteo: id } });
    const r = await programarReconteo(db, id, { programa: usuario.nombre, realiza: base?.realiza ?? usuario.nombre });
    nuevo = r.id;
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_temporar_encabezado_conteowms", entidadId: String(nuevo), accion: "crear", despues: { reconteoDe: id, lineas: r.lineas } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  redirect(`/conteo/${nuevo}?aviso=reconteo`);
}

export async function eliminar(id: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("conteo", "eliminar");
  try {
    if (await eliminarConteo(db, id)) {
      await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_temporar_encabezado_conteowms", entidadId: String(id), accion: "eliminar" });
    }
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  redirect("/conteo?aviso=eliminado");
}
