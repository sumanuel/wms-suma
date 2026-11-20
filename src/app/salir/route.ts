import { NextResponse, type NextRequest } from "next/server";
import { NOMBRE_COOKIE } from "@/lib/token";

// Cierra la sesión (también la usan dal.ts y el menú cuando la sesión deja de valer).
export async function GET(req: NextRequest) {
  const respuesta = NextResponse.redirect(new URL("/ingresar", req.nextUrl));
  respuesta.cookies.delete(NOMBRE_COOKIE);
  return respuesta;
}
