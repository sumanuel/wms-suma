import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM para las credenciales de cada cliente guardadas en wms_control.
// Formato: v1:<iv>:<tag>:<texto cifrado>, todo en base64.

function clave(): Buffer {
  const b64 = process.env.CONTROL_CLAVE_MAESTRA;
  if (!b64) throw new Error("Falta CONTROL_CLAVE_MAESTRA (ejecute npm run local:preparar)");
  const k = Buffer.from(b64, "base64");
  if (k.length !== 32) throw new Error("CONTROL_CLAVE_MAESTRA debe ser de 32 bytes en base64");
  return k;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", clave(), iv);
  const datos = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return ["v1", iv.toString("base64"), c.getAuthTag().toString("base64"), datos.toString("base64")].join(":");
}

export function descifrar(valor: string): string {
  const [version, iv, tag, datos] = valor.split(":");
  if (version !== "v1" || !iv || !tag || !datos) throw new Error("Formato de credencial no reconocido");
  const d = createDecipheriv("aes-256-gcm", clave(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(datos, "base64")), d.final()]).toString("utf8");
}
