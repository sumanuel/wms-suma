import type { Busqueda } from "@/lib/listados";
import { ListaPrepacking } from "../lista";

export default function Pickeados({ searchParams }: { searchParams: Promise<Busqueda> }) {
  return <ListaPrepacking valida={5} ruta="/prepacking/pickeados" busqueda={searchParams} />;
}
