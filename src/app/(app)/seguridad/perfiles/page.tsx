import { Etiqueta } from "@/components/ui";
import { Listado } from "@/components/listado/listado";
import { requerirPermiso } from "@/lib/dal";
import type { Busqueda, Definicion } from "@/lib/listados";
import type { Prisma } from "@/generated/prisma/client";

type Fila = Prisma.PerfilGetPayload<{ include: { _count: { select: { permisos: true; usuarios: true } } } }>;

export default async function Perfiles({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("seguridad", "ver");
  const definicion: Definicion<Fila, Prisma.PerfilOrderByWithRelationInput> = {
    id: "perfiles",
    titulo: "Perfiles",
    modulo: "seguridad",
    ruta: "/seguridad/perfiles",
    elemento: { singular: "perfil", plural: "perfiles" },
    busqueda: "Buscar por nombre de perfil",
    orden: { columna: "nombre", dir: "asc" },
    claveFila: (p) => p.id,
    columnas: [
      { id: "nombre", titulo: "Perfil", fija: true, valor: (p) => p.nombre, ordenar: (d) => ({ nombre: d }) },
      { id: "descripcion", titulo: "Descripción", valor: (p) => p.descripcion },
      {
        id: "permisos",
        titulo: "Permisos",
        alinear: "derecha",
        valor: (p) => (p.esAdministrador ? "Todos" : p._count.permisos),
      },
      { id: "usuarios", titulo: "Usuarios", alinear: "derecha", valor: (p) => p._count.usuarios },
      {
        id: "estado",
        titulo: "Estado",
        valor: (p) => (p.activo ? "Activo" : "Inactivo"),
        celda: (p) => <Etiqueta tono={p.activo ? "exito" : "neutro"}>{p.activo ? "Activo" : "Inactivo"}</Etiqueta>,
      },
    ],
    cargar: async ({ texto, orden, salto, cantidad }) => {
      const where: Prisma.PerfilWhereInput = texto ? { nombre: { contains: texto, mode: "insensitive" } } : {};
      const [filas, total] = await Promise.all([
        db.perfil.findMany({
          where,
          include: { _count: { select: { permisos: true, usuarios: true } } },
          orderBy: orden,
          skip: salto,
          take: cantidad,
        }),
        db.perfil.count({ where }),
      ]);
      return { filas, total };
    },
  };
  return <Listado definicion={definicion} busqueda={searchParams} />;
}
