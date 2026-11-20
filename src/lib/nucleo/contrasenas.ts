import { randomBytes, scrypt as scryptCb, timingSafeEqual, type BinaryLike } from "node:crypto";

const N = 16384;
const LARGO = 64;

function scrypt(clave: string, sal: BinaryLike, n: number): Promise<Buffer> {
  return new Promise((ok, mal) =>
    scryptCb(clave, sal, LARGO, { N: n, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (e, k) => (e ? mal(e) : ok(k))),
  );
}

export async function hashear(contrasena: string): Promise<string> {
  const sal = randomBytes(16);
  const h = await scrypt(contrasena, sal, N);
  return `scrypt$${N}$${sal.toString("base64")}$${h.toString("base64")}`;
}

export async function verificar(contrasena: string, almacenado: string | null): Promise<boolean> {
  // Aun sin hash se gasta el mismo tiempo, para no revelar qué correos existen.
  if (!almacenado) {
    await scrypt(contrasena, "sin-usuario", N);
    return false;
  }
  const [tipo, n, sal, hash] = almacenado.split("$");
  if (tipo !== "scrypt" || !n || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const obtenido = await scrypt(contrasena, Buffer.from(sal, "base64"), Number(n));
  return esperado.length === obtenido.length && timingSafeEqual(esperado, obtenido);
}

/** Mínimo 10 caracteres con letras y números. Devuelve el motivo del rechazo o null si sirve. */
export function motivoContrasenaDebil(c: string): string | null {
  if (c.length < 10) return "La contraseña debe tener al menos 10 caracteres.";
  if (!/[A-Za-z]/.test(c) || !/\d/.test(c)) return "La contraseña debe mezclar letras y números.";
  return null;
}

/** Contraseña temporal legible (sin caracteres ambiguos) que cumple la política. */
export function generarTemporal(): string {
  const letras = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const numeros = "23456789";
  const bytes = randomBytes(12);
  let s = "";
  for (let i = 0; i < 12; i++) {
    const origen = i % 3 === 2 ? numeros : letras;
    s += origen[bytes[i] % origen.length];
  }
  return s;
}

export const INTENTOS_MAXIMOS = 5;
export const MINUTOS_BLOQUEO = 15;
