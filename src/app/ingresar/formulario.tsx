"use client";

import { useActionState } from "react";
import { Aviso, Campo, clasesBoton } from "@/components/ui";
import { ingresar, type EstadoIngreso } from "./acciones";

export function FormularioIngreso({
  volver,
  pedirEmpresa,
  vencida,
}: {
  volver?: string;
  pedirEmpresa: boolean;
  vencida: boolean;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoIngreso, FormData>(ingresar, {});
  return (
    <form action={accion} className="mt-6 flex flex-col gap-4">
      {volver && <input type="hidden" name="volver" value={volver} />}
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : vencida ? <Aviso tono="aviso">Tu sesión venció. Vuelve a ingresar.</Aviso> : null}
      {pedirEmpresa && (
        <Campo etiqueta="Empresa" name="empresa" autoComplete="organization" required placeholder="Código de tu empresa" />
      )}
      <Campo etiqueta="Correo" name="email" type="email" autoComplete="username" required autoFocus />
      <Campo etiqueta="Contraseña" name="contrasena" type="password" autoComplete="current-password" required />
      <button type="submit" disabled={pendiente} className={clasesBoton("primario", "mt-2 w-full")}>
        {pendiente ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
