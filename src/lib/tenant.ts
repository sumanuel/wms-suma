import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { clientePorId, clientePorSlug, urlConexion, type Cliente } from "./nucleo/control";

// ÚNICO lugar donde se crean clientes Prisma (regla de lint). Cada cliente tiene su base, su rol de BD y su propio
// pool; se guardan en un mapa con límite (LRU) para no agotar max_connections cuando hay muchos clientes.

export type Db = PrismaClient;
type Entrada = { db: Db; cliente: Cliente; ultimoUso: number };

const MAX_CLIENTES_ABIERTOS = 20;
const SEGUNDOS_CACHE_CLIENTE = 30;

const g = globalThis as unknown as {
  __wmsDbs?: Map<string, Entrada>;
  __wmsClientes?: Map<string, { cliente: Cliente | null; hasta: number }>;
};
const abiertos = (g.__wmsDbs ??= new Map());
const cacheClientes = (g.__wmsClientes ??= new Map());

/** Fila del cliente con caché corta: un cliente suspendido deja de operar en menos de SEGUNDOS_CACHE_CLIENTE. */
async function cliente(clave: string, cargar: () => Promise<Cliente | null>): Promise<Cliente | null> {
  const hit = cacheClientes.get(clave);
  if (hit && hit.hasta > Date.now()) return hit.cliente;
  const c = await cargar();
  cacheClientes.set(clave, { cliente: c, hasta: Date.now() + SEGUNDOS_CACHE_CLIENTE * 1000 });
  return c;
}

export const buscarClientePorId = (id: string) => cliente(`id:${id}`, () => clientePorId(id));
export const buscarClientePorSlug = (slug: string) => cliente(`slug:${slug}`, () => clientePorSlug(slug));

function cerrarMasAntiguo() {
  let masAntiguo: string | null = null;
  for (const [id, e] of abiertos) if (!masAntiguo || e.ultimoUso < abiertos.get(masAntiguo)!.ultimoUso) masAntiguo = id;
  if (masAntiguo) {
    const e = abiertos.get(masAntiguo)!;
    abiertos.delete(masAntiguo);
    void e.db.$disconnect();
  }
}

/** Base del cliente indicado. Lanza si no existe o está suspendido. */
export async function abrirDb(c: Cliente): Promise<Db> {
  if (c.estado !== "activo") throw new Error("Cliente suspendido");
  const existente = abiertos.get(c.id);
  if (existente) {
    existente.ultimoUso = Date.now();
    return existente.db;
  }
  if (abiertos.size >= MAX_CLIENTES_ABIERTOS) cerrarMasAntiguo();
  const adapter = new PrismaPg({ connectionString: urlConexion(c, "app"), max: c.maxConexiones });
  const db = new PrismaClient({ adapter });
  abiertos.set(c.id, { db, cliente: c, ultimoUso: Date.now() });
  return db;
}

/** Base de un cliente por id (lo que lleva la sesión). */
export async function dbParaClienteId(id: string): Promise<{ db: Db; cliente: Cliente }> {
  const c = await buscarClientePorId(id);
  if (!c) throw new Error("Cliente inexistente");
  return { db: await abrirDb(c), cliente: c };
}

/**
 * Base del cliente de la petición en curso: sale de la sesión firmada, nunca de un parámetro del navegador.
 * Todo el código de negocio llega a los datos por aquí (o por requerirSesion() de dal.ts, que la usa).
 */
export async function dbDelCliente(): Promise<{ db: Db; cliente: Cliente }> {
  const { leerSesion } = await import("./sesion");
  const sesion = await leerSesion();
  if (!sesion) throw new Error("Sin sesión: no hay cliente para esta petición");
  return dbParaClienteId(sesion.clienteId);
}
