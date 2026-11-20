"use server";

import { redirect } from "next/navigation";
import { requerirSesion } from "@/lib/dal";
import { crearSesion } from "@/lib/sesion";
import { registrarCambio } from "@/lib/auditoria";
import { hashear, motivoContrasenaDebil, verificar } from "@/lib/nucleo/contrasenas";

export type EstadoCambio = { error?: string };

export async function cambiarContrasena(_: EstadoCambio, form: FormData): Promise<EstadoCambio> {
  const { db, cliente, usuario } = await requerirSesion();
  const actual = String(form.get("actual") ?? "");
  const nueva = String(form.get("nueva") ?? "");
  const repetida = String(form.get("repetida") ?? "");

  if (nueva !== repetida) return { error: "Las contraseñas nuevas no coinciden." };
  const debil = motivoContrasenaDebil(nueva);
  if (debil) return { error: debil };

  const u = await db.usuario.findUniqueOrThrow({ where: { id: usuario.id } });
  if (!(await verificar(actual, u.hashContrasena))) return { error: "La contraseña actual no es correcta." };
  if (actual === nueva) return { error: "La contraseña nueva debe ser distinta de la actual." };

  await db.usuario.update({
    where: { id: u.id },
    data: {
      hashContrasena: await hashear(nueva),
      debeCambiarContrasena: false,
      contrasenaCambiadaEn: new Date(),
    },
  });
  await registrarCambio(db, { usuarioId: u.id, entidad: "usuario", entidadId: u.id, accion: "otro", despues: { cambio: "contrasena" } });
  // Cambiar la contraseña invalida las demás sesiones; esta se renueva.
  await crearSesion({ usuarioId: u.id, clienteId: cliente.id, clienteSlug: cliente.slug, debeCambiar: false });
  redirect("/");
}
