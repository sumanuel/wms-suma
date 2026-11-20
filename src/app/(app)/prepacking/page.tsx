import type { Busqueda } from "@/lib/listados";
import { ListaPrepacking } from "./lista";

export default function PorPickear({ searchParams }: { searchParams: Promise<Busqueda> }) {
  return <ListaPrepacking valida={3} ruta="/prepacking" busqueda={searchParams} />;
}
