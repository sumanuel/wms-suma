import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { NOMBRE_COOKIE, firmarToken, opcionesCookie, verificarToken, type Sesion } from "./token";

export async function crearSesion(datos: { usuarioId: string; clienteId: string; clienteSlug: string; debeCambiar: boolean }) {
  // Hacia arriba: la sesión nueva tiene que quedar posterior a un cambio de contraseña del mismo segundo.
  const inicio = Math.ceil(Date.now() / 1000);
  const token = await firmarToken({ ...datos, inicio });
  (await cookies()).set(NOMBRE_COOKIE, token, opcionesCookie());
}

export async function cerrarSesion() {
  (await cookies()).delete(NOMBRE_COOKIE);
}

export async function leerSesion(): Promise<Sesion | null> {
  await connection();
  const token = (await cookies()).get(NOMBRE_COOKIE)?.value;
  return token ? verificarToken(token) : null;
}
