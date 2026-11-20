import { Etiqueta } from "@/components/ui";
import { Listado } from "@/components/listado/listado";
import { requerirPermiso } from "@/lib/dal";
import type { Busqueda, Definicion } from "@/lib/listados";
import type { Prisma } from "@/generated/prisma/client";

type Fila = Prisma.RegistroIngresoGetPayload<object>;

export default async function Ingresos({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const { db } = await requerirPermiso("auditoria", "ver");
  const definicion: Definicion<Fila, Prisma.RegistroIngresoOrderByWithRelationInput> = {
    id: "auditoria-ingresos",
    titulo: "Ingresos",
    modulo: "auditoria",
    ruta: "/auditoria/ingresos",
    elemento: { singular: "ingreso", plural: "ingresos" },
    busqueda: "Buscar por correo",
    filtros: [
      {
        id: "resultado",
        etiqueta: "Resultado",
        todos: "Correctos y fallidos",
        opciones: [
          { valor: "ok", etiqueta: "Solo correctos" },
          { valor: "fallo", etiqueta: "Solo fallidos" },
        ],
      },
    ],
    orden: { columna: "fecha", dir: "desc" },
    claveFila: (i) => String(i.id),
    columnas: [
      { id: "fecha", titulo: "Fecha", fija: true, formato: "fechaHora", valor: (i) => i.creadoEn, ordenar: (d) => ({ creadoEn: d }) },
      { id: "email", titulo: "Correo", valor: (i) => i.email, ordenar: (d) => ({ email: d }) },
      {
        id: "resultado",
        titulo: "Resultado",
        valor: (i) => (i.exito ? "Correcto" : `Falló (${i.motivo})`),
        celda: (i) => <Etiqueta tono={i.exito ? "exito" : "error"}>{i.exito ? "Correcto" : `Falló (${i.motivo})`}</Etiqueta>,
      },
      { id: "ip", titulo: "IP", valor: (i) => i.ip },
    ],
    cargar: async ({ texto, filtros, orden, salto, cantidad }) => {
      const where: Prisma.RegistroIngresoWhereInput = {
        ...(texto ? { email: { contains: texto, mode: "insensitive" } } : {}),
        ...(filtros.resultado ? { exito: filtros.resultado === "ok" } : {}),
      };
      const [filas, total] = await Promise.all([
        db.registroIngreso.findMany({ where, orderBy: orden, skip: salto, take: cantidad }),
        db.registroIngreso.count({ where }),
      ]);
      return { filas, total };
    },
  };
  return <Listado definicion={definicion} busqueda={searchParams} />;
}
