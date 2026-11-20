import "server-only";
import { readSheet } from "read-excel-file/node";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ESTADO } from "./estados";

// Importación de pedidos desde una planilla (.xlsx) o un CSV: una fila por línea de pedido; las filas con el mismo número de
// pedido forman un pedido. Primero se ANALIZA todo (sin escribir nada) y se muestra qué se creará y qué tiene errores; solo
// después se importa, pedido por pedido (uno con errores no impide los demás). El original cargaba un archivo con columnas
// definidas por una tabla de metadatos del cliente; aquí la planilla modelo es fija y se descarga de la misma pantalla.

export const MAXIMO_FILAS = 5000;
export const MAXIMO_BYTES = 5 * 1024 * 1024;

export const COLUMNAS = [
  { campo: "pedido", titulo: "Pedido", otros: ["numero", "numero de pedido", "no pedido", "npedido"], obligatoria: true },
  { campo: "nit", titulo: "NIT cliente", otros: ["nit", "cliente", "documento", "nit del cliente"], obligatoria: false },
  { campo: "sede", titulo: "Sede", otros: ["sede de entrega", "direccion de entrega", "numero de sede"], obligatoria: false },
  { campo: "fecha", titulo: "Fecha", otros: ["fecha pedido", "fecha del pedido"], obligatoria: false },
  { campo: "vence", titulo: "Vence", otros: ["fecha vence", "vencimiento", "fecha de vencimiento"], obligatoria: false },
  { campo: "ocompra", titulo: "Orden de compra", otros: ["oc", "orden compra", "orden de compra del cliente"], obligatoria: false },
  { campo: "ean", titulo: "Código de barras", otros: ["ean", "codigo", "articulo", "sku", "producto"], obligatoria: true },
  { campo: "bodega", titulo: "Bodega", otros: [], obligatoria: true },
  { campo: "cantidad", titulo: "Cantidad", otros: ["cant", "unidades"], obligatoria: true },
  { campo: "precio", titulo: "Precio", otros: ["precio unitario", "valor unitario"], obligatoria: false },
  { campo: "observaciones", titulo: "Observaciones", otros: ["observacion", "nota", "notas"], obligatoria: false },
] as const;
type Campo = (typeof COLUMNAS)[number]["campo"];
type Fila = { numero: number } & Record<Campo, string>;

export type LineaAnalizada = { fila: number; ean: string; descripcion: string; bodega: string; cantidad: number; precio: number; observaciones: string; errores: string[] };
export type PedidoAnalizado = {
  numero: string;
  sede: { item: number; nombre: string; nit: string } | null;
  fecha: string | null;
  vence: string | null;
  ocompra: string | null;
  lineas: LineaAnalizada[];
  errores: string[];
};
export type Analisis = { error?: string; pedidos: PedidoAnalizado[]; filas: number; ignoradas: string[]; faltantes: string[] };

// ── Lectura del archivo ───────────────────────────────────────────────────────────────────────────────────────────

export function normalizar(t: string) {
  return t.normalize("NFD").replace(/\p{M}/gu, "").trim().toLowerCase().replace(/\s+/g, " ");
}

function celdaATexto(c: unknown) {
  if (c === null || c === undefined) return "";
  if (c instanceof Date) return c.toISOString().slice(0, 10);
  if (typeof c === "number") return String(Number(c.toPrecision(12)));
  return String(c).trim();
}

function leerCsv(contenido: string): string[][] {
  const t = contenido.replace(/^\uFEFF/, "");
  const primera = t.split(/\r?\n/, 1)[0] ?? "";
  // Excel en español guarda los CSV con punto y coma: se usa el separador que más aparece en el encabezado.
  const sep = [";", ",", "\t"].sort((a, b) => primera.split(b).length - primera.split(a).length)[0];
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) { fila.push(celda); celda = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      fila.push(celda); filas.push(fila); fila = []; celda = "";
    } else celda += c;
  }
  if (celda !== "" || fila.length > 0) filas.push([...fila, celda]);
  return filas;
}

function decodificar(bytes: Uint8Array) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    // Un CSV guardado desde Excel en Windows viene en Windows-1252.
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export async function leerArchivo(archivo: File): Promise<{ celdas: string[][] } | { error: string }> {
  if (archivo.size === 0) return { error: "El archivo está vacío." };
  if (archivo.size > MAXIMO_BYTES) return { error: "El archivo es demasiado grande (máximo 5 MB)." };
  const nombre = archivo.name.toLowerCase();
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  try {
    if (nombre.endsWith(".xlsx")) return { celdas: (await readSheet(Buffer.from(bytes))).map((f) => f.map(celdaATexto)) };
    if (nombre.endsWith(".csv") || nombre.endsWith(".txt")) return { celdas: leerCsv(decodificar(bytes)).map((f) => f.map((c) => c.trim())) };
  } catch {
    return { error: "No se pudo leer el archivo. Revisa que sea un Excel (.xlsx) o un CSV válido." };
  }
  return { error: "Elige una planilla de Excel (.xlsx) o un archivo CSV." };
}

// ── Valores ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** Acepta 1234,5 · 1234.5 · 1.234,5 · 1,234.5 · 2.500 (punto de miles). Devuelve null si no es un número. */
export function leerNumero(t: string): number | null {
  const s = t.replace(/\s/g, "").replace(/^\$/, "");
  if (s === "" || !/^-?[\d.,]+$/.test(s)) return null;
  let n: string;
  if (s.includes(",") && s.includes(".")) n = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (s.includes(",")) n = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : s.replace(",", ".");
  else n = /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

/** AAAA-MM-DD, DD/MM/AAAA o DD-MM-AAAA → AAAA-MM-DD, o null si no es una fecha válida. */
export function leerFecha(t: string): string | null {
  let a: number, m: number, d: number;
  let x = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(t);
  if (x) [a, m, d] = [Number(x[1]), Number(x[2]), Number(x[3])];
  else if ((x = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t))) [d, m, a] = [Number(x[1]), Number(x[2]), Number(x[3])];
  else return null;
  const f = new Date(Date.UTC(a, m - 1, d));
  if (a < 1990 || a > 2200 || f.getUTCMonth() !== m - 1 || f.getUTCDate() !== d) return null;
  return f.toISOString().slice(0, 10);
}

// ── Análisis ──────────────────────────────────────────────────────────────────────────────────────────────────────

export async function analizar(db: Db, archivo: File): Promise<Analisis> {
  const vacio = { pedidos: [], filas: 0, ignoradas: [], faltantes: [] };
  const leido = await leerArchivo(archivo);
  if ("error" in leido) return { ...vacio, error: leido.error };

  const [encabezado = [], ...resto] = leido.celdas;
  const titulos = encabezado.map(normalizar);
  const posicion = Object.fromEntries(COLUMNAS.map((c) => [c.campo, titulos.findIndex((t) => t === normalizar(c.titulo) || (c.otros as readonly string[]).includes(t))])) as Record<Campo, number>;
  const faltantes = COLUMNAS.filter((c) => c.obligatoria && posicion[c.campo] === -1).map((c) => c.titulo);
  if (faltantes.length > 0) return { ...vacio, faltantes, error: `A la planilla le faltan columnas obligatorias: ${faltantes.join(", ")}. Descarga la planilla modelo.` };
  const usadas = new Set(Object.values(posicion).filter((p) => p >= 0));
  const ignoradas = encabezado.filter((t, i) => t !== "" && !usadas.has(i));

  const filas: Fila[] = [];
  resto.forEach((celdas, i) => {
    if (celdas.every((c) => c === "")) return;
    const f = { numero: i + 2 } as Fila;
    for (const c of COLUMNAS) f[c.campo] = posicion[c.campo] >= 0 ? (celdas[posicion[c.campo]] ?? "") : "";
    filas.push(f);
  });
  if (filas.length === 0) return { ...vacio, ignoradas, error: "La planilla no tiene filas con datos." };
  if (filas.length > MAXIMO_FILAS) return { ...vacio, ignoradas, error: `La planilla tiene ${filas.length} filas: el máximo es ${MAXIMO_FILAS}. Divídela en varias.` };

  // Lo que existe en la base, consultado una sola vez.
  const nits = [...new Set(filas.map((f) => f.nit).filter(Boolean))];
  const eans = [...new Set(filas.map((f) => f.ean).filter(Boolean))];
  const bodegas = [...new Set(filas.map((f) => f.bodega).filter(Boolean))];
  const numeros = [...new Set(filas.map((f) => f.pedido).filter(Boolean))];
  const items = [...new Set(filas.map((f) => f.sede).filter((s) => /^\d{1,9}$/.test(s)).map(Number))];
  const [clientes, sedesDeNit, sedesPorItem, articulos, bodegasDb, existentes] = await Promise.all([
    db.clientes.findMany({ where: { nit: { in: nits } }, select: { nit: true } }),
    db.clientesDirecciones.findMany({ where: { nit: { in: nits } }, select: { item: true, nit: true, nombrecliente: true, activo: true } }),
    db.clientesDirecciones.findMany({ where: { item: { in: items } }, select: { item: true, nit: true, nombrecliente: true } }),
    db.detalleReferencia.findMany({ where: { productoean: { in: eans } }, select: { productoean: true, descripcion: true } }),
    db.insBodega.findMany({ where: { bodega: { in: bodegas } }, select: { bodega: true } }),
    db.narthEncabezadoPedido.findMany({ where: { npedido: { in: numeros } }, select: { npedido: true } }),
  ]);
  const nitsOk = new Set(clientes.map((c) => c.nit));
  const art = new Map(articulos.map((a) => [a.productoean, a.descripcion ?? a.productoean]));
  const bodOk = new Set(bodegasDb.map((b) => b.bodega));
  const yaExisten = new Set(existentes.map((e) => e.npedido));

  const grupos = new Map<string, Fila[]>();
  const sinNumero: Fila[] = [];
  for (const f of filas) {
    if (!f.pedido) { sinNumero.push(f); continue; }
    grupos.set(f.pedido, [...(grupos.get(f.pedido) ?? []), f]);
  }

  const pedidos: PedidoAnalizado[] = [];
  for (const f of sinNumero) {
    pedidos.push({ numero: `(fila ${f.numero})`, sede: null, fecha: null, vence: null, ocompra: null, lineas: [], errores: [`Fila ${f.numero}: falta el número de pedido.`] });
  }
  for (const [numero, fs] of grupos) {
    const p: PedidoAnalizado = { numero, sede: null, fecha: null, vence: null, ocompra: null, lineas: [], errores: [] };
    if (numero.length > 50) p.errores.push("El número de pedido admite hasta 50 caracteres.");
    if (yaExisten.has(numero)) p.errores.push("Ya existe un pedido con este número.");

    // Datos de cabecera: deben coincidir en todas las filas del pedido (los vacíos no cuentan).
    const unico = (campo: Campo, etiqueta: string) => {
      const v = [...new Set(fs.map((f) => f[campo]).filter(Boolean))];
      if (v.length > 1) p.errores.push(`Las filas traen ${etiqueta} (${v.slice(0, 3).join(", ")}).`);
      return v[0] ?? "";
    };
    const nit = unico("nit", "NIT de cliente distintos");
    const sedeTxt = unico("sede", "sedes distintas");
    const fecha = unico("fecha", "fechas distintas");
    const vence = unico("vence", "fechas de vencimiento distintas");
    p.ocompra = unico("ocompra", "órdenes de compra distintas") || null;
    if (fecha) { p.fecha = leerFecha(fecha); if (!p.fecha) p.errores.push(`La fecha «${fecha}» no es válida (usa AAAA-MM-DD o DD/MM/AAAA).`); }
    if (vence) { p.vence = leerFecha(vence); if (!p.vence) p.errores.push(`La fecha de vencimiento «${vence}» no es válida.`); }
    if (p.fecha && p.vence && p.vence < p.fecha) p.errores.push("El vencimiento es anterior a la fecha del pedido.");

    // Sede de entrega (de ella sale el cliente).
    if (/^\d{1,9}$/.test(sedeTxt)) {
      const s = sedesPorItem.find((x) => x.item === Number(sedeTxt));
      if (!s || !s.nit) p.errores.push(`No existe la sede número ${sedeTxt}.`);
      else if (nit && s.nit !== nit) p.errores.push(`La sede ${sedeTxt} es del cliente ${s.nit}, no del ${nit}.`);
      else p.sede = { item: s.item, nombre: s.nombrecliente ?? `Sede ${s.item}`, nit: s.nit };
    } else if (nit) {
      if (!nitsOk.has(nit)) p.errores.push(`No existe el cliente con NIT ${nit}.`);
      else {
        const suyas = sedesDeNit.filter((s) => s.nit === nit);
        const elegidas = sedeTxt ? suyas.filter((s) => normalizar(s.nombrecliente ?? "") === normalizar(sedeTxt)) : suyas.filter((s) => (s.activo ?? 1) !== 0);
        if (suyas.length === 0) p.errores.push(`El cliente ${nit} no tiene sedes de entrega.`);
        else if (elegidas.length === 1) p.sede = { item: elegidas[0].item, nombre: elegidas[0].nombrecliente ?? `Sede ${elegidas[0].item}`, nit };
        else if (sedeTxt) p.errores.push(elegidas.length === 0 ? `El cliente ${nit} no tiene una sede llamada «${sedeTxt}».` : `El cliente ${nit} tiene varias sedes llamadas «${sedeTxt}»: usa el número de sede.`);
        else p.errores.push(`El cliente ${nit} tiene ${elegidas.length} sedes: indica cuál en la columna Sede (nombre o número).`);
      }
    } else p.errores.push("Indica el NIT del cliente o el número de sede.");

    const vistos = new Set<string>();
    for (const f of fs) {
      const l: LineaAnalizada = { fila: f.numero, ean: f.ean, descripcion: art.get(f.ean) ?? "", bodega: f.bodega, cantidad: 0, precio: 0, observaciones: f.observaciones.slice(0, 800), errores: [] };
      if (!f.ean) l.errores.push("Falta el código de barras.");
      else if (!art.has(f.ean)) l.errores.push(`No existe el artículo ${f.ean}.`);
      if (!f.bodega) l.errores.push("Falta la bodega.");
      else if (!bodOk.has(f.bodega)) l.errores.push(`No existe la bodega ${f.bodega}.`);
      const cant = leerNumero(f.cantidad);
      if (cant === null || cant <= 0 || cant > 1e9) l.errores.push(f.cantidad === "" ? "Falta la cantidad." : `La cantidad «${f.cantidad}» debe ser un número mayor que cero.`);
      else l.cantidad = cant;
      if (f.precio !== "") {
        const pr = leerNumero(f.precio);
        if (pr === null || pr < 0 || pr > 1e12) l.errores.push(`El precio «${f.precio}» debe ser un número, cero o más.`);
        else l.precio = pr;
      }
      const clave = `${f.ean}|${f.bodega}`;
      if (f.ean && f.bodega) {
        if (vistos.has(clave)) l.errores.push("El artículo se repite en el pedido para esa bodega: suma las cantidades en una sola fila.");
        vistos.add(clave);
      }
      p.lineas.push(l);
    }
    pedidos.push(p);
  }
  return { pedidos, filas: filas.length, ignoradas, faltantes: [] };
}

export const pedidoValido = (p: PedidoAnalizado) => p.errores.length === 0 && p.lineas.length > 0 && p.lineas.every((l) => l.errores.length === 0);

// ── Importación ───────────────────────────────────────────────────────────────────────────────────────────────────

export type ResultadoImportacion = { creados: { numero: string; lineas: number }[]; omitidos: { numero: string; motivo: string }[] };

/** Crea los pedidos válidos, cada uno en su transacción: un fallo en uno no afecta a los demás. */
export async function importar(db: Db, pedidos: PedidoAnalizado[], opciones: { aprobar: boolean; usuario: string }): Promise<ResultadoImportacion> {
  const r: ResultadoImportacion = { creados: [], omitidos: [] };
  for (const p of pedidos) {
    if (!pedidoValido(p) || !p.sede) {
      r.omitidos.push({ numero: p.numero, motivo: p.errores[0] ?? p.lineas.find((l) => l.errores.length)?.errores[0] ?? "Tiene errores." });
      continue;
    }
    const sede = p.sede;
    try {
      await db.$transaction(async (tx) => {
        await tx.$executeRaw`LOCK TABLE t_narth_encabezado_pedido IN EXCLUSIVE MODE`;
        if (await tx.narthEncabezadoPedido.findUnique({ where: { npedido: p.numero }, select: { npedido: true } })) throw new Error("existe");
        const max = await tx.narthEncabezadoPedido.aggregate({ _max: { autonped: true } });
        const dia = (s: string | null) => (s ? new Date(`${s}T00:00:00.000Z`) : null);
        await tx.narthEncabezadoPedido.create({
          data: {
            autonped: (max._max.autonped ?? 0) + 1, npedido: p.numero, cliente: sede.nit, nitvble: sede.item, fechapedido: dia(p.fecha) ?? new Date(), fechavence: dia(p.vence),
            ocompra: p.ocompra, registradopor: `${opciones.usuario} (importación)`.slice(0, 50), busca_aprobacion: opciones.aprobar ? ESTADO.APROBADO : ESTADO.EN_ELABORACION,
            ...(opciones.aprobar ? { personaapruebapedido: opciones.usuario.slice(0, 50), fecha_cartera: new Date() } : {}),
          },
        });
        await tx.narthSeriePedido.createMany({
          data: p.lineas.map((l) => ({ numpedido: p.numero, ref: l.ean, bodega: l.bodega, pares: l.cantidad, precio_unitario: l.precio, observaciones: l.observaciones || null, f_ing_orden: new Date(), udsentreg: 0, reserva: 0, ordenpdn: 0 })),
        });
      });
      r.creados.push({ numero: p.numero, lineas: p.lineas.length });
    } catch (e) {
      r.omitidos.push({ numero: p.numero, motivo: e instanceof Error && e.message === "existe" ? "Ya existe un pedido con este número." : "No se pudo crear (error al guardar)." });
      if (!(e instanceof Error && e.message === "existe") && !(e instanceof Prisma.PrismaClientKnownRequestError)) throw e;
    }
  }
  return r;
}
