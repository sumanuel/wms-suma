// Cliente que indica el host de la petición: acme.localhost:3000 o acme.<DOMINIO_BASE> → "acme".
// Sin subdominio devuelve null y el cliente sale del formulario de ingreso o de CLIENTE_POR_DEFECTO.

const RESERVADOS = new Set(["www", "app", "admin", "api"]);

export function slugDeHost(hostConPuerto: string | null | undefined): string | null {
  if (!hostConPuerto) return null;
  const host = hostConPuerto.split(":")[0].toLowerCase();
  const base = process.env.DOMINIO_BASE?.toLowerCase();
  let etiqueta: string | null = null;
  if (host.endsWith(".localhost")) etiqueta = host.slice(0, -".localhost".length);
  else if (base && host.endsWith(`.${base}`)) etiqueta = host.slice(0, -(base.length + 1));
  if (!etiqueta || etiqueta.includes(".") || RESERVADOS.has(etiqueta)) return null;
  return /^[a-z][a-z0-9_]{2,30}$/.test(etiqueta) ? etiqueta : null;
}

/** Solo rutas internas: evita redirecciones abiertas desde ?volver= */
export function rutaInternaSegura(ruta: string | null | undefined): string {
  if (!ruta || !ruta.startsWith("/") || ruta.startsWith("//") || ruta.startsWith("/\\")) return "/";
  return ruta;
}
