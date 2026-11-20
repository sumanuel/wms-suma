"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { eliminarPicking, generarPicking } from "@/lib/picking/servicio";

export type EstadoGenerar = { error?: string };

const texto = (v: FormDataEntryValue | null) => {
  const t = String(v ?? "").trim();
  return t === "" ? null : t;
};

export async function generar(numero: string, _previo: EstadoGenerar, form: FormData): Promise<EstadoGenerar> {
  const { db, usuario } = await requerirPermisoAccion("picking", "crear");
  let id: number;
  try {
    const r = await generarPicking(db, numero, { pickeador: texto(form.get("pickeador")), transportador: texto(form.get("transportador")), observaciones: texto(form.get("observaciones")) });
    id = r.picking;
    await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_encabezado_prepack", entidadId: String(id), accion: "crear", despues: { pedido: numero, bodega: r.bodega, lineas: r.lineas, unidades: r.unidades, faltantes: r.faltantes.length } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath("/pedidos");
  redirect(`/picking/${id}?aviso=creado`);
}

export async function eliminar(id: number): Promise<{ error?: string }> {
  const { db, usuario } = await requerirPermisoAccion("picking", "eliminar");
  try {
    const r = await eliminarPicking(db, id);
    if (r) await registrarCambio(db, { usuarioId: usuario.id, entidad: "t_encabezado_prepack", entidadId: String(id), accion: "eliminar", antes: { pedido: r.pedido, lineas: r.lineas } });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  revalidatePath("/pedidos");
  redirect("/picking?aviso=eliminado");
}
