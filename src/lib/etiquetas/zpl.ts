// Generador de etiquetas ZPL II de 100 × 150 mm (las mismas de la vista en pantalla), para imprimirlas directo en impresoras Zebra.
// Funciones puras: reciben datos ya consultados y devuelven el texto ZPL. Sirven para 203 dpi (8 puntos/mm) y 300 dpi (12 puntos/mm).

export type Dpi = 203 | 300;

const ANCHO_MM = 100;
const ALTO_MM = 150;
const MARGEN_MM = 5;

/** Escapa el dato de un campo: con ^FH los caracteres reservados van como _XX (hexadecimal). */
export function datoZpl(texto: string) {
  return texto
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[_^~\\]/g, (c) => `_${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

const miles = (n: number) => new Intl.NumberFormat("es-CO", { maximumFractionDigits: 3 }).format(n);

class Lienzo {
  readonly ancho: number;
  readonly alto: number;
  readonly margen: number;
  private partes: string[] = [];
  private readonly puntos: number;
  constructor(readonly dpi: Dpi) {
    this.puntos = dpi / 25.4;
    this.ancho = this.mm(ANCHO_MM);
    this.alto = this.mm(ALTO_MM);
    this.margen = this.mm(MARGEN_MM);
    this.partes.push(`^XA`, `^CI28`, `^PW${this.ancho}`, `^LL${this.alto}`, `^LH0,0`);
  }
  mm(v: number) { return Math.round(v * this.puntos); }
  get util() { return this.ancho - 2 * this.margen; }
  /** Texto en un bloque de ancho fijo con un máximo de líneas (lo que sobra se corta). `alto` es la altura de letra en milímetros. */
  texto(x: number, y: number, texto: string, o: { alto: number; ancho?: number; lineas?: number; alinear?: "L" | "C" | "R"; negrita?: boolean } = { alto: 3.5 }) {
    const h = this.mm(o.alto);
    const w = o.ancho ?? this.util;
    this.partes.push(`^FO${x},${y}^A0N,${h},${Math.round(h * (o.negrita ? 0.9 : 0.8))}^FB${w},${o.lineas ?? 1},0,${o.alinear ?? "L"},0^FH^FD${datoZpl(texto)}^FS`);
    return y + h * (o.lineas ?? 1) + this.mm(1);
  }
  linea(y: number, grosor = 2) {
    this.partes.push(`^FO${this.margen},${y}^GB${this.util},${grosor},${grosor}^FS`);
    return y + grosor + this.mm(1.5);
  }
  /** Barras centradas en el ancho útil: el ancho real depende del contenido, así que se centra con un bloque ^FB sobre la posición de origen. */
  barrasCentradas(y: number, dato: string, altoMm: number) {
    const modulo = this.dpi === 300 ? 3 : 2;
    // Code 128 (subconjunto C si son solo dígitos y largo par; B en otro caso): 11 módulos por símbolo + inicio, control, parada y margen.
    const numerico = /^\d+$/.test(dato);
    const simbolos = numerico ? Math.ceil(dato.length / 2) : dato.length;
    const modulos = 11 * (simbolos + 2) + 13;
    const x = Math.max(this.margen, Math.round((this.ancho - modulos * modulo) / 2));
    this.partes.push(`^BY${modulo},3,${this.mm(altoMm)}`, `^FO${x},${y}^BCN,${this.mm(altoMm)},N,N,N^FH^FD${datoZpl(dato)}^FS`);
    return y + this.mm(altoMm) + this.mm(2);
  }
  fin(copias = 1) {
    this.partes.push(`^PQ${copias},0,1,N`, `^XZ`);
    return this.partes.join("\n") + "\n";
  }
}

export type LineaCaja = { articulo: string; cantidad: number; presentacion: string; lote: string; vence: string };

export type DatosCajaDespacho = { pedido: string; picking: number; numero: number; total: number; sscc: string; cliente: string; direccion: string; ciudad: string; telefono: string; lineas: LineaCaja[] };

export function zplCajaDespacho(d: DatosCajaDespacho, dpi: Dpi = 203) {
  const z = new Lienzo(dpi);
  const m = z.margen;
  let y = m;
  z.texto(m, y, `PEDIDO ${d.pedido || "-"}  PICKING ${d.picking}`, { alto: 3.2, ancho: Math.round(z.util * 0.62), negrita: true });
  z.texto(m, y - z.mm(1.2), `${d.numero} / ${d.total}`, { alto: 8, alinear: "R", negrita: true });
  y += z.mm(9);
  y = z.linea(y);
  y = z.texto(m, y, "DESTINATARIO", { alto: 2.6 });
  y = z.texto(m, y, d.cliente || "-", { alto: 4.5, lineas: 2, negrita: true });
  y = z.texto(m, y, d.direccion, { alto: 3.4, lineas: 2 });
  y = z.texto(m, y, `${d.ciudad}${d.telefono ? `  Tel. ${d.telefono}` : ""}`, { alto: 3.4 });
  y = z.linea(y + z.mm(1));
  for (const l of d.lineas.slice(0, 7)) {
    y = z.texto(m, y, `${l.articulo}  x ${miles(l.cantidad)} ${l.presentacion}`, { alto: 3.4, negrita: true });
    y = z.texto(m, y, `Lote ${l.lote || "-"}${l.vence ? `  Vence ${l.vence}` : ""}`, { alto: 2.8 }) + z.mm(0.8);
  }
  if (d.lineas.length > 7) y = z.texto(m, y, `... y ${d.lineas.length - 7} lineas mas`, { alto: 2.8 });
  const base = z.alto - z.margen - z.mm(8) - z.mm(24);
  z.barrasCentradas(Math.max(y, base), d.sscc, 22);
  z.texto(m, z.alto - z.margen - z.mm(6), `(00) ${d.sscc}`, { alto: 4.2, alinear: "C", negrita: true });
  return z.fin();
}

export type DatosCajaInventario = { caja: number; reimpresion: number; articulo: string; ean: string; lote: string; vence: string; cantidad: number; ubicacion: string };

export function zplCajaInventario(d: DatosCajaInventario, dpi: Dpi = 203) {
  const z = new Lienzo(dpi);
  const m = z.margen;
  let y = m;
  y = z.texto(m, y, `CAJA${d.reimpresion > 0 ? `  REIMPRESION ${d.reimpresion}` : ""}`, { alto: 3.2, negrita: true });
  y = z.texto(m, y, String(d.caja), { alto: 17, negrita: true }) + z.mm(1);
  y = z.barrasCentradas(y, String(d.caja), 26);
  y = z.texto(m, y, String(d.caja), { alto: 4, alinear: "C" });
  y = z.linea(y + z.mm(1));
  y = z.texto(m, y, d.articulo, { alto: 5, lineas: 2, negrita: true });
  y = z.texto(m, y, d.ean, { alto: 3 });
  y = z.linea(y + z.mm(1));
  const mitad = Math.round(z.util / 2);
  const campo = (x: number, yy: number, etiqueta: string, valor: string) => {
    z.texto(x, yy, etiqueta, { alto: 3, ancho: mitad - z.mm(2), negrita: true });
    z.texto(x, yy + z.mm(4.2), valor || "-", { alto: 5.5, ancho: mitad - z.mm(2), negrita: true });
  };
  campo(m, y, "Lote", d.lote);
  campo(m + mitad, y, "Vence", d.vence);
  campo(m, y + z.mm(13), "Cantidad", miles(d.cantidad));
  campo(m + mitad, y + z.mm(13), "Ubicacion", d.ubicacion);
  return z.fin();
}

export type DatosPalletInventario = { numero: number; cajas: number; unidades: number; ubicacion: string; lineas: { articulo: string; lote: string; unidades: number }[] };

export function zplPalletInventario(d: DatosPalletInventario, dpi: Dpi = 203) {
  const z = new Lienzo(dpi);
  const m = z.margen;
  let y = m;
  y = z.texto(m, y, "PALLET", { alto: 3.2, negrita: true });
  y = z.texto(m, y, String(d.numero), { alto: 17, negrita: true }) + z.mm(1);
  y = z.barrasCentradas(y, String(d.numero), 28);
  y = z.texto(m, y, String(d.numero), { alto: 4, alinear: "C" });
  y = z.linea(y + z.mm(1));
  const tercio = Math.round(z.util / 3);
  const campo = (i: number, etiqueta: string, valor: string) => {
    z.texto(m + i * tercio, y, etiqueta, { alto: 3, ancho: tercio, alinear: "C", negrita: true });
    z.texto(m + i * tercio, y + z.mm(4), valor, { alto: 5.5, ancho: tercio, alinear: "C", negrita: true });
  };
  campo(0, "Cajas", String(d.cajas));
  campo(1, "Unidades", miles(d.unidades));
  campo(2, "Ubicacion", d.ubicacion || "-");
  y = z.linea(y + z.mm(11));
  for (const l of d.lineas.slice(0, 8)) {
    z.texto(m, y, `${l.articulo} - ${l.lote}`, { alto: 3.2, ancho: z.util - z.mm(22) });
    y = z.texto(m, y, miles(l.unidades), { alto: 3.2, alinear: "R" });
  }
  if (d.lineas.length > 8) z.texto(m, y, `... y ${d.lineas.length - 8} lineas mas`, { alto: 2.8 });
  return z.fin();
}

export type DatosPalletDespacho = {
  id: number; sscc: string; bodega: string; cajas: number; peso: string; medidas: string;
  destinos: { cliente: string; pedido: string; cajas: number }[]; transporte: string;
};

export function zplPalletDespacho(d: DatosPalletDespacho, dpi: Dpi = 203) {
  const z = new Lienzo(dpi);
  const m = z.margen;
  let y = m;
  z.texto(m, y, "PALLET DE DESPACHO", { alto: 3.2, ancho: Math.round(z.util * 0.65), negrita: true });
  z.texto(m, y, `Bodega ${d.bodega}`, { alto: 3, alinear: "R" });
  y += z.mm(5);
  y = z.texto(m, y, String(d.id), { alto: 17, negrita: true }) + z.mm(1);
  y = z.linea(y);
  const tercio = Math.round(z.util / 3);
  const campo = (i: number, etiqueta: string, valor: string) => {
    z.texto(m + i * tercio, y, etiqueta, { alto: 3, ancho: tercio, alinear: "C", negrita: true });
    z.texto(m + i * tercio, y + z.mm(4), valor, { alto: 5, ancho: tercio, alinear: "C", negrita: true });
  };
  campo(0, "Cajas", String(d.cajas));
  campo(1, "Peso (kg)", d.peso);
  campo(2, "Medidas (cm)", d.medidas);
  y = z.linea(y + z.mm(11));
  for (const t of d.destinos.slice(0, 8)) {
    z.texto(m, y, `${t.cliente || "-"} - ${t.pedido}`, { alto: 3.2, ancho: z.util - z.mm(22) });
    y = z.texto(m, y, `${t.cajas} caja${t.cajas === 1 ? "" : "s"}`, { alto: 3.2, alinear: "R" });
  }
  if (d.destinos.length > 8) y = z.texto(m, y, `... y ${d.destinos.length - 8} pickings mas`, { alto: 2.8 });
  if (d.transporte) y = z.texto(m, y + z.mm(1), d.transporte, { alto: 3.4, lineas: 2, negrita: true });
  const base = z.alto - z.margen - z.mm(8) - z.mm(24);
  z.barrasCentradas(Math.max(y, base), d.sscc, 22);
  z.texto(m, z.alto - z.margen - z.mm(6), `(00) ${d.sscc}`, { alto: 4.2, alinear: "C", negrita: true });
  return z.fin();
}

/** Une varias etiquetas en un solo trabajo de impresión. */
export const unirZpl = (etiquetas: string[]) => etiquetas.join("");

/** Etiqueta corta para comprobar la conexión y el tamaño del papel. */
export function zplPrueba(nombre: string, dpi: Dpi = 203) {
  const z = new Lienzo(dpi);
  let y = z.margen;
  y = z.texto(z.margen, y, "PRUEBA DE IMPRESION", { alto: 5, negrita: true });
  y = z.texto(z.margen, y, nombre, { alto: 4 });
  y = z.texto(z.margen, y, `Etiqueta 100 x 150 mm - ${dpi} dpi`, { alto: 3.2 });
  z.barrasCentradas(y + z.mm(4), "0123456789", 20);
  return z.fin();
}
