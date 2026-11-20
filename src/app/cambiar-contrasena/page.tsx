import type { Metadata } from "next";
import { PantallaAcceso } from "@/components/pantalla-acceso";
import { requerirSesion } from "@/lib/dal";
import { FormularioCambio } from "./formulario";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default async function PaginaCambiarContrasena() {
  const { usuario } = await requerirSesion();
  return (
    <PantallaAcceso
      pie={
        // eslint-disable-next-line @next/next/no-html-link-for-pages -- /salir borra la cookie: sin prefetch
        <a href="/salir" className="font-medium hover:underline">
          Salir
        </a>
      }
    >
      <h1 className="mt-8 text-2xl font-semibold tracking-[-0.02em]">Cambiar contraseña</h1>
      <p className="mt-1 text-sm text-gris-500">
        {usuario.debeCambiarContrasena ? "Debes elegir una contraseña propia antes de continuar." : usuario.email}
      </p>
      <FormularioCambio />
    </PantallaAcceso>
  );
}
