import "server-only";
import type { CampoForm } from "@/lib/formularios";
import { leerFormulario } from "@/lib/formularios";
import { MAXIMO_FILAS, leerArchivo, leerFecha, leerNumero, normalizar } from "@/lib/pedidos/importacion";
import type { Db } from "@/lib/tenant";
import { camposDe } from "./nucleo";
import type { Fila, Maestro } from "./tipos";

// Importación de maestros desde una planilla (.xlsx o CSV). Es genérica: sirve para cualquier maestro y reutiliza sus campos y
// sus reglas de validación (las mismas del formulario: longitudes, números, opciones, claves que deben existir…). Las
// columnas de la planilla son los campos del formulario. Primero se ANALIZA (sin escribir) y después se importa fila por fila:
// una fila con error no impide las demás.

export type Modo = "crear" | "actualizar";
export type FilaAnalizada = { fila: number; clave: string; accion: "crear" | "actualizar"; errores: string[] };
export type AnalisisMaestro = { error?: string; filas: FilaAnalizada[]; total: number; ignoradas: string[] };
type Trabajo = FilaAnalizada & { datos: Record<string, unknown>; where: Fila | null };

const tituloDe = (c: CampoForm) => c.etiqueta.replace(/\s*\(opcional\)\s*$/i, "").trim();
const limpiarTitulo = (t: string) => normalizar(t.replace(/\s*\*+\s*$/, "").replace(/\s*\(opcional\)\s*$/i, ""));

/** Encabezados de la planilla modelo: el nombre del campo, con * si es obligatorio. */
export function encabezadosModelo(campos: CampoForm[], m: Maestro) {
  return campos.map((c) => `${tituloDe(c)}${c.requerido || (c.nombre === m.clave.campo && !m.clave.autogenerada) ? " *" : ""}`);
}

const SI = new Set(["si", "s", "1", "true", "verdadero", "x", "yes", "y"]);
const NO = new Set(["no", "n", "0", "false", "falso"]);

/** Pasa el texto de la celda al formato que espera el campo; si no se puede, devuelve el texto tal cual para que el campo lo rechace. */
function valorDe(c: CampoForm, crudo: string): { valor: string; error?: string } {
  const t = crudo.trim();
  if (c.tipo === "booleano") {
    const n = normalizar(t);
    if (t === "" || NO.has(n)) return { valor: "" };
    return SI.has(n) ? { valor: "on" } : { valor: "", error: `${tituloDe(c)}: usa Sí o No (no «${t}»).` };
  }
  if (t === "") return { valor: "" };
  if (c.tipo === "entero" || c.tipo === "decimal") {
    const n = leerNumero(t);
    return { valor: n === null ? t : String(n) };
  }
  if (c.tipo === "fecha") return { valor: leerFecha(t) ?? t };
  if (c.tipo === "seleccion") {
    const n = normalizar(t);
    const o = c.opciones?.find((x) => normalizar(x.valor) === n || normalizar(x.etiqueta) === n || normalizar(x.etiqueta).startsWith(`${n} ·`));
    if (o) return { valor: o.valor };
    const posibles = (c.opciones ?? []).slice(0, 6).map((x) => x.valor).join(", ");
    return { valor: t, error: `${tituloDe(c)}: «${t}» no es una opción válida${posibles ? ` (por ejemplo: ${posibles})` : ""}.` };
  }
  return { valor: t };
}

async function trabajar(db: Db, m: Maestro, archivo: File, modo: Modo): Promise<{ error?: string; trabajos: Trabajo[]; total: number; ignoradas: string[] }> {
  const vacio = { trabajos: [], total: 0, ignoradas: [] as string[] };
  const leido = await leerArchivo(archivo);
  if ("error" in leido) return { ...vacio, error: leido.error };
  const campos = await camposDe(m, db);
  const [encabezado = [], ...resto] = leido.celdas;
  const titulos = encabezado.map(limpiarTitulo);
  const pos = new Map(campos.map((c) => [c.nombre, titulos.findIndex((t) => t === limpiarTitulo(tituloDe(c)) || t === normalizar(c.nombre))]));

  const claveCampo = campos.find((c) => c.nombre === m.clave.campo);
  const obligatorias = campos.filter((c) => (c.requerido || (c.nombre === m.clave.campo && !m.clave.autogenerada)) && pos.get(c.nombre) === -1);
  // Al actualizar solo hace falta la clave; el resto de columnas son las que se quieren cambiar.
  const faltan = modo === "actualizar" ? obligatorias.filter((c) => c.nombre === m.clave.campo) : obligatorias;
  if (faltan.length > 0) return { ...vacio, error: `A la planilla le faltan columnas obligatorias: ${faltan.map(tituloDe).join(", ")}. Descarga la planilla modelo.` };
  if (m.clave.autogenerada && modo === "actualizar") return { ...vacio, error: "Este maestro no tiene una clave que se escriba a mano: solo se pueden crear registros nuevos." };
  const usadas = new Set([...pos.values()].filter((p) => p >= 0));
  const ignoradas = encabezado.filter((t, i) => t !== "" && !usadas.has(i));

  const filas = resto.map((celdas, i) => ({ fila: i + 2, celdas })).filter((f) => f.celdas.some((c) => c !== ""));
  if (filas.length === 0) return { ...vacio, ignoradas, error: "La planilla no tiene filas con datos." };
  if (filas.length > MAXIMO_FILAS) return { ...vacio, ignoradas, error: `La planilla tiene ${filas.length} filas: el máximo es ${MAXIMO_FILAS}. Divídela en varias.` };

  const d = m.delegado(db);
  const llaves = filas.map((f) => (pos.get(m.clave.campo) ?? -1) >= 0 ? (f.celdas[pos.get(m.clave.campo)!] ?? "").trim() : "").filter(Boolean);
  const existentes = new Set<string>();
  if (!m.clave.autogenerada && llaves.length > 0) {
    for (const r of await d.findMany({ where: { [m.clave.campo]: { in: [...new Set(llaves)] } } })) existentes.add(String(r[m.clave.campo]));
  }

  const trabajos: Trabajo[] = [];
  const vistos = new Set<string>();
  for (const { fila, celdas } of filas) {
    const crudos: Record<string, string> = {};
    for (const c of campos) {
      const p = pos.get(c.nombre) ?? -1;
      crudos[c.nombre] = p >= 0 ? (celdas[p] ?? "") : "";
    }
    const clave = (crudos[m.clave.campo] ?? "").trim();
    const errores: string[] = [];
    const existe = clave !== "" && existentes.has(clave);
    const accion: "crear" | "actualizar" = existe && modo === "actualizar" ? "actualizar" : "crear";

    if (!m.clave.autogenerada) {
      if (clave === "") errores.push(`Falta ${tituloDe(claveCampo ?? { etiqueta: m.clave.campo } as CampoForm)}.`);
      else if (vistos.has(clave)) errores.push(`«${clave}» se repite en la planilla (primera vez en una fila anterior).`);
      else if (existe && modo === "crear") errores.push(`Ya existe ${m.genero === "el" ? "un" : "una"} ${m.singular} con este código. Elige «Crear y actualizar» para modificarlo.`);
      if (clave !== "") vistos.add(clave);
    }

    // Al actualizar, una celda vacía no cambia el dato existente: solo se tocan las columnas con valor.
    const consideradas = accion === "actualizar" ? campos.filter((c) => c.nombre !== m.clave.campo && (crudos[c.nombre] ?? "").trim() !== "") : campos;
    const fd = new FormData();
    for (const c of consideradas) {
      const v = valorDe(c, crudos[c.nombre] ?? "");
      if (v.error) errores.push(v.error);
      if (v.valor !== "") fd.set(c.nombre, v.valor);
    }
    if (accion === "actualizar" && consideradas.length === 0) errores.push("No trae ningún dato para cambiar.");
    const f = leerFormulario(consideradas, fd, accion === "actualizar");
    for (const [campo, msg] of Object.entries(f.errores)) {
      const c = campos.find((x) => x.nombre === campo);
      if (!errores.some((e) => e.startsWith(`${c ? tituloDe(c) : campo}:`))) errores.push(`${c ? tituloDe(c) : campo}: ${msg}`);
    }
    if (errores.length === 0 && f.ok && (accion === "crear" || consideradas.length > 0)) {
      const extra = await m.validar?.(db, accion === "crear" ? f.datos : { ...f.datos, [m.clave.campo]: clave }, accion === "actualizar");
      for (const [campo, msg] of Object.entries(extra ?? {})) {
        const c = campos.find((x) => x.nombre === campo);
        errores.push(`${c ? tituloDe(c) : campo}: ${msg}`);
      }
    }
    trabajos.push({
      fila, clave: clave || "—", accion, errores,
      datos: f.datos,
      where: accion === "actualizar" ? { [m.clave.campo]: clave } : null,
    });
  }
  return { trabajos, total: filas.length, ignoradas };
}

export async function analizarMaestro(db: Db, m: Maestro, archivo: File, modo: Modo): Promise<AnalisisMaestro> {
  const r = await trabajar(db, m, archivo, modo);
  return { error: r.error, total: r.total, ignoradas: r.ignoradas, filas: r.trabajos.map(({ fila, clave, accion, errores }) => ({ fila, clave, accion, errores })) };
}

export type ResultadoMaestro = { creadas: number; actualizadas: number; omitidas: { fila: number; clave: string; motivo: string }[] };

export async function importarMaestro(db: Db, m: Maestro, archivo: File, modo: Modo): Promise<{ error?: string; analisis?: AnalisisMaestro; resultado?: ResultadoMaestro }> {
  const r = await trabajar(db, m, archivo, modo);
  const analisis: AnalisisMaestro = { error: r.error, total: r.total, ignoradas: r.ignoradas, filas: r.trabajos.map(({ fila, clave, accion, errores }) => ({ fila, clave, accion, errores })) };
  if (r.error) return { error: r.error, analisis };
  const resultado: ResultadoMaestro = { creadas: 0, actualizadas: 0, omitidas: [] };
  for (const t of r.trabajos) {
    if (t.errores.length > 0) {
      resultado.omitidas.push({ fila: t.fila, clave: t.clave, motivo: t.errores[0] });
      continue;
    }
    try {
      await db.$transaction(async (tx) => {
        const txDb = tx as unknown as Db;
        const d = m.delegado(txDb);
        if (t.accion === "actualizar" && t.where) await d.update({ where: t.where, data: t.datos });
        else await d.create({ data: m.completar ? await m.completar(txDb, t.datos) : t.datos });
      });
      if (t.accion === "actualizar") resultado.actualizadas++;
      else resultado.creadas++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      const motivo = /unique|P2002/i.test(msg) ? (m.mensajeDuplicado ?? "Ya existe un registro con esos datos.") : /foreign|P2003/i.test(msg) ? "Un dato apunta a un registro que no existe." : "No se pudo guardar esta fila.";
      resultado.omitidas.push({ fila: t.fila, clave: t.clave, motivo });
    }
  }
  return { analisis, resultado };
}
