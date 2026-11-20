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
