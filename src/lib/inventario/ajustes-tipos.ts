// Opciones del ajuste manual, compartidas entre el servidor y el formulario.
export const MOTIVOS = ["Faltante de inventario", "Sobrante de inventario", "Daño o avería", "Baja por vencimiento", "Error de registro", "Otro"] as const;
export type Motivo = (typeof MOTIVOS)[number];
export const MODOS = { fijar: "Fijar el saldo en", sumar: "Sumar", restar: "Restar" } as const;
export type Modo = keyof typeof MODOS;
