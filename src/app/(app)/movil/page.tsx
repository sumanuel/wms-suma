import Link from "next/link";
import { ClipboardList, Layers, Truck, PackageOpen, PackagePlus, Repeat, MapPin, ScanBarcode, Search, SlidersVertical, type LucideIcon } from "lucide-react";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";

const OPCIONES: { href: string; titulo: string; texto: string; icono: LucideIcon; modulo: string; accion: "ver" | "editar" | "crear" }[] = [
  { href: "/movil/consulta", titulo: "Consultas rápidas", texto: "Caja, ubicación, artículo o pallet.", icono: Search, modulo: "inventario", accion: "ver" },
  { href: "/movil/recepcion", titulo: "Recibir", texto: "Recibir mercancía contra una orden de compra.", icono: PackageOpen, modulo: "inventario", accion: "crear" },
  { href: "/movil/almacenar", titulo: "Almacenar", texto: "Guardar cajas del recibo donde se sugiere.", icono: PackagePlus, modulo: "inventario", accion: "editar" },
  { href: "/movil/resurtido", titulo: "Resurtido", texto: "Reponer las ubicaciones de picking.", icono: Repeat, modulo: "inventario", accion: "editar" },
  { href: "/movil/ubicar", titulo: "Ubicar caja", texto: "Llevar una caja a otra ubicación.", icono: MapPin, modulo: "inventario", accion: "editar" },
  { href: "/movil/pallet", titulo: "Pallets", texto: "Agregar cajas y ubicar pallets.", icono: Layers, modulo: "pallets", accion: "editar" },
  { href: "/movil/despacho", titulo: "Pallets de despacho", texto: "Cargar cajas al pallet leyendo su SSCC.", icono: Truck, modulo: "pallets", accion: "editar" },
  { href: "/movil/picking", titulo: "Picking", texto: "Pickear por ruta leyendo la caja.", icono: ScanBarcode, modulo: "prepacking", accion: "editar" },
  { href: "/movil/conteo", titulo: "Conteo", texto: "Contar cajas de un conteo abierto.", icono: ClipboardList, modulo: "conteo", accion: "editar" },
  { href: "/movil/ajuste", titulo: "Ajuste de caja", texto: "Corregir el saldo de una caja.", icono: SlidersVertical, modulo: "inventario", accion: "editar" },
];

export default async function Movil() {
  const ctx = await requerirPermiso("movil", "ver");
  const visibles = OPCIONES.filter((o) => tienePermiso(ctx, o.modulo, o.accion));
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Terminal móvil</h1>
        <p className="text-sm text-gris-500">Pantallas grandes para el lector de código de barras: lee, confirma y sigue.</p>
      </div>
      {visibles.length === 0 ? <p className="text-sm text-gris-500">Tu perfil no tiene operaciones de bodega habilitadas.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {visibles.map((o) => (
          <Link key={o.href} href={o.href} className="block">
            <Tarjeta className="flex h-full items-center gap-4 p-4 transition hover:bg-hover">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-marca-suave text-marca-texto"><o.icono className="size-6" aria-hidden /></span>
              <span className="flex flex-col"><span className="text-base font-bold">{o.titulo}</span><span className="text-[13px] text-gris-500">{o.texto}</span></span>
            </Tarjeta>
          </Link>
        ))}
      </div>
    </div>
  );
}
