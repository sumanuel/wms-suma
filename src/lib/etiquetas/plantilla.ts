// Motor de plantillas ZPL. Una plantilla es texto ZPL con marcas entre dobles llaves que se llenan con los datos de cada etiqueta.
// Funciones puras (sin acceso a la base): se usan al imprimir y al validar lo que escribe el cliente.
//
//   {{campo}}                 dato de texto, ya escapado para ^FH (usa  ^FH^FD{{campo}}^FS)
//   {{=expresión}}            número entero en puntos; admite + - * / ( ), números y variables numéricas (mm, ancho, alto, dpi, modulo, i…)
//   {{centrar campo}}         columna X que centra en la hoja el código Code 128 de ese campo
//   {{#lista 7}} … {{/lista}} repite el bloque por cada elemento de la lista (máximo 7); dentro, {{i}} es el índice desde 0
//   {{#si campo}} … {{/si}}   incluye el bloque solo si el campo no está vacío

export class ErrorPlantilla extends Error {}

export type Valor = string | number | boolean | Fila[];
export type Fila = { [campo: string]: Valor };

type Nodo =
  | { t: "txt"; v: string }
  | { t: "var"; n: string; linea: number }
  | { t: "expr"; e: string; linea: number }
  | { t: "centrar"; n: string; linea: number }
  | { t: "lista"; n: string; max: number; hijos: Nodo[]; linea: number }
  | { t: "si"; n: string; hijos: Nodo[]; linea: number };

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_PLANTILLA = 20000;

/** Escapa un dato para un campo con ^FH: ^ ~ _ y \ van en hexadecimal (_XX); los saltos de línea se vuelven espacios. */
export function datoZpl(texto: string) {
  return texto.replace(/[\r\n\t]+/g, " ").replace(/[_^~\\]/g, (c) => `_${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
}

export function analizar(fuente: string): Nodo[] {
  if (fuente.length > MAX_PLANTILLA) throw new ErrorPlantilla(`La plantilla es demasiado larga (máximo ${MAX_PLANTILLA} caracteres).`);
  const raiz: Nodo[] = [];
  const pila: { hijos: Nodo[]; cierre: string; linea: number }[] = [{ hijos: raiz, cierre: "", linea: 0 }];
  const partes = fuente.split(/(\{\{[^}]*\}\})/);
  let linea = 1;
  for (const p of partes) {
    const m = /^\{\{([^}]*)\}\}$/.exec(p);
    const actual = pila[pila.length - 1].hijos;
    if (!m) {
      if (p) actual.push({ t: "txt", v: p });
    } else {
      const c = m[1].trim();
      if (c.startsWith("=")) actual.push({ t: "expr", e: c.slice(1), linea });
      else if (c.startsWith("centrar ")) {
        const n = c.slice(8).trim();
        if (!IDENT.test(n)) throw new ErrorPlantilla(`Línea ${linea}: «${c}» no es válido; usa {{centrar campo}}.`);
        actual.push({ t: "centrar", n, linea });
      } else if (c.startsWith("#")) {
        const [tipo, ...resto] = c.slice(1).trim().split(/\s+/);
        if (tipo === "si") {
          if (resto.length !== 1 || !IDENT.test(resto[0])) throw new ErrorPlantilla(`Línea ${linea}: usa {{#si campo}}.`);
          const nodo: Nodo = { t: "si", n: resto[0], hijos: [], linea };
          actual.push(nodo);
          pila.push({ hijos: nodo.hijos, cierre: "si", linea });
        } else if (IDENT.test(tipo ?? "")) {
          const max = resto.length === 0 ? 1000 : Number(resto[0]);
          if (resto.length > 1 || !Number.isInteger(max) || max < 1 || max > 1000) throw new ErrorPlantilla(`Línea ${linea}: en {{#${tipo} …}} el máximo debe ser un entero entre 1 y 1000.`);
          const nodo: Nodo = { t: "lista", n: tipo, max, hijos: [], linea };
          actual.push(nodo);
          pila.push({ hijos: nodo.hijos, cierre: tipo, linea });
        } else throw new ErrorPlantilla(`Línea ${linea}: «{{${c}}}» no es válido.`);
      } else if (c.startsWith("/")) {
        const n = c.slice(1).trim();
        const arriba = pila[pila.length - 1];
        if (pila.length === 1 || arriba.cierre !== n) throw new ErrorPlantilla(`Línea ${linea}: {{/${n}}} no cierra ningún bloque abierto${pila.length > 1 ? ` (se esperaba {{/${arriba.cierre}}})` : ""}.`);
        pila.pop();
      } else if (IDENT.test(c)) actual.push({ t: "var", n: c, linea });
      else throw new ErrorPlantilla(`Línea ${linea}: «{{${c}}}» no es válido.`);
    }
    linea += (p.match(/\n/g) ?? []).length;
  }
  if (pila.length > 1) throw new ErrorPlantilla(`Línea ${pila[pila.length - 1].linea}: falta cerrar {{/${pila[pila.length - 1].cierre}}}.`);
  return raiz;
}

// ── Expresiones numéricas (sin eval) ──────────────────────────────────────────────────────────────────────────────

function evaluar(e: string, ctx: Fila, linea: number): number {
  const tokens = e.match(/\d+(?:\.\d+)?|[A-Za-z_]\w*|[-+*/()]|\S/g) ?? [];
  let pos = 0;
  const falla = (msg: string): never => { throw new ErrorPlantilla(`Línea ${linea}: ${msg} en «=${e.trim()}».`); };
  const factor = (): number => {
    const t = tokens[pos++];
    if (t === undefined) return falla("la expresión está incompleta");
    if (t === "-") return -factor();
    if (t === "+") return factor();
    if (t === "(") { const v = suma(); if (tokens[pos++] !== ")") falla("falta cerrar el paréntesis"); return v; }
    if (/^\d/.test(t)) return Number(t);
    if (IDENT.test(t)) {
      const v = ctx[t];
      if (v === undefined) return falla(`la variable «${t}» no existe`);
      const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
      if (!Number.isFinite(n)) return falla(`«${t}» no es un número`);
      return n;
    }
    return falla(`símbolo «${t}» no permitido`);
  };
  const termino = (): number => {
    let v = factor();
    while (tokens[pos] === "*" || tokens[pos] === "/") { const o = tokens[pos++]; const d = factor(); v = o === "*" ? v * d : d === 0 ? falla("división por cero") : v / d; }
    return v;
  };
  const suma = (): number => {
    let v = termino();
    while (tokens[pos] === "+" || tokens[pos] === "-") { const o = tokens[pos++]; const d = termino(); v = o === "+" ? v + d : v - d; }
    return v;
  };
  const r = suma();
  if (pos < tokens.length) falla(`sobra «${tokens[pos]}»`);
  return Math.round(r);
}

function texto(v: Valor | undefined, n: string, linea: number) {
  if (v === undefined) throw new ErrorPlantilla(`Línea ${linea}: la variable «${n}» no existe.`);
  if (Array.isArray(v)) throw new ErrorPlantilla(`Línea ${linea}: «${n}» es una lista; úsala con {{#${n}}} … {{/${n}}}.`);
  return String(v);
}

function emitir(nodos: Nodo[], ctx: Fila, salida: string[]) {
  for (const n of nodos) {
    switch (n.t) {
      case "txt": salida.push(n.v); break;
      case "var": salida.push(datoZpl(texto(ctx[n.n], n.n, n.linea))); break;
      case "expr": salida.push(String(evaluar(n.e, ctx, n.linea))); break;
      case "centrar": {
        const dato = texto(ctx[n.n], n.n, n.linea);
        const simbolos = /^\d+$/.test(dato) ? Math.ceil(dato.length / 2) : dato.length;
        const modulos = 11 * (simbolos + 2) + 13;
        const modulo = Number(ctx.modulo ?? 2), ancho = Number(ctx.ancho ?? 800), margen = Math.round(5 * Number(ctx.mm ?? 8));
        salida.push(String(Math.max(margen, Math.round((ancho - modulos * modulo) / 2))));
        break;
      }
      case "lista": {
        const l = ctx[n.n];
        if (!Array.isArray(l)) throw new ErrorPlantilla(`Línea ${n.linea}: «${n.n}» no es una lista.`);
        l.slice(0, n.max).forEach((item, i) => emitir(n.hijos, { ...ctx, ...item, i }, salida));
        break;
      }
      case "si": {
        const v = ctx[n.n];
        if (v === undefined) throw new ErrorPlantilla(`Línea ${n.linea}: la variable «${n.n}» no existe.`);
        const lleno = Array.isArray(v) ? v.length > 0 : v !== "" && v !== 0 && v !== false;
        if (lleno) emitir(n.hijos, ctx, salida);
        break;
      }
    }
  }
}

/** Llena la plantilla con los datos. `dpi` fija los puntos por milímetro (`mm`) y el ancho y alto de la hoja de 100 × 150 mm. */
export function renderizar(fuente: string, datos: Fila, dpi: 203 | 300 = 203) {
  const mm = dpi / 25.4;
  const ctx: Fila = { ...datos, dpi, mm, ancho: Math.round(100 * mm), alto: Math.round(150 * mm), modulo: dpi === 300 ? 3 : 2 };
  const salida: string[] = [];
  emitir(analizar(fuente), ctx, salida);
  return salida.join("").replace(/\r/g, "").replace(/\n[ \t]*(?=\n)/g, "").trim() + "\n"; // las marcas de bloque solas en su línea no dejan renglones vacíos
}

/** Revisa que la plantilla se pueda llenar y que sea un trabajo ZPL completo. Lanza ErrorPlantilla con el motivo. */
export function validarPlantilla(fuente: string, muestra: Fila) {
  if (!fuente.trim()) throw new ErrorPlantilla("La plantilla está vacía.");
  if (!/\^XA/.test(fuente) || !/\^XZ/.test(fuente)) throw new ErrorPlantilla("La plantilla debe empezar con ^XA y terminar con ^XZ.");
  if ((fuente.match(/\^XA/g) ?? []).length !== (fuente.match(/\^XZ/g) ?? []).length) throw new ErrorPlantilla("Hay más ^XA que ^XZ (o al revés).");
  for (const dpi of [203, 300] as const) renderizar(fuente, muestra, dpi);
}
