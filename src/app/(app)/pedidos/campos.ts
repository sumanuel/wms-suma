import type { CampoForm } from "@/lib/formularios";
import type { Db } from "@/lib/tenant";

export async function camposPedido(db: Db, nuevo: boolean): Promise<CampoForm[]> {
  const sedes = await db.clientesDirecciones.findMany({
    where: { nit: { not: null } },
    select: { item: true, nombrecliente: true, nit: true, ciudad: true, activo: true },
    orderBy: { nombrecliente: "asc" },
    take: 2000,
  });
  return [
    ...(nuevo ? [{ nombre: "npedido", etiqueta: "Número del pedido", tipo: "texto" as const, max: 50, soloCrear: true, ayuda: "Si lo dejas vacío, se asigna uno consecutivo (PED-000001…)." }] : []),
    {
      nombre: "sede", etiqueta: "Sede de entrega (cliente)", tipo: "seleccion", requerido: true, ancho: 2, numerico: true,
      opciones: sedes.map((s) => ({ valor: String(s.item), etiqueta: `${s.nombrecliente ?? `Sede ${s.item}`} · ${s.nit}${s.ciudad ? ` · ${s.ciudad}` : ""}${s.activo === 0 ? " (inactiva)" : ""}` })),
    },
    { nombre: "fechapedido", etiqueta: "Fecha del pedido", tipo: "fecha" },
    { nombre: "fechavence", etiqueta: "Fecha de vencimiento", tipo: "fecha" },
    { nombre: "ocompra", etiqueta: "Orden de compra del cliente", tipo: "texto", max: 50 },
    { nombre: "tipoventa", etiqueta: "Tipo de venta", tipo: "texto", max: 2 },
    { nombre: "prioridad", etiqueta: "Prioridad", tipo: "entero" },
    { nombre: "personasolicitapedido", etiqueta: "Quién solicita", tipo: "texto", max: 100 },
    { nombre: "direcciondeenvio", etiqueta: "Dirección de envío", tipo: "texto", max: 350, ancho: 3 },
    { nombre: "requisitos", etiqueta: "Requisitos", tipo: "textoLargo", max: 500, ancho: 3 },
  ];
}
