// Utilidades ZPL de 100 × 150 mm (203 dpi = 8 puntos/mm, 300 dpi = 12 puntos/mm). Las etiquetas del WMS salen de plantillas (plantillas.ts); aquí queda la etiqueta de prueba.

export type Dpi = 203 | 300;

const ANCHO_MM = 100;
const ALTO_MM = 150;
const MARGEN_MM = 5;

/** Escapa el dato de un campo: con ^FH los caracteres reservados van como _XX (hexadecimal). */
function datoZpl(texto: string) {
  return texto
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[_^~\\]/g, (c) => `_${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

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
