import { SignJWT, jwtVerify } from "jose";

export const NOMBRE_COOKIE = "wms_sesion";
const MINUTOS_INACTIVIDAD = 30;
const HORAS_MAXIMO = 12;

export type Sesion = {
  usuarioId: string;
  clienteId: string;
  clienteSlug: string;
  /** Segundo (epoch) en que empezó la sesión; no cambia al renovar la cookie. */
  inicio: number;
  debeCambiar: boolean;
  /** Segundo (epoch) de la última renovación. */
  emitidoEn: number;
};

function clave() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET falta o es muy corta (npm run local:preparar)");
  return new TextEncoder().encode(s);
}

export async function firmarToken(s: Omit<Sesion, "emitidoEn"> | Sesion): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  const { usuarioId, clienteId, clienteSlug, inicio, debeCambiar } = s;
  return new SignJWT({ usuarioId, clienteId, clienteSlug, inicio, debeCambiar })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(ahora)
    .setExpirationTime(ahora + MINUTOS_INACTIVIDAD * 60)
    .sign(clave());
}

export async function verificarToken(token: string): Promise<Sesion | null> {
  try {
    const { payload } = await jwtVerify(token, clave(), { algorithms: ["HS256"] });
    const p = payload as Record<string, unknown>;
    if (
      typeof p.usuarioId !== "string" ||
      typeof p.clienteId !== "string" ||
      typeof p.clienteSlug !== "string" ||
      typeof p.inicio !== "number" ||
      typeof p.iat !== "number"
    ) {
      return null;
    }
    if (Date.now() / 1000 - p.inicio > HORAS_MAXIMO * 3600) return null;
    return {
      usuarioId: p.usuarioId,
      clienteId: p.clienteId,
      clienteSlug: p.clienteSlug,
      inicio: p.inicio,
      debeCambiar: p.debeCambiar === true,
      emitidoEn: p.iat,
    };
  } catch {
    return null;
  }
}

export function opcionesCookie() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MINUTOS_INACTIVIDAD * 60,
  };
}
