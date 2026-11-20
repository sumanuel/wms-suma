"use server";

import { redirect } from "next/navigation";
import { requerirPermisoAccion } from "@/lib/dal";
import { registrarCambio } from "@/lib/auditoria";
import { ErrorDeNegocio, cambiarEstadoCalidad, ESTADOS_CALIDAD, type EstadoCalidad } from "@/lib/inventario/calidad";
import { loteCompleto } from "@/lib/inventario/consultas";

export type EstadoCambioCalidad = { error?: string };

export async function cambiarEstadoLote(idlote: number, _previo: EstadoCambioCalidad, form: FormData): Promise<EstadoCambioCalidad> {
  const { db, usuario } = await requerirPermisoAccion("inventario", "editar");
  const estado = String(form.get("estado") ?? "") as EstadoCalidad;
  if (!ESTADOS_CALIDAD.includes(estado)) return { error: "Elige un estado." };
  const lote = await loteCompleto(db, idlote);
  if (!lote) return { error: "El lote ya no existe." };

  try {
    const r = await cambiarEstadoCalidad(db, {
      lote: String(lote.lote),
      ean: String(lote.ean),
      estado,
      // El historial del sistema anterior guarda el usuario como número; los usuarios nuevos no lo tienen: el responsable
      // queda en la auditoría.
      usuarioId: null,
      numControl: String(form.get("control") ?? ""),
    });
    await registrarCambio(db, {
      usuarioId: usuario.id,
      entidad: "t_historia_status_calidad",
      entidadId: `${lote.lote}|${lote.ean}`,
      accion: "editar",
      antes: { estado: r.anterior },
      despues: { estado: r.nuevo, saldo: r.saldo, control: String(form.get("control") ?? "").trim() },
    });
  } catch (e) {
    if (e instanceof ErrorDeNegocio) return { error: e.message };
    throw e;
  }
  redirect(`/inventario/lotes/${idlote}?aviso=estado`);
}
