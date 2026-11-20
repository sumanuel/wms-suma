"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Columns3 } from "lucide-react";
import { clasesBoton } from "@/components/ui";
import { nombreCookieColumnas, type Opcion } from "@/lib/listados";

// Arma la URL sin los campos vacíos; sin JavaScript queda el GET nativo del formulario.
export function FormularioListado({ ruta, className, children }: { ruta: string; className: string; children: ReactNode }) {
  const router = useRouter();
  return (
    <form
      action={ruta}
      role="search"
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        for (const [nombre, valor] of new FormData(e.currentTarget)) {
          if (typeof valor === "string" && valor.trim()) params.set(nombre, valor.trim());
        }
        const consulta = params.toString();
        router.push(consulta ? `${ruta}?${consulta}` : ruta, { scroll: false });
      }}
    >
      {children}
    </form>
  );
}

export function SelectFiltro({
  id,
  etiqueta,
  valor,
  opciones,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: Opcion[];
}) {
  return (
    <>
      <label htmlFor={`filtro-${id}`} className="sr-only">
        {etiqueta}
      </label>
      <select
        id={`filtro-${id}`}
        name={id}
        defaultValue={valor}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-10 max-w-[240px] rounded-[10px] border border-borde-campo bg-white pr-9 pl-3 text-sm"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.etiqueta}
          </option>
        ))}
      </select>
    </>
  );
}

const ANCHO_MENU = 256;

function Desplegable({
  etiqueta,
  icono,
  children,
}: {
  etiqueta: string;
  icono: ReactNode;
  children: (cerrar: () => void) => ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const [alinearIzquierda, setAlinearIzquierda] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alTocarFuera = (e: PointerEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", alTocarFuera);
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("pointerdown", alTocarFuera);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [abierto]);

  return (
    <div ref={contenedor} className="relative">
      <button
        type="button"
        onClick={(e) => {
          // En celular el botón puede quedar a la izquierda y el menú, alineado a su derecha, se saldría de la pantalla.
          setAlinearIzquierda(e.currentTarget.getBoundingClientRect().right < ANCHO_MENU + 16);
          setAbierto((v) => !v);
        }}
        aria-expanded={abierto}
        className={clasesBoton("secundario")}
      >
        {icono}
        {etiqueta}
        <ChevronDown className={`size-4 text-gris-500 transition-transform ${abierto ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {abierto ? (
        <div
          style={{ width: ANCHO_MENU }}
          className={`absolute top-full ${alinearIzquierda ? "left-0" : "right-0"} z-30 mt-2 max-h-[min(28rem,70vh)] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-borde bg-white p-1.5 shadow-[0_8px_24px_rgba(24,24,27,0.12)]`}
        >
          {children(() => setAbierto(false))}
        </div>
      ) : null}
    </div>
  );
}

// Cookie y no localStorage: el servidor la lee para dibujar y exportar solo las columnas elegidas.
function guardarColumnas(listado: string, ids: string[] | null) {
  const nombre = nombreCookieColumnas(listado);
  document.cookie = ids
    ? `${nombre}=${ids.join(",")}; path=/; max-age=31536000; samesite=lax`
    : `${nombre}=; path=/; max-age=0; samesite=lax`;
}

export function ElegirColumnas({
  listado,
  columnas,
  visibles,
}: {
  listado: string;
  columnas: { id: string; titulo: string; fija: boolean }[];
  visibles: string[];
}) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  const [marcadas, marcar] = useOptimistic(visibles);

  function guardar(ids: string[] | null) {
    guardarColumnas(listado, ids);
    iniciar(() => {
      if (ids) marcar(ids);
      router.refresh();
    });
  }

  function alternar(id: string) {
    const elegidas = new Set(marcadas);
    if (elegidas.has(id)) elegidas.delete(id);
    else elegidas.add(id);
    guardar(columnas.filter((c) => c.fija || elegidas.has(c.id)).map((c) => c.id));
  }

  return (
    <Desplegable etiqueta="Columnas" icono={<Columns3 className="size-[17px] text-gris-500" strokeWidth={1.8} aria-hidden />}>
      {() => (
        <div className="flex flex-col">
          <p className="px-2.5 pt-1.5 pb-2 text-xs font-medium text-gris-500">Columnas visibles</p>
          {columnas.map((c) => {
            const marcada = c.fija || marcadas.includes(c.id);
            const ultima = marcada && marcadas.length === 1;
            return (
              <label
                key={c.id}
                className={`flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm ${c.fija || ultima ? "text-gris-500" : "cursor-pointer hover:bg-hover"}`}
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  disabled={c.fija || ultima}
                  onChange={() => alternar(c.id)}
                  className="size-4 accent-marca-fuerte"
                />
                {c.titulo}
              </label>
            );
          })}
          <button
            type="button"
            onClick={() => guardar(null)}
            className="mt-1 flex h-10 items-center rounded-lg border-t border-linea px-2.5 text-left text-sm font-medium text-gris-700 hover:bg-hover"
          >
            Restablecer columnas
          </button>
        </div>
      )}
    </Desplegable>
  );
}

