import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { Listado } from "@/components/listado/listado";
import { textoAviso } from "@/components/ficha";
import { Aviso, Etiqueta, clasesBoton } from "@/components/ui";
import { requerirPermiso, tienePermiso } from "@/lib/dal";
import type { Busqueda, Definicion } from "@/lib/listados";
import type { Prisma } from "@/generated/prisma/client";
import { eliminarArticulo } from "./acciones";

type Fila = Prisma.DetalleReferenciaGetPayload<object>;

export default async function Articulos({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const ctx = await requerirPermiso("articulos", "ver");
  const { db } = ctx;
  const busqueda = await searchParams;
  const aviso = textoAviso(busqueda.aviso, { singular: "artículo" });

  const definicion: Definicion<Fila, Prisma.DetalleReferenciaOrderByWithRelationInput> = {
    id: "articulos",
    titulo: "Artículos",
    modulo: "articulos",
    ruta: "/articulos",
    elemento: { singular: "artículo", plural: "artículos" },
    busqueda: "Buscar por descripción, código de barras o referencia",
    filtros: [
      {
        id: "inventariable",
        etiqueta: "Inventariable",
        todos: "Inventariables y no",
        opciones: [
          { valor: "1", etiqueta: "Solo inventariables" },
          { valor: "0", etiqueta: "No inventariables" },
        ],
      },
    ],
    orden: { columna: "descripcion", dir: "asc" },
    claveFila: (a) => a.productoean,
    enlace: (a) => `/articulos/${encodeURIComponent(a.productoean)}`,
    columnas: [
      { id: "descripcion", titulo: "Descripción", fija: true, valor: (a) => a.descripcion, ordenar: (d) => ({ descripcion: d }) },
      { id: "ean", titulo: "Código de barras", valor: (a) => a.productoean, ordenar: (d) => ({ productoean: d }) },
      { id: "referencia", titulo: "Referencia", valor: (a) => a.codigoreferencia, ordenar: (d) => ({ codigoreferencia: d }) },
      { id: "presentacion", titulo: "Presentación", valor: (a) => a.presentacion },
      { id: "um1", titulo: "Unidad", valor: (a) => a.um1 },
      { id: "cantidadempaque", titulo: "Cant. por empaque", alinear: "derecha", valor: (a) => a.cantidadempaque },
      { id: "laboratorio", titulo: "Laboratorio", oculta: true, valor: (a) => a.laboratorio },
      { id: "costo", titulo: "Costo", alinear: "derecha", oculta: true, valor: (a) => a.costo },
      {
        id: "inventariable",
        titulo: "Inventariable",
        valor: (a) => (a.inventariable === 1 ? "Sí" : "No"),
        celda: (a) => <Etiqueta tono={a.inventariable === 1 ? "exito" : "neutro"}>{a.inventariable === 1 ? "Sí" : "No"}</Etiqueta>,
      },
    ],
    cargar: async ({ texto, filtros, orden, salto, cantidad }) => {
      const where: Prisma.DetalleReferenciaWhereInput = {
        ...(texto
          ? {
              OR: [
                { descripcion: { contains: texto, mode: "insensitive" } },
                { productoean: { contains: texto, mode: "insensitive" } },
                { codigoreferencia: { contains: texto, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(filtros.inventariable ? { inventariable: Number(filtros.inventariable) } : {}),
      };
      const [filas, total] = await Promise.all([
        db.detalleReferencia.findMany({ where, orderBy: orden, skip: salto, take: cantidad }),
        db.detalleReferencia.count({ where }),
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
              <Link href="/importar-maestros/articulos" className={clasesBoton("secundario")}>
                <Upload className="size-4" aria-hidden />
                Importar
              </Link>
              <Link href="/articulos/nuevo" className={clasesBoton("primario")}>
              <Plus className="size-4" aria-hidden />
              Nuevo artículo
            </Link>
            </>
          ) : null
        }
        eliminar={tienePermiso(ctx, "articulos", "eliminar") ? (a) => eliminarArticulo.bind(null, a.productoean) : undefined}
      />
    </div>
  );
}
