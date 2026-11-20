// Formularios de ficha dirigidos por una lista de campos: una sola definición sirve para dibujar el formulario y para
// validarlo en el servidor. El servidor nunca confía en lo que dibujó el navegador: vuelve a leer todo con `leerFormulario`.

export type CampoForm = {
  nombre: string;
  etiqueta: string;
  tipo: "texto" | "textoLargo" | "entero" | "decimal" | "booleano" | "seleccion" | "fecha";
  max?: number;
  requerido?: boolean;
  ayuda?: string;
  opciones?: { valor: string; etiqueta: string }[];
  // La clave del registro: se escribe al crear y queda fija al editar.
  soloCrear?: boolean;
  // Ancho en columnas de la grilla (1 a 3).
  ancho?: 1 | 2 | 3;
  // Selección cuya columna es numérica (por ejemplo, un indicador 0/1): se guarda como número.
  numerico?: boolean;
};

export type Valores = Record<string, string | boolean>;
export type EstadoForm = { error?: string; errores?: Record<string, string>; valores?: Valores; intento?: number };

export type Dato = string | number | boolean | Date | null;

export function leerFormulario(campos: CampoForm[], form: FormData, editando: boolean) {
  const datos: Record<string, Dato> = {};
  const errores: Record<string, string> = {};
  const valores: Valores = {};

  for (const c of campos) {
    if (c.soloCrear && editando) continue;
    if (c.tipo === "booleano") {
      datos[c.nombre] = valores[c.nombre] = form.get(c.nombre) === "on";
      continue;
    }
    const crudo = String(form.get(c.nombre) ?? "").trim();
    valores[c.nombre] = crudo;
    if (crudo === "") {
      if (c.requerido) errores[c.nombre] = "Este campo es obligatorio.";
      datos[c.nombre] = null;
      continue;
    }
    if (c.tipo === "entero" || c.tipo === "decimal") {
      const n = Number(crudo.replace(",", "."));
      if (!Number.isFinite(n) || (c.tipo === "entero" && !Number.isInteger(n))) {
        errores[c.nombre] = c.tipo === "entero" ? "Debe ser un número entero." : "Debe ser un número.";
      } else if (Math.abs(n) > 1e12) {
        errores[c.nombre] = "El número es demasiado grande.";
      } else datos[c.nombre] = n;
      continue;
    }
    if (c.tipo === "fecha") {
      // Las fechas de negocio son de día completo: se guardan como medianoche UTC (como las lee el resto del sistema).
      const f = /^(\d{4})-(\d{2})-(\d{2})$/.exec(crudo);
      const d = f ? new Date(Date.UTC(Number(f[1]), Number(f[2]) - 1, Number(f[3]))) : null;
      if (!d || Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1900 || d.getUTCFullYear() > 2200 || d.toISOString().slice(0, 10) !== crudo) {
        errores[c.nombre] = "Debe ser una fecha válida.";
      } else datos[c.nombre] = d;
      continue;
    }
    if (c.tipo === "seleccion" && !c.opciones?.some((o) => o.valor === crudo)) {
      errores[c.nombre] = "Elige una de las opciones.";
      continue;
    }
    if (c.tipo === "seleccion" && c.numerico) {
      datos[c.nombre] = Number(crudo);
      continue;
    }
    if (c.max && crudo.length > c.max) {
      errores[c.nombre] = `Máximo ${c.max} caracteres.`;
      continue;
    }
    datos[c.nombre] = crudo;
  }
  return { datos, errores, valores, ok: Object.keys(errores).length === 0 };
}

/** Pasa un registro de la base a los textos que muestra el formulario. */
export function valoresDe(campos: CampoForm[], registro: Record<string, unknown> | null): Valores {
  const v: Valores = {};
  for (const c of campos) {
    const x = registro?.[c.nombre];
    v[c.nombre] =
      c.tipo === "booleano" ? x === true : x instanceof Date ? x.toISOString().slice(0, 10) : x === null || x === undefined ? "" : String(x);
  }
  return v;
}

/** Un registro con dependientes (por ejemplo, un artículo con movimientos) no se puede eliminar. */
export function esViolacionDeClave(e: unknown) {
  const x = e as { code?: string; message?: string; cause?: { originalCode?: string } };
  return x?.code === "P2003" || x?.cause?.originalCode === "23503" || /foreign key/i.test(x?.message ?? "");
}

/** Choca con una restricción de unicidad (el mismo dato ya existe). */
export function esViolacionUnica(e: unknown) {
  const x = e as { code?: string; message?: string; cause?: { originalCode?: string } };
  return x?.code === "P2002" || x?.cause?.originalCode === "23505" || /unique constraint/i.test(x?.message ?? "");
}
