// Marca del sistema. Es solo texto: cuando haya un logo propio, se cambia aquí y se ve en el menú y en el ingreso.
export const NOMBRE_SISTEMA = "WMS";
export const SUBTITULO_SISTEMA = "Gestión de bodega";

export function Marca({ className = "", subtitulo = SUBTITULO_SISTEMA }: { className?: string; subtitulo?: string }) {
  return (
    <span className={`flex flex-col leading-none ${className}`}>
      <span className="text-[30px] font-extrabold tracking-[-0.03em] text-marca">{NOMBRE_SISTEMA}</span>
      <span className="mt-1 max-w-[170px] truncate text-[12.5px] font-medium text-gris-500">{subtitulo}</span>
    </span>
  );
}

export function MarcaCompacta() {
  return (
    <span className="flex size-10 items-center justify-center rounded-[11px] bg-marca text-xl font-bold text-white">
      <span aria-hidden="true">W</span>
      <span className="sr-only">{NOMBRE_SISTEMA}</span>
    </span>
  );
}
