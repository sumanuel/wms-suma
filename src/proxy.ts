import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE, firmarToken, opcionesCookie, verificarToken } from "@/lib/token";
import { slugDeHost } from "@/lib/host";

// Chequeo optimista con la cookie; la validación contra la base del cliente la hace src/lib/dal.ts.
const SOLO_SIN_SESION = new Set(["/ingresar"]);
const LIBRES = new Set(["/salir", "/api/salud"]);
const SEGUNDOS_ENTRE_RENOVACIONES = 60;

export async function proxy(req: NextRequest) {
  const ruta = req.nextUrl.pathname;
  if (LIBRES.has(ruta)) return NextResponse.next();

  const token = req.cookies.get(NOMBRE_COOKIE)?.value;
  let sesion = token ? await verificarToken(token) : null;

  // Aislamiento por subdominio: una sesión de acme no vale en beta.<dominio>.
  const slugHost = slugDeHost(req.headers.get("host"));
  if (sesion && slugHost && sesion.clienteSlug !== slugHost) sesion = null;

  if (!sesion) {
    if (SOLO_SIN_SESION.has(ruta)) return NextResponse.next();
    const destino = new URL("/ingresar", req.nextUrl);
    if (ruta !== "/") destino.searchParams.set("volver", ruta + req.nextUrl.search);
    if (token) destino.searchParams.set("motivo", "vencida");
    const respuesta = NextResponse.redirect(destino);
    if (token) respuesta.cookies.delete(NOMBRE_COOKIE);
    return respuesta;
  }

  if (SOLO_SIN_SESION.has(ruta)) return NextResponse.redirect(new URL("/", req.nextUrl));
  if (sesion.debeCambiar && ruta !== "/cambiar-contrasena") {
    return NextResponse.redirect(new URL("/cambiar-contrasena", req.nextUrl));
  }

  const respuesta = NextResponse.next();
  const esPrefetch = req.headers.has("next-router-prefetch");
  if (!esPrefetch && Date.now() / 1000 - sesion.emitidoEn > SEGUNDOS_ENTRE_RENOVACIONES) {
    respuesta.cookies.set(NOMBRE_COOKIE, await firmarToken(sesion), opcionesCookie());
  }
  return respuesta;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
