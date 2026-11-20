import type { ComponentProps, ReactNode } from "react";

type Variante = "primario" | "secundario" | "fantasma" | "peligro";

const variantes: Record<Variante, string> = {
  primario: "bg-marca-fuerte px-4 font-semibold text-white shadow-sm hover:brightness-95",
  secundario: "border border-borde-campo bg-white text-tinta hover:bg-hover",
  fantasma: "text-gris-700 hover:bg-hover",
  peligro: "border border-[#f3c7c7] bg-white text-error hover:bg-error-suave",
};

export const claseControl =
  "h-10 w-full rounded-[10px] border border-borde-campo bg-white px-3 text-sm text-tinta placeholder:text-gris-500 aria-invalid:border-error disabled:bg-neutro-suave disabled:text-gris-500";
// Solo para input y textarea: Chrome considera :read-only a todo select y lo pintaría de gris.
export const claseSoloLectura = "read-only:bg-neutro-suave read-only:text-gris-600";

export function clasesBoton(variante: Variante = "secundario", extra = "") {
  return `inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-[10px] px-3.5 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-50 ${variantes[variante]} ${extra}`;
}

export type Tono = "neutro" | "marca" | "exito" | "aviso" | "error";

const tonos: Record<Tono, string> = {
  neutro: "bg-neutro-suave text-gris-700",
  marca: "bg-marca-suave text-marca-texto",
  exito: "bg-exito-suave text-exito",
  aviso: "bg-aviso-suave text-aviso",
  error: "bg-error-suave text-error",
};

export function Etiqueta({ tono = "neutro", children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span className={`inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12.5px] font-medium ${tonos[tono]}`}>
      {children}
    </span>
  );
}

export function Aviso({ tono, children }: { tono: Tono; children: ReactNode }) {
  return (
    <div role={tono === "error" ? "alert" : "status"} className={`rounded-[10px] px-3.5 py-2.5 text-[13.5px] leading-snug ${tonos[tono]}`}>
      {children}
    </div>
  );
}

export function Tarjeta({ children, className = "", recortar = true, ...resto }: ComponentProps<"section"> & { recortar?: boolean }) {
  return (
    <section
      className={`${recortar ? "overflow-hidden" : ""} rounded-[14px] border border-borde bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_6px_20px_rgba(24,24,27,0.04)] ${className}`}
      {...resto}
    >
      {children}
    </section>
  );
}

export function EncabezadoPagina({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: ReactNode;
  descripcion?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{titulo}</h1>
        {descripcion ? <p className="text-sm text-gris-500">{descripcion}</p> : null}
      </div>
      {acciones ? <div className="flex flex-wrap gap-2">{acciones}</div> : null}
    </div>
  );
}

export function Campo({
  etiqueta,
  error,
  ayuda,
  id,
  name,
  className = "",
  ...resto
}: ComponentProps<"input"> & { etiqueta: string; error?: string; ayuda?: string; name: string }) {
  const idCampo = id ?? `campo-${name}`;
  const idDetalle = error || ayuda ? `${idCampo}-detalle` : undefined;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={idCampo} className="text-[13px] font-medium">
        {etiqueta}
      </label>
      <input
        id={idCampo}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={idDetalle}
        className="h-10 rounded-[10px] border border-borde-campo bg-white px-3 text-sm text-tinta placeholder:text-gris-500 read-only:bg-neutro-suave read-only:text-gris-600 aria-invalid:border-error disabled:bg-neutro-suave disabled:text-gris-500"
        {...resto}
      />
      {error ? (
        <p id={idDetalle} className="text-[12.5px] text-error">
          {error}
        </p>
      ) : ayuda ? (
        <p id={idDetalle} className="text-[12.5px] text-gris-500">
          {ayuda}
        </p>
      ) : null}
    </div>
  );
}

// Select con etiqueta, ayuda y error, como `Campo` para los input.
export function Selector({
  nombre,
  etiqueta,
  opciones,
  valor,
  error,
  ayuda,
  vacio = "Elegir…",
}: {
  nombre: string;
  etiqueta: string;
  opciones: { valor: string; etiqueta: string }[];
  valor: string;
  error?: string;
  ayuda?: string;
  vacio?: string;
}) {
  const id = `campo-${nombre}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium">
        {etiqueta}
      </label>
      <select
        id={id}
        name={nombre}
        defaultValue={valor}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? `${id}-detalle` : undefined}
        className={`${claseControl} pr-9`}
      >
        <option value="">{vacio}</option>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
      {error || ayuda ? (
        <p id={`${id}-detalle`} className={`text-[12.5px] ${error ? "text-error" : "text-gris-500"}`}>
          {error ?? ayuda}
        </p>
      ) : null}
    </div>
  );
}

const fechaHora = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export function formatearFechaHora(fecha: Date | null | undefined) {
  return fecha ? fechaHora.format(fecha) : "—";
}
