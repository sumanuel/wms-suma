"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Ellipsis, KeyRound, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { Marca, MarcaCompacta } from "@/components/marca";
import { areaDe, estaActivo, inicio, type AreaMenu, type ItemMenu } from "@/lib/menu";
import { iconos } from "./iconos";

type Usuario = { nombre: string; email: string | null };

export function MenuCliente({
  areas,
  usuario,
  contraidoInicial,
  empresa,
}: {
  areas: AreaMenu[];
  usuario: Usuario;
  contraidoInicial: boolean;
  empresa: string;
}) {
  const ruta = usePathname();
  const [contraido, setContraido] = useState(contraidoInicial);
  const [abierto, setAbierto] = useState(false);
  const [areaAbierta, setAreaAbierta] = useState(() => areaDe(ruta)?.id ?? null);
  const [rutaVista, setRutaVista] = useState(ruta);

  // Durante el render y no en un efecto: así el área de la pantalla nueva ya aparece abierta en el primer cuadro.
  if (ruta !== rutaVista) {
    setRutaVista(ruta);
    const area = areaDe(ruta);
    if (area) setAreaAbierta(area.id);
  }

  useEffect(() => {
    if (!abierto) return;
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [abierto]);

  function alternar() {
    const valor = !contraido;
    setContraido(valor);
    // Cookie y no localStorage: el servidor la lee y dibuja el menú contraído desde el primer render.
    document.cookie = `menu_contraido=${valor ? 1 : 0}; path=/; max-age=31536000; samesite=lax`;
  }

  function alternarArea(id: string) {
    setAreaAbierta((actual) => (actual === id ? null : id));
  }

  const comunes = { areas, usuario, ruta, areaAbierta, alternarArea };

  return (
    <>
      <aside
        aria-label="Menú principal"
        className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-borde bg-white py-[18px] lg:flex print:!hidden ${contraido ? "w-[76px] px-3" : "w-[268px] px-3.5"}`}
      >
        <ContenidoMenu
          // La clave descarta el panel flotante que quedara abierto al contraer o expandir.
          key={contraido ? "contraido" : "expandido"}
          {...comunes}
          contraido={contraido}
          cabecera={
            contraido ? (
              <div className="flex flex-col items-center gap-2.5">
                <MarcaCompacta />
                <BotonIcono etiqueta="Expandir menú" onClick={alternar}>
                  <PanelLeftOpen className="size-[18px]" strokeWidth={1.8} aria-hidden />
                </BotonIcono>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 pl-1.5">
                <Marca subtitulo={empresa} />
                <BotonIcono etiqueta="Contraer menú" onClick={alternar}>
                  <PanelLeftClose className="size-[18px]" strokeWidth={1.8} aria-hidden />
                </BotonIcono>
              </div>
            )
          }
        />
      </aside>

      <header className="sticky top-0 z-30 flex h-[60px] print:hidden items-center gap-2 border-b border-borde bg-white px-2 lg:hidden">
        <BotonIcono etiqueta="Abrir menú" onClick={() => setAbierto(true)} grande>
          <Menu className="size-[22px]" strokeWidth={1.8} aria-hidden />
        </BotonIcono>
        <Marca className="[&>span:first-child]:text-2xl [&>span:last-child]:hidden" />
      </header>

      {abierto ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div aria-hidden="true" className="absolute inset-0 bg-tinta/40" onClick={() => setAbierto(false)} />
          <aside
            aria-label="Menú principal"
            className="absolute inset-y-0 left-0 flex w-[312px] max-w-[85vw] flex-col rounded-r-[18px] bg-white px-3 py-3.5 shadow-[8px_0_32px_rgba(24,24,27,0.18)]"
          >
            <ContenidoMenu
              {...comunes}
              contraido={false}
              tactil
              alNavegar={() => setAbierto(false)}
              cabecera={
                <div className="flex items-center justify-between pl-1.5">
                  <Marca subtitulo={empresa} />
                  <BotonIcono etiqueta="Cerrar menú" onClick={() => setAbierto(false)} grande>
                    <X className="size-5" strokeWidth={1.8} aria-hidden />
                  </BotonIcono>
                </div>
              }
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function ContenidoMenu({
  areas,
  usuario,
  ruta,
  areaAbierta,
  alternarArea,
  contraido,
  tactil = false,
  cabecera,
  alNavegar,
}: {
  areas: AreaMenu[];
  usuario: Usuario;
  ruta: string;
  areaAbierta: string | null;
  alternarArea: (id: string) => void;
  contraido: boolean;
  tactil?: boolean;
  cabecera: ReactNode;
  alNavegar?: () => void;
}) {
  const [flotante, setFlotante] = useState<string | null>(null);
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!flotante) return;
    const alTocarFuera = (e: PointerEvent) => {
      if (!nav.current?.contains(e.target as Node)) setFlotante(null);
    };
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && setFlotante(null);
    document.addEventListener("pointerdown", alTocarFuera);
    document.addEventListener("keydown", alPresionar);
    return () => {
      document.removeEventListener("pointerdown", alTocarFuera);
      document.removeEventListener("keydown", alPresionar);
    };
  }, [flotante]);

  function alElegir() {
    setFlotante(null);
    alNavegar?.();
  }

  function area(a: AreaMenu) {
    return (
      <Area
        key={a.id}
        area={a}
        ruta={ruta}
        contraido={contraido}
        tactil={tactil}
        abierta={areaAbierta === a.id}
        flotante={flotante === a.id}
        alAlternar={() => (contraido ? setFlotante((actual) => (actual === a.id ? null : a.id)) : alternarArea(a.id))}
        alElegir={alElegir}
      />
    );
  }

  const alPie = areas.filter((a) => a.alPie);

  return (
    <>
      {cabecera}
      {/* Contraído no hay desplazamiento: overflow recortaría el panel flotante, y las áreas entran sin él. */}
      <nav
        ref={nav}
        aria-label="Módulos"
        className={`-mx-1 mt-6 flex flex-1 flex-col px-1 pb-3 ${contraido ? "" : "overflow-y-auto"}`}
      >
        <div className="flex flex-col gap-1">
          <EnlaceMenu item={inicio} ruta={ruta} contraido={contraido} tactil={tactil} alElegir={alElegir} />
          {areas.filter((a) => !a.alPie).map(area)}
        </div>
        {alPie.length > 0 ? (
          <div className="mt-auto pt-4">
            <div className="flex flex-col gap-1 border-t border-linea pt-3">{alPie.map(area)}</div>
          </div>
        ) : null}
      </nav>
      <MenuUsuario usuario={usuario} contraido={contraido} />
    </>
  );
}

function EnlaceMenu({
  item,
  ruta,
  contraido,
  tactil,
  alElegir,
}: {
  item: ItemMenu;
  ruta: string;
  contraido: boolean;
  tactil: boolean;
  alElegir: () => void;
}) {
  const activo = estaActivo(item.href, ruta);
  const Icono = iconos[item.icono];
  return (
    <Link
      href={item.href}
      onClick={alElegir}
      aria-current={activo ? "page" : undefined}
      title={contraido ? item.etiqueta : undefined}
      className={`flex items-center gap-3 rounded-[9px] ${tactil ? "h-12" : "h-11"} ${contraido ? "justify-center" : "px-3"} ${activo ? "bg-marca-suave font-semibold text-marca-texto" : "font-medium text-gris-700 hover:bg-hover hover:text-tinta"}`}
    >
      <Icono className={`size-[18px] shrink-0 ${activo ? "text-marca" : "text-gris-500"}`} strokeWidth={1.8} aria-hidden />
      {contraido ? <span className="sr-only">{item.etiqueta}</span> : <span className="truncate">{item.etiqueta}</span>}
    </Link>
  );
}

function Area({
  area,
  ruta,
  contraido,
  tactil,
  abierta,
  flotante,
  alAlternar,
  alElegir,
}: {
  area: AreaMenu;
  ruta: string;
  contraido: boolean;
  tactil: boolean;
  abierta: boolean;
  flotante: boolean;
  alAlternar: () => void;
  alElegir: () => void;
}) {
  const Icono = iconos[area.icono];
  const contiene = area.items.some((i) => estaActivo(i.href, ruta));
  const desplegada = !contraido && abierta;
  // Un área cerrada que contiene la pantalla actual se marca entera, para no perder la ubicación.
  const marcada = contiene && !desplegada;
  const idLista = `${contraido ? "flotante" : "area"}-${area.id}`;

  return (
    <div className="relative flex flex-col">
      <button
        type="button"
        onClick={alAlternar}
        aria-expanded={contraido ? flotante : abierta}
        aria-controls={idLista}
        title={contraido ? area.etiqueta : undefined}
        className={`flex w-full items-center gap-3 rounded-[9px] text-left ${tactil ? "h-12" : "h-11"} ${contraido ? "justify-center" : "pr-2.5 pl-3"} ${marcada ? "bg-marca-suave font-semibold text-marca-texto" : contiene ? "font-semibold text-tinta hover:bg-hover" : "font-medium text-gris-700 hover:bg-hover hover:text-tinta"}`}
      >
        <Icono className={`size-[18px] shrink-0 ${contiene ? "text-marca" : "text-gris-500"}`} strokeWidth={1.8} aria-hidden />
        {contraido ? (
          <span className="sr-only">{area.etiqueta}</span>
        ) : (
          <>
            <span className="flex-1 truncate">{area.etiqueta}</span>
            <ChevronRight
              className={`size-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${abierta ? "rotate-90" : ""} ${marcada ? "text-marca-texto" : "text-[#8a8a92]"}`}
              strokeWidth={2}
              aria-hidden
            />
          </>
        )}
      </button>

      {desplegada ? (
        <ul id={idLista} className="mt-1 mb-2 ml-5 flex flex-col gap-0.5 border-l-2 border-borde">
          {area.items.map((item) => {
            const activo = estaActivo(item.href, ruta);
            return (
              <li key={item.href} className="flex">
                <Link
                  href={item.href}
                  onClick={alElegir}
                  aria-current={activo ? "page" : undefined}
                  className={`-ml-0.5 flex min-w-0 flex-1 items-center rounded-r-lg border-l-2 bg-clip-padding pr-2.5 pl-5 text-[13.5px] ${tactil ? "h-11" : "h-10"} ${activo ? "border-marca bg-marca-suave font-semibold text-marca-texto" : "border-transparent font-medium text-gris-700 hover:bg-hover hover:text-tinta"}`}
                >
                  <span className="truncate">{item.etiqueta}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {contraido && flotante ? (
        <div
          id={idLista}
          className={`absolute left-[calc(100%+20px)] z-50 w-60 rounded-xl border border-borde bg-white p-2 shadow-[0_12px_32px_rgba(24,24,27,0.14)] ${area.alPie ? "-bottom-2" : "-top-2"}`}
        >
          <div className="px-2.5 pt-1.5 pb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-gris-500">
            {area.etiqueta}
          </div>
          <ul className="flex flex-col gap-0.5">
            {area.items.map((item) => {
              const activo = estaActivo(item.href, ruta);
              return (
                <li key={item.href} className="flex">
                  <Link
                    href={item.href}
                    onClick={alElegir}
                    aria-current={activo ? "page" : undefined}
                    className={`flex h-10 flex-1 items-center rounded-lg px-2.5 text-[13.5px] ${activo ? "bg-marca-suave font-semibold text-marca-texto" : "font-medium text-gris-700 hover:bg-hover hover:text-tinta"}`}
                  >
                    {item.etiqueta}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function MenuUsuario({ usuario, contraido }: { usuario: Usuario; contraido: boolean }) {
  const [abierto, setAbierto] = useState(false);
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

  const iniciales = usuario.nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

  return (
    <div ref={contenedor} className="relative border-t border-linea pt-3">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-haspopup="menu"
        className={`flex w-full items-center gap-2.5 rounded-[10px] p-1.5 text-left hover:bg-hover ${contraido ? "justify-center" : ""}`}
      >
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-marca-suave text-[13px] font-semibold text-marca-texto"
        >
          {iniciales.length > 1 ? iniciales : usuario.nombre.slice(0, 2).toUpperCase()}
        </span>
        {contraido ? (
          <span className="sr-only">Opciones de {usuario.nombre}</span>
        ) : (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{usuario.nombre}</span>
              {usuario.email ? <span className="truncate text-xs text-gris-500">{usuario.email}</span> : null}
            </span>
            <Ellipsis className="size-[18px] shrink-0 text-gris-500" aria-hidden />
          </>
        )}
      </button>
      {abierto ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border border-borde bg-white p-1.5 shadow-[0_8px_24px_rgba(24,24,27,0.12)]"
        >
          <Link
            role="menuitem"
            href="/cambiar-contrasena"
            className="flex h-10 items-center gap-2.5 rounded-lg px-2.5 font-medium text-gris-700 hover:bg-hover"
          >
            <KeyRound className="size-4 text-gris-500" aria-hidden />
            Cambiar contraseña
          </Link>
          {/* <a> a propósito: /salir borra la cookie y un <Link> la prefetchearía. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            role="menuitem"
            href="/salir"
            className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left font-medium text-gris-700 hover:bg-hover"
          >
            <LogOut className="size-4 text-gris-500" aria-hidden />
            Cerrar sesión
          </a>
        </div>
      ) : null}
    </div>
  );
}

function BotonIcono({
  etiqueta,
  onClick,
  grande,
  children,
}: {
  etiqueta: string;
  onClick: () => void;
  grande?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className={`flex shrink-0 items-center justify-center rounded-[9px] text-gris-500 hover:bg-hover hover:text-tinta ${grande ? "size-11" : "size-9"}`}
    >
      {children}
    </button>
  );
}
