"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { crearSesion } from "@/lib/sesion";
import { abrirDb, buscarClientePorSlug } from "@/lib/tenant";
import { slugDeHost, rutaInternaSegura } from "@/lib/host";
import { INTENTOS_MAXIMOS, MINUTOS_BLOQUEO, verificar } from "@/lib/nucleo/contrasenas";

export type EstadoIngreso = { error?: string };

const Datos = z.object({
  empresa: z.string().trim().toLowerCase().max(40).optional(),
  email: z.string().trim().toLowerCase().email().max(200),
  contrasena: z.string().min(1).max(200),
  volver: z.string().optional(),
});

// Mismo mensaje para empresa inexistente, usuario inexistente, contraseña mala o cuenta bloqueada: no se revela
// qué dato falló.
const GENERICO = "Empresa, correo o contraseña incorrectos.";

export async function ingresar(_: EstadoIngreso, form: FormData): Promise<EstadoIngreso> {
  const datos = Datos.safeParse({
    empresa: form.get("empresa") || undefined,
    email: form.get("email"),
    contrasena: form.get("contrasena"),
    volver: form.get("volver") || undefined,
  });
  if (!datos.success) return { error: GENERICO };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const slug = slugDeHost(h.get("host")) ?? (datos.data.empresa || process.env.CLIENTE_POR_DEFECTO || "");
  const cliente = slug ? await buscarClientePorSlug(slug).catch(() => null) : null;
  if (!cliente || cliente.estado !== "activo") return { error: GENERICO };

  const db = await abrirDb(cliente);
  const { email, contrasena } = datos.data;
  const u = await db.usuario.findUnique({ where: { email }, include: { perfil: true } });

  const registrar = (exito: boolean, motivo: string) =>
    db.registroIngreso.create({ data: { usuarioId: u?.id ?? null, email, exito, motivo, ip } });

  if (u?.bloqueadoHasta && u.bloqueadoHasta > new Date()) {
    await verificar(contrasena, null);
    await registrar(false, "bloqueado");
    return { error: GENERICO };
  }

  const correcta = await verificar(contrasena, u?.hashContrasena ?? null);
  if (!u || !u.activo || !u.perfil.activo || !correcta) {
    if (u) {
      const intentos = u.intentosFallidos + 1;
      const bloquear = intentos >= INTENTOS_MAXIMOS;
      await db.usuario.update({
        where: { id: u.id },
        data: {
          intentosFallidos: bloquear ? 0 : intentos,
          bloqueadoHasta: bloquear ? new Date(Date.now() + MINUTOS_BLOQUEO * 60_000) : undefined,
        },
      });
    }
    await registrar(false, !u ? "usuario_inexistente" : !correcta ? "contrasena" : "inactivo");
    return { error: GENERICO };
  }

  await db.usuario.update({ where: { id: u.id }, data: { intentosFallidos: 0, bloqueadoHasta: null } });
  await registrar(true, "ok");
  await crearSesion({
    usuarioId: u.id,
    clienteId: cliente.id,
    clienteSlug: cliente.slug,
    debeCambiar: u.debeCambiarContrasena,
  });
  redirect(u.debeCambiarContrasena ? "/cambiar-contrasena" : rutaInternaSegura(datos.data.volver));
}
