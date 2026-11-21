import { notFound } from "next/navigation";
import { Aviso, Tarjeta, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { detallePalletDespacho } from "@/lib/pallets/despacho";
import { reabrir } from "../../../pallets/despacho/acciones";
import { cargarCajaDespacho, cerrarPalletMovil, sacarCajaDespacho } from "../../acciones";
import { CabeceraMovil } from "../../cabecera";
import { Escaner } from "../../escaner";

const ESTADO = { abierto: "Abierto", cerrado: "Cerrado", despachado: "Despachado" } as const;

export default async function PalletDespachoMovil({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requerirPermiso("pallets", "editar");
  const { id: t } = await params;
  if (!/^\d{1,9}$/.test(t)) notFound();
  const id = Number(t);
  const d = await detallePalletDespacho(ctx.db, id);
  if (!d) notFound();
  const estado = d.pallet.estado as keyof typeof ESTADO;
  const cargar = cargarCajaDespacho.bind(null, id);
  const sacar = sacarCajaDespacho.bind(null, id);
  const cerrar = cerrarPalletMovil.bind(null, id);
  async function abrir() {
    "use server";
    await reabrir(id);
  }
  return (
    <>
      <CabeceraMovil titulo={`Pallet ${id}`} texto={`${ESTADO[estado] ?? estado} · bodega ${d.pallet.bodega}`} volver="/movil/despacho" />
      <Tarjeta className="flex items-baseline justify-between p-4">
        <span className="text-sm text-gris-500">Cajas cargadas</span>
        <span className="text-4xl font-extrabold tabular-nums">{d.totales.cajas}</span>
      </Tarjeta>
      {estado === "abierto" ? (
        <>
          {tienePermiso(ctx, "pallets", "crear") ? (
            <Tarjeta className="flex flex-col gap-3 p-4">
              <h2 className="text-base font-bold">Cargar caja</h2>
              <Escaner accion={cargar} boton="Cargar" campos={[{ name: "sscc", etiqueta: "Lee el SSCC de la caja", inputMode: "numeric" }]} />
            </Tarjeta>
          ) : null}
          <Tarjeta className="flex flex-col gap-3 p-4">
            <h2 className="text-base font-bold">Sacar caja</h2>
            <Escaner accion={sacar} boton="Sacar" campos={[{ name: "sscc", etiqueta: "Lee el SSCC de la caja", inputMode: "numeric" }]} />
          </Tarjeta>
          <Tarjeta className="flex flex-col gap-3 p-4">
            <h2 className="text-base font-bold">Cerrar pallet</h2>
            <Escaner accion={cerrar} boton="Cerrar pallet" campos={[{ name: "peso", etiqueta: "Peso en kg (opcional)", inputMode: "decimal", opcional: true, ayuda: "Si lo dejas vacío se usa la suma del peso empacado." }]} />
          </Tarjeta>
        </>
      ) : estado === "cerrado" ? (
        <Tarjeta className="flex flex-col gap-3 p-4">
          <Aviso tono="aviso">El pallet está cerrado: ya no recibe cajas.</Aviso>
          <form action={abrir}><button type="submit" className={clasesBoton("secundario", "h-12 w-full text-base")}>Volver a abrir</button></form>
        </Tarjeta>
      ) : <Aviso tono="aviso">El pallet ya fue despachado.</Aviso>}
      {d.pickings.length > 0 ? (
        <Tarjeta className="p-4">
          <h2 className="mb-2 text-base font-bold">Por picking</h2>
          <ul className="flex flex-col">
            {d.pickings.map((p) => (
              <li key={String(p.picking)} className="flex items-center justify-between gap-3 border-b border-linea py-2 last:border-0">
                <span className="flex flex-col"><span className="font-semibold">Picking {String(p.picking)}</span><span className="text-xs text-gris-500">{String(p.cliente ?? p.pedido ?? "")}</span></span>
                <span className="font-bold tabular-nums">{Number(p.en_pallet)} / {Number(p.total_cajas)}</span>
              </li>
            ))}
          </ul>
        </Tarjeta>
      ) : null}
    </>
  );
}
