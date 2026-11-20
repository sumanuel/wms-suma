import { Pool } from "pg";
import { descifrar } from "./cifrado";

// Acceso a la base de control (wms_control) con el rol wms_plataforma. SQL directo: es una base pequeña y propia del
// proveedor, sin Prisma. Aquí vive el catálogo de clientes; los datos de negocio nunca.

export type Cliente = {
  id: string;
  slug: string;
  nombre: string;
  estado: "activo" | "suspendido";
  host: string;
  puerto: number;
  base: string;
  usuarioApp: string;
  contrasenaAppCifrada: string;
  usuarioMigrador: string;
  contrasenaMigradorCifrada: string;
  maxConexiones: number;
  modulos: Record<string, boolean>;
  versionEsquema: string | null;
};

type Fila = Record<string, unknown>;

const global_ = globalThis as unknown as { __controlPool?: Pool };

export function poolControl(): Pool {
  if (!global_.__controlPool) {
    const url = process.env.CONTROL_DATABASE_URL;
    if (!url) throw new Error("Falta CONTROL_DATABASE_URL (ejecute npm run local:preparar)");
    global_.__controlPool = new Pool({ connectionString: url, max: 5 });
  }
  return global_.__controlPool;
}

function aCliente(f: Fila): Cliente {
  return {
    id: f.id as string,
    slug: f.slug as string,
    nombre: f.nombre as string,
    estado: f.estado as Cliente["estado"],
    host: f.host as string,
    puerto: f.puerto as number,
    base: f.base as string,
    usuarioApp: f.usuario_app as string,
    contrasenaAppCifrada: f.contrasena_app_cifrada as string,
    usuarioMigrador: f.usuario_migrador as string,
    contrasenaMigradorCifrada: f.contrasena_migrador_cifrada as string,
    maxConexiones: f.max_conexiones as number,
    modulos: (f.modulos ?? {}) as Record<string, boolean>,
    versionEsquema: (f.version_esquema as string | null) ?? null,
  };
}

export async function clientePorSlug(slug: string): Promise<Cliente | null> {
  const r = await poolControl().query("SELECT * FROM cliente WHERE slug = $1", [slug]);
  return r.rows[0] ? aCliente(r.rows[0]) : null;
}

export async function clientePorId(id: string): Promise<Cliente | null> {
  const r = await poolControl().query("SELECT * FROM cliente WHERE id = $1", [id]);
  return r.rows[0] ? aCliente(r.rows[0]) : null;
}

export async function listarClientes(soloActivos = false): Promise<Cliente[]> {
  const r = await poolControl().query(
    `SELECT * FROM cliente ${soloActivos ? "WHERE estado = 'activo'" : ""} ORDER BY slug`,
  );
  return r.rows.map(aCliente);
}

export async function registrarAprovisionamiento(
  clienteId: string | null,
  slug: string,
  accion: string,
  exito: boolean,
  detalle?: string,
) {
  await poolControl().query(
    "INSERT INTO registro_aprovisionamiento (cliente_id, slug, accion, exito, detalle) VALUES ($1,$2,$3,$4,$5)",
    [clienteId, slug, accion, exito, detalle?.slice(0, 2000) ?? null],
  );
}

export async function marcarVersionEsquema(clienteId: string, version: string | null) {
  await poolControl().query("UPDATE cliente SET version_esquema = $2, actualizado_en = now() WHERE id = $1", [
    clienteId,
    version,
  ]);
}

export const contrasenaApp = (c: Cliente) => descifrar(c.contrasenaAppCifrada);
export const contrasenaMigrador = (c: Cliente) => descifrar(c.contrasenaMigradorCifrada);

export function urlConexion(c: Cliente, rol: "app" | "migrador"): string {
  const usuario = rol === "app" ? c.usuarioApp : c.usuarioMigrador;
  const clave = rol === "app" ? contrasenaApp(c) : contrasenaMigrador(c);
  return `postgresql://${encodeURIComponent(usuario)}:${encodeURIComponent(clave)}@${c.host}:${c.puerto}/${c.base}`;
}
