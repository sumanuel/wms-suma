"use server";

import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { esViolacionDeClave, leerFormulario, type EstadoForm } from "@/lib/formularios";
import type { Prisma } from "@/generated/prisma/client";
import { camposArticulo, camposReferencia } from "./campos";

const SIN_DEPENDIENTES = "No se puede eliminar: tiene registros que dependen de él (movimientos, pedidos u otros). Desactívalo en su lugar.";

async function referenciasDisponibles(db: Awaited<ReturnType<typeof requerirPermisoAccion>>["db"]) {
  const refs = await db.insReferencias.findMany({ select: { codigoreferencia: true, nombreref: true }, orderBy: { codigoreferencia: "asc" } });
  return refs.map((r) => ({ valor: r.codigoreferencia, etiqueta: `${r.codigoreferencia} · ${r.nombreref ?? ""}` }));
}

function fallo(f: ReturnType<typeof leerFormulario>, previo: EstadoForm): EstadoForm {
  return { errores: f.errores, valores: f.valores, error: "Revisa los campos marcados.", intento: (previo.intento ?? 0) + 1 };
}

// ── Artículos (t_detalle_referencia) ──────────────────────────────────────────────────────────────────────────────

export async function guardarArticulo(ean: string | null, previo: EstadoForm, form: FormData): Promise<EstadoForm> {
  const editando = ean !== null;
  const { db, usuario } = await requerirPermisoAccion("articulos", editando ? "editar" : "crear");
  const f = leerFormulario(camposArticulo(await referenciasDisponibles(db)), form, editando);
  if (!f.ok) return fallo(f, previo);
  const datos = f.datos as unknown as Prisma.DetalleReferenciaUncheckedCreateInput;

  if (editando) {
    const antes = await db.detalleReferencia.findUnique({ where: { productoean: ean } });
    if (!antes) return { error: "El artículo ya no existe." };
    await db.detalleReferencia.update({ where: { productoean: ean }, data: datos });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_detalle_referencia", entidadId: ean, accion: "editar", antes, despues: datos });
  } else {
    if (await db.detalleReferencia.findUnique({ where: { productoean: datos.productoean } })) {
      return { errores: { productoean: "Ya existe un artículo con este código." }, valores: f.valores, error: "Revisa los campos marcados.", intento: (previo.intento ?? 0) + 1 };
    }
    await db.detalleReferencia.create({ data: datos });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_detalle_referencia", entidadId: datos.productoean, accion: "crear", despues: datos });
  }
  redirect(`/articulos?aviso=${editando ? "editado" : "creado"}`);
}

export async function eliminarArticulo(ean: string): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("articulos", "eliminar");
  const antes = await db.detalleReferencia.findUnique({ where: { productoean: ean } });
  if (!antes) redirect("/articulos?aviso=eliminado");
  try {
    await db.detalleReferencia.delete({ where: { productoean: ean } });
  } catch (e) {
    if (esViolacionDeClave(e)) return { error: SIN_DEPENDIENTES };
    throw e;
  }
  await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_detalle_referencia", entidadId: ean, accion: "eliminar", antes });
  redirect("/articulos?aviso=eliminado");
}

// ── Referencias (t_ins_referencias) ───────────────────────────────────────────────────────────────────────────────

export async function guardarReferencia(codigo: string | null, previo: EstadoForm, form: FormData): Promise<EstadoForm> {
  const editando = codigo !== null;
  const { db, usuario } = await requerirPermisoAccion("articulos", editando ? "editar" : "crear");
  const f = leerFormulario(camposReferencia, form, editando);
  if (!f.ok) return fallo(f, previo);
  const datos = f.datos as unknown as Prisma.InsReferenciasUncheckedCreateInput;

  if (editando) {
    const antes = await db.insReferencias.findUnique({ where: { codigoreferencia: codigo } });
    if (!antes) return { error: "La referencia ya no existe." };
    await db.insReferencias.update({ where: { codigoreferencia: codigo }, data: datos });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_ins_referencias", entidadId: codigo, accion: "editar", antes, despues: datos });
  } else {
    if (await db.insReferencias.findUnique({ where: { codigoreferencia: datos.codigoreferencia } })) {
      return { errores: { codigoreferencia: "Ya existe una referencia con este código." }, valores: f.valores, error: "Revisa los campos marcados.", intento: (previo.intento ?? 0) + 1 };
    }
    await db.insReferencias.create({ data: { ...datos, fechacrea: new Date() } });
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_ins_referencias", entidadId: datos.codigoreferencia, accion: "crear", despues: datos });
  }
  redirect(`/articulos/referencias?aviso=${editando ? "editado" : "creado"}`);
}

export async function eliminarReferencia(codigo: string): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("articulos", "eliminar");
  const antes = await db.insReferencias.findUnique({ where: { codigoreferencia: codigo } });
  if (!antes) redirect("/articulos/referencias?aviso=eliminado");
  try {
    await db.insReferencias.delete({ where: { codigoreferencia: codigo } });
  } catch (e) {
    if (esViolacionDeClave(e)) return { error: "No se puede eliminar: tiene artículos asociados." };
    throw e;
  }
  await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_ins_referencias", entidadId: codigo, accion: "eliminar", antes });
  redirect("/articulos/referencias?aviso=eliminado");
}
