import "server-only";
import net from "node:net";
import { Prisma } from "@/generated/prisma/client";
import type { Db } from "@/lib/tenant";
import { ErrorDeNegocio } from "@/lib/inventario/calidad";
import { formatearFecha } from "@/lib/indicadores/formato";
import { ssccPallet } from "@/lib/etiquetas/codigos";
import { etiquetasCajas, etiquetasDespacho, registrarImpresion } from "@/lib/pallets/etiquetas";
import { detallePallet } from "@/lib/pallets/servicio";
import { etiquetaPalletDespacho } from "@/lib/pallets/despacho";
import { unirZpl, zplCajaDespacho, zplCajaInventario, zplPalletDespacho, zplPalletInventario, type Dpi } from "@/lib/etiquetas/zpl";

// Impresión directa en impresoras de etiquetas de red (Zebra y compatibles): el servidor arma el ZPL y lo envía por TCP al puerto 9100.
// El usuario solo elige una impresora de la lista que administra el WMS; nunca escribe una dirección al imprimir.

export const MAX_ETIQUETAS = 200;
export const TIEMPO_ESPERA_MS = 5000;

export type TipoEtiqueta = "cajas-despacho" | "cajas" | "pallet" | "pallet-despacho";
export type Referencia = { picking?: number; caja?: number; desde?: number; hasta?: number; numero?: number; id?: number };

// ── Impresoras ────────────────────────────────────────────────────────────────────────────────────────────────────

export const impresorasActivas = (db: Db) => db.impresoraEtiquetas.findMany({ where: { activa: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } });
export const listarImpresoras = (db: Db) => db.impresoraEtiquetas.findMany({ orderBy: { nombre: "asc" } });

const HOST = /^[A-Za-z0-9]([A-Za-z0-9.-]{0,118}[A-Za-z0-9])?$/;

export function validarImpresora(d: { nombre: string; host: string; puerto: number; dpi: number }) {
  const nombre = d.nombre.trim(), host = d.host.trim();
  if (!nombre || nombre.length > 40) throw new ErrorDeNegocio("Escribe un nombre de hasta 40 caracteres.");
  if (!HOST.test(host)) throw new ErrorDeNegocio("La dirección debe ser una IP o un nombre de equipo, sin http:// ni espacios.");
  if (/^169\.254\./.test(host)) throw new ErrorDeNegocio("Esa dirección no es válida para una impresora.");
  if (!Number.isInteger(d.puerto) || d.puerto < 1 || d.puerto > 65535) throw new ErrorDeNegocio("El puerto debe estar entre 1 y 65535.");
  if (d.dpi !== 203 && d.dpi !== 300) throw new ErrorDeNegocio("La resolución debe ser 203 o 300 dpi.");
  return { nombre, host, puerto: d.puerto, dpi: d.dpi };
}

export async function crearImpresora(db: Db, d: { nombre: string; host: string; puerto: number; dpi: number }) {
  const v = validarImpresora(d);
  try {
    return await db.impresoraEtiquetas.create({ data: v });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ErrorDeNegocio("Ya hay una impresora con ese nombre.");
    throw e;
  }
}

export async function cambiarActiva(db: Db, id: number, activa: boolean) {
  const r = await db.impresoraEtiquetas.updateMany({ where: { id }, data: { activa } });
  if (r.count === 0) throw new ErrorDeNegocio("No existe esa impresora.");
}

export async function eliminarImpresora(db: Db, id: number) {
  const r = await db.impresoraEtiquetas.deleteMany({ where: { id } });
  if (r.count === 0) throw new ErrorDeNegocio("No existe esa impresora.");
}

/** Abre la conexión, manda los datos y la cierra. Falla con un mensaje claro si la impresora no responde. */
export function enviarPorTcp(host: string, puerto: number, datos: string, espera = TIEMPO_ESPERA_MS): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const s = new net.Socket();
    let listo = false;
    const fin = (e?: Error) => {
      if (listo) return;
      listo = true;
      s.destroy();
      if (e) rechazar(new ErrorDeNegocio(`No se pudo imprimir en ${host}:${puerto}: ${mensajeRed(e)}`));
      else resolver();
    };
    s.setTimeout(espera, () => fin(new Error("no respondió a tiempo")));
    s.once("error", fin);
    s.connect(puerto, host, () => {
      s.write(Buffer.from(datos, "utf8"), (e) => {
        if (e) return fin(e);
        s.end(() => fin());
      });
    });
  });
}

function mensajeRed(e: Error) {
  const c = (e as NodeJS.ErrnoException).code;
  if (c === "ECONNREFUSED") return "la conexión fue rechazada (revisa la dirección y el puerto)";
  if (c === "ENOTFOUND") return "no se encontró el equipo";
  if (c === "EHOSTUNREACH" || c === "ENETUNREACH") return "el equipo no es alcanzable desde el servidor";
  return e.message;
}

// ── ZPL por tipo de etiqueta ──────────────────────────────────────────────────────────────────────────────────────

export type ZplArmado = { zpl: string; etiquetas: number; cajasInventario?: number[] };

export async function armarZpl(db: Db, tipo: TipoEtiqueta, ref: Referencia, dpi: Dpi = 203): Promise<ZplArmado> {
  switch (tipo) {
    case "cajas-despacho": {
      if (!ref.picking) throw new ErrorDeNegocio("Falta el picking.");
      const e = await etiquetasDespacho(db, ref.picking);
      if (!e) throw new ErrorDeNegocio(`No existe el picking ${ref.picking}.`);
      const cajas = ref.caja ? e.cajas.filter((c) => c.numero === ref.caja) : e.cajas;
      if (cajas.length === 0) throw new ErrorDeNegocio("Ese picking no tiene cajas armadas en la aduana.");
      return {
        etiquetas: cajas.length,
        zpl: unirZpl(cajas.map((c) => zplCajaDespacho({
          pedido: e.pedido, picking: e.picking, numero: c.numero, total: e.total, sscc: c.sscc, cliente: e.cliente, direccion: e.direccion, ciudad: e.ciudad, telefono: e.telefono,
          lineas: c.lineas.map((l) => ({ articulo: l.articulo, cantidad: l.cantidad, presentacion: l.presentacion, lote: l.lote, vence: l.vence ? formatearFecha(l.vence) : "" })),
        }, dpi))),
      };
    }
    case "cajas": {
      const desde = ref.desde ?? NaN, hasta = ref.hasta ?? desde;
      if (!Number.isFinite(desde) || !Number.isFinite(hasta) || hasta < desde || hasta - desde >= MAX_ETIQUETAS) throw new ErrorDeNegocio(`Escribe un rango de cajas válido (hasta ${MAX_ETIQUETAS} a la vez).`);
      const cajas = await etiquetasCajas(db, desde, hasta);
      if (cajas.length === 0) throw new ErrorDeNegocio("No hay cajas en ese rango.");
      return {
        etiquetas: cajas.length,
        cajasInventario: cajas.map((c) => c.caja),
        zpl: unirZpl(cajas.map((c) => zplCajaInventario({ caja: c.caja, reimpresion: c.impresa, articulo: c.articulo, ean: c.ean, lote: c.lote, vence: c.vence ? formatearFecha(c.vence) : "", cantidad: c.cantidad, ubicacion: c.ubicacion }, dpi))),
      };
    }
    case "pallet": {
      if (!ref.numero) throw new ErrorDeNegocio("Falta el número del pallet.");
      const p = await detallePallet(db, ref.numero);
      if (!p) throw new ErrorDeNegocio(`No existe el pallet ${ref.numero}.`);
      const por = new Map<string, { articulo: string; lote: string; unidades: number }>();
      for (const c of p.cajas) {
        const k = `${c.ean}|${c.lote}`;
        const x = por.get(k) ?? { articulo: String(c.articulo ?? c.ean ?? ""), lote: String(c.lote ?? ""), unidades: 0 };
        x.unidades += Number(c.saldo ?? 0);
        por.set(k, x);
      }
      return { etiquetas: 1, zpl: zplPalletInventario({ numero: p.numero, cajas: p.cajas.length, unidades: p.unidades, ubicacion: p.ubicaciones.length > 1 ? "Varias" : p.ubicaciones[0] ?? "", lineas: [...por.values()] }, dpi) };
    }
    case "pallet-despacho": {
      if (!ref.id) throw new ErrorDeNegocio("Falta el pallet de despacho.");
      const e = await etiquetaPalletDespacho(db, ref.id);
      if (!e) throw new ErrorDeNegocio(`No existe el pallet de despacho ${ref.id}.`);
      const p = e.pallet;
      return {
        etiquetas: 1,
        zpl: zplPalletDespacho({
          id: ref.id, sscc: ssccPallet(ref.id), bodega: String(p.bodega ?? ""), cajas: e.totales.cajas, peso: p.peso === null ? String(e.totales.kilos) : String(p.peso),
          medidas: p.alto && p.ancho && p.largo ? `${p.largo}x${p.ancho}x${p.alto}` : "-",
          destinos: e.destinos.map((d) => ({ cliente: d.cliente, pedido: d.pedido, cajas: d.cajas })),
          transporte: [p.transportador, p.remesa ? `remesa ${p.remesa}` : "", p.placa].filter(Boolean).join(" - "),
        }, dpi),
      };
    }
  }
}

/** Arma las etiquetas y las envía a una impresora registrada. Las cajas de inventario quedan marcadas como impresas. */
export async function imprimirDirecto(db: Db, impresoraId: number, tipo: TipoEtiqueta, ref: Referencia) {
  const imp = await db.impresoraEtiquetas.findUnique({ where: { id: impresoraId } });
  if (!imp) throw new ErrorDeNegocio("No existe esa impresora.");
  if (!imp.activa) throw new ErrorDeNegocio(`La impresora «${imp.nombre}» está desactivada.`);
  const a = await armarZpl(db, tipo, ref, imp.dpi === 300 ? 300 : 203);
  await enviarPorTcp(imp.host, imp.puerto, a.zpl);
  if (a.cajasInventario) await registrarImpresion(db, a.cajasInventario);
  return { impresora: imp.nombre, etiquetas: a.etiquetas };
}
