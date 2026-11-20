import type { CampoForm } from "@/lib/formularios";

// Un artículo de la bodega es una presentación identificada por su código de barras (t_detalle_referencia);
// la referencia (t_ins_referencias) agrupa las presentaciones de un mismo producto.

export function camposArticulo(referencias: { valor: string; etiqueta: string }[]): CampoForm[] {
  return [
    { nombre: "productoean", etiqueta: "Código de barras (EAN)", tipo: "texto", max: 50, requerido: true, soloCrear: true, ayuda: "Identifica al artículo y no se puede cambiar después." },
    { nombre: "descripcion", etiqueta: "Descripción", tipo: "texto", max: 120, requerido: true, ancho: 2 },
    { nombre: "codigoreferencia", etiqueta: "Referencia", tipo: "seleccion", opciones: referencias },
    { nombre: "presentacion", etiqueta: "Presentación", tipo: "texto", max: 50 },
    { nombre: "nombrecomercial", etiqueta: "Nombre comercial", tipo: "texto", max: 50 },
    { nombre: "laboratorio", etiqueta: "Laboratorio", tipo: "texto", max: 50 },
    { nombre: "registroinvima", etiqueta: "Registro INVIMA", tipo: "texto", max: 50 },
    { nombre: "um1", etiqueta: "Unidad de medida 1", tipo: "texto", max: 50 },
    { nombre: "um2", etiqueta: "Unidad de medida 2", tipo: "texto", max: 50 },
    { nombre: "cantidadempaque", etiqueta: "Cantidad por empaque", tipo: "decimal" },
    { nombre: "tipo_empaque", etiqueta: "Tipo de empaque", tipo: "texto", max: 50 },
    { nombre: "tipo_mercado", etiqueta: "Tipo de mercado", tipo: "texto", max: 50 },
    { nombre: "dimenxion", etiqueta: "Dimensión", tipo: "texto", max: 50 },
    { nombre: "hrpeso", etiqueta: "Peso", tipo: "decimal" },
    { nombre: "hrvolumen", etiqueta: "Volumen", tipo: "decimal" },
    { nombre: "costo", etiqueta: "Costo", tipo: "decimal" },
    { nombre: "ivadetalle", etiqueta: "IVA (%)", tipo: "decimal" },
    { nombre: "stockmin", etiqueta: "Stock mínimo", tipo: "decimal" },
    { nombre: "stockmax", etiqueta: "Stock máximo", tipo: "decimal" },
    { nombre: "categoriaart", etiqueta: "Categoría", tipo: "texto", max: 5 },
    { nombre: "claseart", etiqueta: "Clase", tipo: "texto", max: 5 },
    { nombre: "tipoart", etiqueta: "Tipo", tipo: "texto", max: 5 },
    { nombre: "bodega", etiqueta: "Bodega", tipo: "texto", max: 15 },
    { nombre: "inventariable", etiqueta: "Inventariable (1 = sí, 0 = no)", tipo: "entero" },
    { nombre: "estado", etiqueta: "Estado (código del sistema anterior)", tipo: "entero" },
    { nombre: "isfacturable", etiqueta: "Se puede facturar", tipo: "booleano" },
  ];
}

export const camposReferencia: CampoForm[] = [
  { nombre: "codigoreferencia", etiqueta: "Código de la referencia", tipo: "texto", max: 5, requerido: true, soloCrear: true, ayuda: "Hasta 5 caracteres. No se puede cambiar después." },
  { nombre: "nombreref", etiqueta: "Nombre", tipo: "texto", max: 120, requerido: true, ancho: 2 },
  { nombre: "referencia", etiqueta: "Referencia del fabricante", tipo: "texto", max: 30 },
  { nombre: "linea", etiqueta: "Línea", tipo: "texto", max: 50 },
  { nombre: "coleccion", etiqueta: "Colección", tipo: "texto", max: 50 },
  { nombre: "categoria", etiqueta: "Categoría", tipo: "texto", max: 50 },
  { nombre: "tipo_producto", etiqueta: "Tipo de producto", tipo: "texto", max: 50 },
  { nombre: "grupo_terapeutico", etiqueta: "Grupo terapéutico", tipo: "texto", max: 50 },
  { nombre: "pricipioactivo", etiqueta: "Principio activo", tipo: "texto", max: 50 },
  { nombre: "tallas", etiqueta: "Tallas", tipo: "texto", max: 70 },
  { nombre: "dimension", etiqueta: "Dimensión", tipo: "texto", max: 50 },
  { nombre: "posarancel", etiqueta: "Posición arancelaria", tipo: "texto", max: 50 },
  { nombre: "cod_muestra", etiqueta: "Código de muestra", tipo: "texto", max: 50 },
  { nombre: "tiporef", etiqueta: "Tipo de referencia", tipo: "texto", max: 2 },
  { nombre: "numero_meses", etiqueta: "Vida útil (meses)", tipo: "entero" },
  { nombre: "pventa", etiqueta: "Precio de venta", tipo: "decimal" },
  { nombre: "observaciones", etiqueta: "Observaciones", tipo: "textoLargo", ancho: 3, max: 4000 },
];
