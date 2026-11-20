import { Listado } from "@/components/listado/listado";
import { requerirPermiso } from "@/lib/dal";
import type { Busqueda, Definicion } from "@/lib/listados";
import type { Prisma } from "@/generated/prisma/client";

type Fila = Prisma.AuditoriaCambioGetPayload<object>;

export default async function Cambios({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("auditoria", "ver");
  const definicion: Definicion<Fila, Prisma.AuditoriaCambioOrderByWithRelationInput> = {
    id: "auditoria-cambios",
    titulo: "Cambios",
    modulo: "auditoria",
    ruta: "/auditoria",
    elemento: { singular: "cambio", plural: "cambios" },
    busqueda: "Buscar por entidad",
    orden: { columna: "fecha", dir: "desc" },
    claveFila: (c) => String(c.id),
    columnas: [
      { id: "fecha", titulo: "Fecha", fija: true, formato: "fechaHora", valor: (c) => c.creadoEn, ordenar: (d) => ({ creadoEn: d }) },
      { id: "entidad", titulo: "Entidad", valor: (c) => c.entidad, ordenar: (d) => ({ entidad: d }) },
      { id: "registro", titulo: "Registro", valor: (c) => c.entidadId.slice(0, 8) },
      { id: "accion", titulo: "Acción", valor: (c) => c.accion, ordenar: (d) => ({ accion: d }) },
    ],
    cargar: async ({ texto, orden, salto, cantidad }) => {
      const where: Prisma.AuditoriaCambioWhereInput = texto ? { entidad: { contains: texto, mode: "insensitive" } } : {};
      const [filas, total] = await Promise.all([
        db.auditoriaCambio.findMany({ where, orderBy: orden, skip: salto, take: cantidad }),
        db.auditoriaCambio.count({ where }),
      ]);
      return { filas, total };
    },
  };
  return <Listado definicion={definicion} busqueda={searchParams} />;
}
