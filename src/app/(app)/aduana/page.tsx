import type { Busqueda } from "@/lib/listados";
import { ListaAduana } from "./lista";

export default function PorAduanar({ searchParams }: { searchParams: Promise<Busqueda> }) {
  return <ListaAduana valida={5} ruta="/aduana" busqueda={searchParams} />;
}
