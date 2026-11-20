import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { FormularioFicha } from "@/components/formulario-ficha";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { valoresDe } from "@/lib/formularios";
import { guardarArticulo } from "../acciones";
import { camposArticulo } from "../campos";

export default async function FichaArticulo({ params }: { params: Promise<{ ean: string }> }) {
  const ctx = await requerirPermiso("articulos", "ver");
  const ean = decodeURIComponent((await params).ean);
  const [articulo, refs] = await Promise.all([
    ctx.db.detalleReferencia.findUnique({ where: { productoean: ean } }),
    ctx.db.insReferencias.findMany({ select: { codigoreferencia: true, nombreref: true }, orderBy: { codigoreferencia: "asc" } }),
  ]);
  if (!articulo) notFound();
  const campos = camposArticulo(refs.map((r) => ({ valor: r.codigoreferencia, etiqueta: `${r.codigoreferencia} · ${r.nombreref ?? ""}` })));
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/articulos" textoVolver="Artículos" titulo={articulo.descripcion ?? articulo.productoean} descripcion={`Código de barras ${articulo.productoean}`} />
      <Tarjeta className="p-5">
        <FormularioFicha
          campos={campos}
          valores={valoresDe(campos, articulo)}
          accion={guardarArticulo.bind(null, ean)}
          cancelar="/articulos"
          editando
          soloLectura={!tienePermiso(ctx, "articulos", "editar")}
        />
      </Tarjeta>
    </div>
  );
}
