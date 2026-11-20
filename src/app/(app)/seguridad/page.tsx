import { Etiqueta } from "@/components/ui";
import { Listado } from "@/components/listado/listado";
import { requerirPermiso } from "@/lib/dal";
import type { Busqueda, Definicion } from "@/lib/listados";
import type { Prisma } from "@/generated/prisma/client";

type Fila = Prisma.UsuarioGetPayload<{ include: { perfil: true } }>;

export default async function Usuarios({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("seguridad", "ver");
  const definicion: Definicion<Fila, Prisma.UsuarioOrderByWithRelationInput> = {
    id: "usuarios",
    titulo: "Usuarios",
    modulo: "seguridad",
    ruta: "/seguridad",
    elemento: { singular: "usuario", plural: "usuarios" },
    busqueda: "Buscar por nombre o correo",
    filtros: [
      {
        id: "estado",
        etiqueta: "Estado",
        todos: "Activos e inactivos",
        opciones: [
          { valor: "activo", etiqueta: "Solo activos" },
          { valor: "inactivo", etiqueta: "Solo inactivos" },
        ],
      },
    ],
    orden: { columna: "nombre", dir: "asc" },
    claveFila: (u) => u.id,
    columnas: [
      { id: "nombre", titulo: "Nombre", fija: true, valor: (u) => u.nombre, ordenar: (d) => ({ nombre: d }) },
      { id: "email", titulo: "Correo", valor: (u) => u.email, ordenar: (d) => ({ email: d }) },
      { id: "perfil", titulo: "Perfil", valor: (u) => u.perfil.nombre, ordenar: (d) => ({ perfil: { nombre: d } }) },
      {
        id: "estado",
        titulo: "Estado",
        valor: (u) => (u.activo ? "Activo" : "Inactivo"),
        celda: (u) => <Etiqueta tono={u.activo ? "exito" : "neutro"}>{u.activo ? "Activo" : "Inactivo"}</Etiqueta>,
      },
    ],
    cargar: async ({ texto, filtros, orden, salto, cantidad }) => {
      const where: Prisma.UsuarioWhereInput = {
        ...(texto ? { OR: [{ nombre: { contains: texto, mode: "insensitive" } }, { email: { contains: texto, mode: "insensitive" } }] } : {}),
        ...(filtros.estado ? { activo: filtros.estado === "activo" } : {}),
      };
      const [filas, total] = await Promise.all([
        db.usuario.findMany({ where, include: { perfil: true }, orderBy: orden, skip: salto, take: cantidad }),
        db.usuario.count({ where }),
      ]);
      return { filas, total };
    },
  };
  return <Listado definicion={definicion} busqueda={searchParams} />;
}
