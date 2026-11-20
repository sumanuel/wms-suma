import "server-only";
import type { Db } from "./tenant";

type Cambio = {
  usuarioId: string | null;
  entidad: string;
  entidadId: string;
  accion: "crear" | "editar" | "eliminar" | "otro";
  antes?: unknown;
  despues?: unknown;
};

/** Deja constancia de un cambio en la base del cliente (auditoria_cambio). */
export async function registrarCambio(db: Db, c: Cambio) {
  await db.auditoriaCambio.create({
    data: {
      usuarioId: c.usuarioId,
      entidad: c.entidad,
      entidadId: c.entidadId,
      accion: c.accion,
      antes: c.antes === undefined ? undefined : JSON.parse(JSON.stringify(c.antes)),
      despues: c.despues === undefined ? undefined : JSON.parse(JSON.stringify(c.despues)),
    },
  });
}
