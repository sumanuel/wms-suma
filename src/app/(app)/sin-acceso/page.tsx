import { EncabezadoPagina, Tarjeta } from "@/components/ui";

export default function SinAcceso() {
  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina titulo="Sin acceso" descripcion="No tienes permiso para ver esta pantalla." />
      <Tarjeta className="px-6 py-12 text-center text-gris-500">Pide acceso a un administrador del sistema.</Tarjeta>
    </div>
  );
}
