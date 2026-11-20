"use client";

import { useActionState } from "react";
import { Aviso, Campo, clasesBoton } from "@/components/ui";
import { cambiarContrasena, type EstadoCambio } from "./acciones";

export function FormularioCambio() {
  const [estado, accion, pendiente] = useActionState<EstadoCambio, FormData>(cambiarContrasena, {});
  return (
    <form action={accion} className="mt-6 flex flex-col gap-4">
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      <Campo etiqueta="Contraseña actual" name="actual" type="password" autoComplete="current-password" required />
      <Campo
        etiqueta="Contraseña nueva"
        name="nueva"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        ayuda="Mínimo 10 caracteres, con letras y números."
      />
      <Campo etiqueta="Repite la contraseña nueva" name="repetida" type="password" autoComplete="new-password" required minLength={10} />
      <button type="submit" disabled={pendiente} className={clasesBoton("primario", "mt-2 w-full")}>
        {pendiente ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
