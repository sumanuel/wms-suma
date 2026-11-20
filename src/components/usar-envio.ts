"use client";

import { useState, useTransition, type FormEvent } from "react";

// Envío de un formulario a una acción del servidor SIN el reinicio automático de React 19.
//
// Con `<form action={…}>`, React vacía los campos no controlados cuando la acción termina, incluso si falló: quien se equivoca
// pierde lo que escribió (en una tabla de 100 cantidades, todo). Aquí el formulario se envía con `onSubmit`, así los campos
// conservan lo escrito; solo se limpian si se pide (`limpiarSiExito`) y la acción tuvo éxito.
export function useEnvio<E extends { error?: string }>(
  accion: (previo: E, form: FormData) => Promise<E>,
  inicial: E,
  opciones: { limpiarSiExito?: boolean } = {},
) {
  const [estado, setEstado] = useState<E>(inicial);
  const [pendiente, iniciar] = useTransition();

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formulario = e.currentTarget;
    const datos = new FormData(formulario);
    iniciar(async () => {
      const r = await accion(estado, datos);
      setEstado(r);
      if (opciones.limpiarSiExito && !r.error) formulario.reset();
    });
  }

  return { estado, pendiente, enviar };
}
