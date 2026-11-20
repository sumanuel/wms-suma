import type { Busqueda } from "@/lib/listados";
import { ListaAduana } from "../lista";

export default function Aduanados({ searchParams }: { searchParams: Promise<Busqueda> }) {
  return <ListaAduana valida={7} ruta="/aduana/pickeados" busqueda={searchParams} />;
}
