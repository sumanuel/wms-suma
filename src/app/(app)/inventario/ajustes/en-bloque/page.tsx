import { Download } from "lucide-react";
import { Tarjeta, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { COLUMNAS_BLOQUE, leerUmbral, MAX_FILAS_BLOQUE } from "@/lib/inventario/aprobacion";
import { ImportadorBloque } from "./importador-bloque";

export default async function EnBloque() {
  const ctx = await requerirPermiso("inventario", "editar");
  const umbral = await leerUmbral(ctx.db);
  return (
    <div className="flex flex-col gap-5">
      <Tarjeta className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <h2 className="text-base font-semibold">Ajustes desde una planilla</h2>
            <p className="mt-1 text-[13.5px] text-gris-500">
              Una fila por caja con su <strong>saldo real</strong> y el motivo: el sistema calcula la diferencia y deja un ajuste manual por caja. Es todo o nada (hasta {MAX_FILAS_BLOQUE} filas): primero se revisa y solo se aplica sin errores.
              Columnas: {COLUMNAS_BLOQUE.map((c) => `${c.titulo}${c.obligatoria ? " *" : ""}`).join(", ")}.
              {umbral > 0 && !tienePermiso(ctx, "inventario", "eliminar") ? ` Las diferencias de más de ${umbral} unidades necesitan un aprobador: esas se piden de forma individual.` : ""}
            </p>
          </div>
          <a href="/inventario/ajustes/en-bloque/modelo" className={clasesBoton("secundario")}><Download className="size-4" aria-hidden />Planilla modelo</a>
        </div>
      </Tarjeta>
      <ImportadorBloque />
    </div>
  );
}
