import { notFound } from "next/navigation";
import { EncabezadoFicha } from "@/components/ficha";
import { FormularioFicha } from "@/components/formulario-ficha";
import { Tarjeta } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import { valoresDe } from "@/lib/formularios";
import { guardarRegistro } from "@/app/maestros-acciones";
import { camposDe, claveDe } from "@/lib/maestros/nucleo";
import type { Maestro } from "@/lib/maestros/tipos";

// `clave` null: alta. Con clave: ficha de edición (solo lectura si el usuario no puede editar).
export async function FichaMaestro({ maestro: m, clave, titulo }: { maestro: Maestro; clave: string | null; titulo: string }) {
  const ctx = await requerirPermiso(m.modulo, clave === null ? "crear" : "ver");
  const campos = await camposDe(m, ctx.db);
  const nuevo = m.genero === "el" ? "Nuevo" : "Nueva";

  let registro = null;
  if (clave !== null) {
    const c = claveDe(m, clave);
    if (typeof c === "number" && !Number.isSafeInteger(c)) notFound();
    registro = await m.delegado(ctx.db).findUnique({ where: { [m.clave.campo]: c } });
    if (!registro) notFound();
  }

  return (
    <div className="flex flex-col gap-5">
      <EncabezadoFicha
        volver={m.ruta}
        textoVolver={titulo}
        titulo={registro ? m.titulo(registro) : `${nuevo} ${m.singular}`}
        descripcion={registro ? m.descripcion?.(registro) : undefined}
      />
      <Tarjeta className="p-5">
        <FormularioFicha
          campos={campos}
          valores={registro ? valoresDe(campos, registro) : { ...valoresDe(campos, null), ...m.valoresIniciales }}
          accion={guardarRegistro.bind(null, m.id, clave)}
          cancelar={m.ruta}
          editando={registro !== null}
          soloLectura={registro !== null && !tienePermiso(ctx, m.modulo, "editar")}
        />
      </Tarjeta>
    </div>
  );
}
