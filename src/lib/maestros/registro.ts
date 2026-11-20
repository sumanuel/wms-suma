import type { Maestro, ModuloMaestros } from "./tipos";
import { bodegas } from "./bodegas";
import { cajas } from "./cajas";
import { clientes, sedes } from "./terceros";
import { tarifas, transportadores } from "./transporte";
import { existenciasUbicacion, ubicaciones, ubicacionesFijas } from "./ubicaciones";

// Módulos cuyas pantallas las arma el motor de maestros. La primera sección de cada módulo es la que se abre en /<módulo>;
// las demás van en /<módulo>/<slug>. Un módulo que no esté aquí muestra la pantalla "en construcción".
export const modulosMaestros: ModuloMaestros[] = [
  { modulo: "bodegas", secciones: [{ slug: "", titulo: "Bodegas", maestro: bodegas }] },
  {
    modulo: "ubicaciones",
    secciones: [
      { slug: "", titulo: "Ubicaciones", maestro: ubicaciones },
      { slug: "fijas", titulo: "Ubicaciones fijas", maestro: ubicacionesFijas },
      { slug: "existencias", titulo: "Existencias por ubicación", maestro: existenciasUbicacion },
    ],
  },
  {
    modulo: "terceros",
    secciones: [
      { slug: "", titulo: "Clientes", maestro: clientes },
      { slug: "sedes", titulo: "Sedes y proveedores", maestro: sedes },
    ],
  },
  { modulo: "cajas", secciones: [{ slug: "", titulo: "Tipos de caja", maestro: cajas }] },
  {
    modulo: "transporte",
    secciones: [
      { slug: "", titulo: "Transportadores", maestro: transportadores },
      { slug: "tarifas", titulo: "Tarifas", maestro: tarifas },
    ],
  },
];

export function buscarModulo(modulo: string) {
  return modulosMaestros.find((m) => m.modulo === modulo) ?? null;
}

export function buscarMaestro(id: string): Maestro | null {
  for (const mod of modulosMaestros) for (const s of mod.secciones) if (s.maestro.id === id) return s.maestro;
  return null;
}
