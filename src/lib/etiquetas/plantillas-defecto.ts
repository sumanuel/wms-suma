import type { Fila } from "./plantilla";

// Las cuatro etiquetas de 100 × 150 mm y su plantilla ZPL predeterminada. Cada cliente puede reemplazarla con la suya (ver lib/etiquetas/plantillas.ts).
// Las posiciones están en milímetros: {{=5*mm}} es «5 mm» en puntos, así la misma plantilla sirve a 203 y a 300 dpi.

export const TIPOS_ETIQUETA = ["cajas-despacho", "cajas", "pallet", "pallet-despacho"] as const;
export type TipoEtiqueta = (typeof TIPOS_ETIQUETA)[number];

export type Variable = { nombre: string; descripcion: string };
export type InfoEtiqueta = { titulo: string; descripcion: string; variables: Variable[]; listas: { nombre: string; max: number; campos: Variable[] }[]; muestra: Fila; defecto: string };

const mm = (v: number | string) => `{{=${v}*mm}}`;
const X = mm(5);
/** Campo de texto: posición, tamaño de letra y ancho en milímetros; `lineas` máximas (lo que sobra se corta). */
const texto = (y: number | string, alto: number, dato: string, o: { x?: string; ancho?: number; lineas?: number; alinear?: "L" | "C" | "R"; ratio?: number } = {}) =>
  `^FO${o.x ?? X},${mm(y)}^A0N,${mm(alto)},${mm(Math.round(alto * (o.ratio ?? 0.8) * 100) / 100)}^FB${mm(o.ancho ?? 90)},${o.lineas ?? 1},0,${o.alinear ?? "L"},0^FH^FD${dato}^FS`;
const linea = (y: number) => `^FO${X},${mm(y)}^GB${mm(90)},2,2^FS`;
const barras = (campo: string, y: number, alto: number) => `^BY{{modulo}},3,${mm(alto)}\n^FO{{centrar ${campo}}},${mm(y)}^BCN,${mm(alto)},N,N,N^FH^FD{{${campo}}}^FS`;
const cabecera = `^XA\n^CI28\n^PW{{ancho}}\n^LL{{alto}}\n^LH0,0`;
const pie = `^PQ1,0,1,N\n^XZ`;
const unir = (...p: string[]) => p.join("\n") + "\n";

const despacho = unir(
  cabecera,
  texto(5, 3.2, "PEDIDO {{pedido}}  PICKING {{picking}}", { ancho: 56, ratio: 0.9 }),
  texto(3.8, 8, "{{numero}} / {{total}}", { alinear: "R", ratio: 0.9 }),
  linea(14),
  texto(15.5, 2.6, "DESTINATARIO"),
  texto(19.5, 4.5, "{{cliente}}", { lineas: 2, ratio: 0.9 }),
  texto(29.5, 3.4, "{{direccion}}", { lineas: 2 }),
  texto(37, 3.4, "{{ciudad}}{{#si telefono}}  Tel. {{telefono}}{{/si}}"),
  linea(42),
  `{{#lineas 7}}`,
  texto("(44+i*9.5)", 3.4, "{{articulo}}  x {{cantidad}} {{presentacion}}", { ratio: 0.9 }),
  texto("(48.2+i*9.5)", 2.8, "Lote {{lote}}{{#si vence}}  Vence {{vence}}{{/si}}"),
  `{{/lineas}}`,
  `{{#si masLineas}}`,
  texto(110.5, 2.8, "... y {{masLineas}} lineas mas"),
  `{{/si}}`,
  barras("sscc", 114, 22),
  texto(139, 4.2, "(00) {{sscc}}", { alinear: "C", ratio: 0.9 }),
  pie,
);

const caja = unir(
  cabecera,
  texto(5, 3.2, "CAJA{{#si reimpresion}}  REIMPRESION {{reimpresion}}{{/si}}", { ratio: 0.9 }),
  texto(9, 17, "{{caja}}", { ratio: 0.9 }),
  barras("caja", 30, 26),
  texto(59, 4, "{{caja}}", { alinear: "C" }),
  linea(65),
  texto(67, 5, "{{articulo}}", { lineas: 2, ratio: 0.9 }),
  texto(79, 3, "{{ean}}"),
  linea(84),
  texto(86, 3, "Lote", { ancho: 43, ratio: 0.9 }),
  texto(90.2, 5.5, "{{lote}}", { ancho: 43, ratio: 0.9 }),
  texto(86, 3, "Vence", { x: mm(50), ancho: 43, ratio: 0.9 }),
  texto(90.2, 5.5, "{{vence}}", { x: mm(50), ancho: 43, ratio: 0.9 }),
  texto(99, 3, "Cantidad", { ancho: 43, ratio: 0.9 }),
  texto(103.2, 5.5, "{{cantidad}}", { ancho: 43, ratio: 0.9 }),
  texto(99, 3, "Ubicacion", { x: mm(50), ancho: 43, ratio: 0.9 }),
  texto(103.2, 5.5, "{{ubicacion}}", { x: mm(50), ancho: 43, ratio: 0.9 }),
  pie,
);

const pallet = unir(
  cabecera,
  texto(5, 3.2, "PALLET", { ratio: 0.9 }),
  texto(9, 17, "{{numero}}", { ratio: 0.9 }),
  barras("numero", 30, 28),
  texto(61, 4, "{{numero}}", { alinear: "C" }),
  linea(66),
  texto(68, 3, "Cajas", { ancho: 30, alinear: "C", ratio: 0.9 }),
  texto(72, 5.5, "{{cajas}}", { ancho: 30, alinear: "C", ratio: 0.9 }),
  texto(68, 3, "Unidades", { x: mm(35), ancho: 30, alinear: "C", ratio: 0.9 }),
  texto(72, 5.5, "{{unidades}}", { x: mm(35), ancho: 30, alinear: "C", ratio: 0.9 }),
  texto(68, 3, "Ubicacion", { x: mm(65), ancho: 30, alinear: "C", ratio: 0.9 }),
  texto(72, 5.5, "{{ubicacion}}", { x: mm(65), ancho: 30, alinear: "C", ratio: 0.9 }),
  linea(79),
  `{{#lineas 8}}`,
  texto("(81+i*5.5)", 3.2, "{{articulo}} - {{lote}}", { ancho: 68 }),
  texto("(81+i*5.5)", 3.2, "{{unidades}}", { alinear: "R" }),
  `{{/lineas}}`,
  `{{#si masLineas}}`,
  texto(125, 2.8, "... y {{masLineas}} lineas mas"),
  `{{/si}}`,
  pie,
);

const palletDespacho = unir(
  cabecera,
  texto(5, 3.2, "PALLET DE DESPACHO", { ancho: 58, ratio: 0.9 }),
  texto(5, 3, "Bodega {{bodega}}", { alinear: "R" }),
  texto(10, 17, "{{id}}", { ratio: 0.9 }),
  linea(28),
  texto(30, 3, "Cajas", { ancho: 30, alinear: "C", ratio: 0.9 }),
  texto(34, 5, "{{cajas}}", { ancho: 30, alinear: "C", ratio: 0.9 }),
  texto(30, 3, "Peso (kg)", { x: mm(35), ancho: 30, alinear: "C", ratio: 0.9 }),
  texto(34, 5, "{{peso}}", { x: mm(35), ancho: 30, alinear: "C", ratio: 0.9 }),
  texto(30, 3, "Medidas (cm)", { x: mm(65), ancho: 30, alinear: "C", ratio: 0.9 }),
  texto(34, 5, "{{medidas}}", { x: mm(65), ancho: 30, alinear: "C", ratio: 0.9 }),
  linea(41),
  `{{#destinos 8}}`,
  texto("(43+i*5.5)", 3.2, "{{cliente}} - {{pedido}}", { ancho: 68 }),
  texto("(43+i*5.5)", 3.2, "{{cajas}} cajas", { alinear: "R" }),
  `{{/destinos}}`,
  `{{#si masDestinos}}`,
  texto(88, 2.8, "... y {{masDestinos}} pickings mas"),
  `{{/si}}`,
  `{{#si transporte}}`,
  texto(93, 3.4, "{{transporte}}", { lineas: 2, ratio: 0.9 }),
  `{{/si}}`,
  barras("sscc", 114, 22),
  texto(139, 4.2, "(00) {{sscc}}", { alinear: "C", ratio: 0.9 }),
  pie,
);

const V = (nombre: string, descripcion: string): Variable => ({ nombre, descripcion });
const COMUNES = [V("mm", "puntos por milímetro de la impresora (8 a 203 dpi, 12 a 300 dpi)"), V("ancho", "ancho de la hoja en puntos (100 mm)"), V("alto", "alto de la hoja en puntos (150 mm)"), V("modulo", "ancho de módulo del código de barras (2 a 203 dpi, 3 a 300 dpi)")];

export const ETIQUETAS: Record<TipoEtiqueta, InfoEtiqueta> = {
  "cajas-despacho": {
    titulo: "Caja de despacho", descripcion: "Una etiqueta por caja armada en la aduana, con destinatario, contenido y SSCC.",
    variables: [...COMUNES, V("pedido", "número del pedido"), V("picking", "número del picking"), V("numero", "número de la caja"), V("total", "cajas del picking"), V("sscc", "SSCC de 18 dígitos"), V("cliente", "destinatario"), V("direccion", "dirección de entrega"), V("ciudad", "ciudad"), V("telefono", "teléfono (puede estar vacío)"), V("masLineas", "líneas que no caben (0 si caben todas)")],
    listas: [{ nombre: "lineas", max: 7, campos: [V("articulo", "descripción"), V("cantidad", "cantidad con separador de miles"), V("presentacion", "unidad"), V("lote", "lote"), V("vence", "vencimiento dd/mm/aaaa (puede estar vacío)")] }],
    muestra: { pedido: "PED-000123", picking: 55, numero: 2, total: 3, sscc: "000000005500000024", cliente: "Droguería Central S.A.S.", direccion: "Cra 7 # 12-34, Bodega 2", ciudad: "Bogotá", telefono: "601 555 0100", masLineas: 0, lineas: [{ articulo: "Acetaminofén 500 mg x 100", cantidad: "1.200", presentacion: "CAJA", lote: "L-2411A", vence: "30/11/2027" }, { articulo: "Ibuprofeno 400 mg x 50", cantidad: "480", presentacion: "CAJA", lote: "L-2409B", vence: "31/08/2027" }] },
    defecto: despacho,
  },
  cajas: {
    titulo: "Caja de inventario", descripcion: "Etiqueta de la caja que entra al almacén, con su número, artículo, lote, vencimiento y ubicación.",
    variables: [...COMUNES, V("caja", "número de la caja"), V("reimpresion", "veces que ya se imprimió (0 la primera vez)"), V("articulo", "descripción"), V("ean", "código del artículo"), V("lote", "lote"), V("vence", "vencimiento dd/mm/aaaa (puede estar vacío)"), V("cantidad", "saldo con separador de miles"), V("ubicacion", "ubicación actual")],
    listas: [],
    muestra: { caja: 920001, reimpresion: 0, articulo: "Loratadina 10 mg x 30", ean: "7701234567890", lote: "L-2411A", vence: "30/11/2027", cantidad: "1.200", ubicacion: "A-01-02" },
    defecto: caja,
  },
  pallet: {
    titulo: "Pallet de inventario", descripcion: "Etiqueta del pallet de cajas de inventario, con totales y el contenido por artículo y lote.",
    variables: [...COMUNES, V("numero", "número del pallet"), V("cajas", "cajas del pallet"), V("unidades", "unidades con separador de miles"), V("ubicacion", "ubicación («Varias» si hay más de una)"), V("masLineas", "líneas que no caben (0 si caben todas)")],
    listas: [{ nombre: "lineas", max: 8, campos: [V("articulo", "descripción"), V("lote", "lote"), V("unidades", "unidades con separador de miles")] }],
    muestra: { numero: 7, cajas: 12, unidades: "3.600", ubicacion: "A-01-02", masLineas: 0, lineas: [{ articulo: "Loratadina 10 mg x 30", lote: "L-2411A", unidades: "2.400" }, { articulo: "Ibuprofeno 400 mg x 50", lote: "L-2409B", unidades: "1.200" }] },
    defecto: pallet,
  },
  "pallet-despacho": {
    titulo: "Pallet de despacho", descripcion: "Etiqueta del pallet que sale en el vehículo, con su SSCC, medidas, peso y destinos.",
    variables: [...COMUNES, V("id", "número del pallet"), V("sscc", "SSCC de 18 dígitos"), V("bodega", "bodega"), V("cajas", "cajas del pallet"), V("peso", "peso en kg"), V("medidas", "largo×ancho×alto en cm («-» si no hay)"), V("transporte", "transportador, remesa y placa (puede estar vacío)"), V("masDestinos", "pickings que no caben (0 si caben todos)")],
    listas: [{ nombre: "destinos", max: 8, campos: [V("cliente", "destinatario"), V("pedido", "pedido"), V("cajas", "cajas en este pallet")] }],
    muestra: { id: 3, sscc: "100000000000000038", bodega: "DEMO", cajas: 5, peso: "42.5", medidas: "120x100x140", transporte: "Transportes Andes - remesa R-77 - ABC123", masDestinos: 0, destinos: [{ cliente: "Droguería Central S.A.S.", pedido: "PED-000123", cajas: 3 }, { cliente: "Farmacia Norte", pedido: "PED-000125", cajas: 2 }] },
    defecto: palletDespacho,
  },
};
