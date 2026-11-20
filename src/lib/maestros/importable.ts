import type { Maestro } from "./tipos";
import { modulosMaestros } from "./registro";
import { articulosImportable, referenciasImportable } from "./articulos";

// Maestros que se pueden cargar desde una planilla: los del motor de maestros (menos los de solo consulta) y los artículos.
export const IMPORTABLES: Maestro[] = [
  ...modulosMaestros.flatMap((m) => m.secciones.map((s) => s.maestro)).filter((m) => !m.soloConsulta),
  articulosImportable,
  referenciasImportable,
];

export function buscarImportable(id: string) {
  return IMPORTABLES.find((m) => m.id === id) ?? null;
}
