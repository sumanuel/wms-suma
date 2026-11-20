import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { FormularioFicha } from "@/components/formulario-ficha";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { valoresDe } from "@/lib/formularios";
import { guardarReferencia } from "../../acciones";
import { camposReferencia } from "../../campos";

export default async function FichaReferencia({ params }: { params: Promise<{ codigo: string }> }) {
  const ctx = await requerirPermiso("articulos", "ver");
  const codigo = decodeURIComponent((await params).codigo);
  const referencia = await ctx.db.insReferencias.findUnique({ where: { codigoreferencia: codigo } });
  if (!referencia) notFound();
  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha volver="/articulos/referencias" textoVolver="Referencias" titulo={referencia.nombreref ?? referencia.codigoreferencia} descripcion={`Código ${referencia.codigoreferencia}`} />
      <Tarjeta className="p-5">
        <FormularioFicha
          campos={camposReferencia}
          valores={valoresDe(camposReferencia, referencia)}
          accion={guardarReferencia.bind(null, codigo)}
          cancelar="/articulos/referencias"
          editando
          soloLectura={!tienePermiso(ctx, "articulos", "editar")}
        />
      </Tarjeta>
    </div>
  );
}
