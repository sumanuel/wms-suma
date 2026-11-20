import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Listado } from "@/components/listado/listado";
import { textoAviso } from "@/components/ficha";
import { Aviso, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import type { Busqueda, Definicion } from "@/lib/listados";
import type { Prisma } from "@/generated/prisma/client";
import { eliminarReferencia } from "../acciones";

type Fila = Prisma.InsReferenciasGetPayload<{ include: { _count: { select: { hijos_t_detalle_referencia_1: true } } } }>;

export default async function Referencias({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const ctx = await requerirPermiso("articulos", "ver");
  const { db } = ctx;
  const busqueda = await searchParams;
  const aviso = textoAviso(busqueda.aviso, { singular: "referencia" }, "la");

  const definicion: Definicion<Fila, Prisma.InsReferenciasOrderByWithRelationInput> = {
    id: "referencias",
    titulo: "Referencias",
    modulo: "articulos",
    ruta: "/articulos/referencias",
    elemento: { singular: "referencia", plural: "referencias" },
    busqueda: "Buscar por código, nombre o línea",
    orden: { columna: "nombre", dir: "asc" },
    claveFila: (r) => r.codigoreferencia,
    enlace: (r) => `/articulos/referencias/${encodeURIComponent(r.codigoreferencia)}`,
    columnas: [
      { id: "nombre", titulo: "Nombre", fija: true, valor: (r) => r.nombreref, ordenar: (d) => ({ nombreref: d }) },
      { id: "codigo", titulo: "Código", valor: (r) => r.codigoreferencia, ordenar: (d) => ({ codigoreferencia: d }) },
      { id: "linea", titulo: "Línea", valor: (r) => r.linea, ordenar: (d) => ({ linea: d }) },
      { id: "categoria", titulo: "Categoría", valor: (r) => r.categoria },
      { id: "tipo", titulo: "Tipo de producto", valor: (r) => r.tipo_producto },
      { id: "articulos", titulo: "Artículos", alinear: "derecha", valor: (r) => r._count.hijos_t_detalle_referencia_1 },
    ],
    cargar: async ({ texto, orden, salto, cantidad }) => {
      const where: Prisma.InsReferenciasWhereInput = texto
        ? {
            OR: [
              { nombreref: { contains: texto, mode: "insensitive" } },
              { codigoreferencia: { contains: texto, mode: "insensitive" } },
              { linea: { contains: texto, mode: "insensitive" } },
            ],
          }
        : {};
      const [filas, total] = await Promise.all([
        db.insReferencias.findMany({ where, include: { _count: { select: { hijos_t_detalle_referencia_1: true } } }, orderBy: orden, skip: salto, take: cantidad }),
        db.insReferencias.count({ where }),
      ]);
      return { filas, total };
    },
  };

  return (
    <div className="flex flex-col gap-4">
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}
      <Listado
        definicion={definicion}
        busqueda={Promise.resolve(busqueda)}
        acciones={
          tienePermiso(ctx, "articulos", "crear") ? (
            <>
              <Link href="/importar-maestros/referencias" className={clasesBoton("secundario")}>
                <Upload className="size-4" aria-hidden />
                Importar
              </Link>
              <Link href="/articulos/referencias/nueva" className={clasesBoton("primario")}>
              <Plus className="size-4" aria-hidden />
              Nueva referencia
            </Link>
            </>
          ) : null
        }
        eliminar={tienePermiso(ctx, "articulos", "eliminar") ? (r) => eliminarReferencia.bind(null, r.codigoreferencia) : undefined}
      />
    </div>
  );
}
