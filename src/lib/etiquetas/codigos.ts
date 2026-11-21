import "server-only";
import bwipjs from "bwip-js/node";

/** Código de barras Code 128 como SVG (sin texto: la etiqueta lo escribe aparte). */
export function codigoBarras(texto: string, alto = 12) {
  return bwipjs.toSVG({ bcid: "code128", text: texto, height: alto, includetext: false, paddingwidth: 0, paddingheight: 0 });
}

/** SSCC de 18 dígitos (GS1): dígito de extensión 0, serie de 16 dígitos (picking y número de caja) y dígito de control. Sin prefijo de empresa propio. */
export function sscc(picking: number, caja: number) {
  const base = `0${String(picking).padStart(9, "0")}${String(caja).padStart(7, "0")}`; // 17 dígitos
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += Number(base[i]) * (i % 2 === 0 ? 3 : 1);
  return `${base}${(10 - (suma % 10)) % 10}`;
}

/** SSCC de 18 dígitos de un pallet de despacho: extensión 1 (pallet), serie de 16 dígitos y dígito de control. */
export function ssccPallet(id: number) {
  const base = `1${String(id).padStart(16, "0")}`;
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += Number(base[i]) * (i % 2 === 0 ? 3 : 1);
  return `${base}${(10 - (suma % 10)) % 10}`;
}

/** Deja solo los dígitos de un SSCC leído (acepta «(00)», espacios y guiones) y comprueba largo y dígito de control. */
function digitosSscc(texto: string) {
  let d = texto.replace(/\D/g, "");
  if (d.length === 20 && d.startsWith("00")) d = d.slice(2); // identificador de aplicación (00) leído con el código
  if (d.length !== 18) return null;
  let suma = 0;
  for (let i = 0; i < 17; i++) suma += Number(d[i]) * (i % 2 === 0 ? 3 : 1);
  return (10 - (suma % 10)) % 10 === Number(d[17]) ? d : null;
}

/** Lee el SSCC de una caja de despacho (extensión 0): devuelve su picking y su número de caja, o null si no es válido. */
export function leerSsccCaja(texto: string) {
  const d = digitosSscc(texto);
  if (!d || d[0] !== "0") return null;
  const picking = Number(d.slice(1, 10)), caja = Number(d.slice(10, 17));
  return picking > 0 && caja > 0 ? { picking, caja } : null;
}

/** Lee el SSCC de un pallet de despacho (extensión 1): devuelve su número, o null. */
export function leerSsccPallet(texto: string) {
  const d = digitosSscc(texto);
  if (!d || d[0] !== "1") return null;
  const id = Number(d.slice(1, 17));
  return id > 0 ? id : null;
}
