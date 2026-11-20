import { Ubicacion } from "./ubicacion";

export function BarraSuperior() {
  return (
    <div className="hidden min-h-16 items-center justify-between gap-4 border-b border-borde bg-white px-8 lg:flex print:!hidden">
      <Ubicacion />
    </div>
  );
}
