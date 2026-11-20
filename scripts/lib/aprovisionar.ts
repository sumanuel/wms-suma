import "dotenv/config";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { cifrar } from "../../src/lib/nucleo/cifrado";
import { generarTemporal, hashear } from "../../src/lib/nucleo/contrasenas";
import {
  clientePorSlug,
  marcarVersionEsquema,
  poolControl,
  registrarAprovisionamiento,
  urlConexion,
  type Cliente,
} from "../../src/lib/nucleo/control";
import { TODOS_LOS_PERMISOS } from "../../src/lib/nucleo/modulos";

// Aprovisionamiento de clientes: una base de datos y dos roles (app y migrador) por cliente. Solo lo usan los scripts.

export const SLUG = /^[a-z][a-z0-9_]{2,30}$/;

export function requerirEntorno(...nombres: string[]) {
  const faltan = nombres.filter((n) => !process.env[n]);
  if (faltan.length) {
    console.error(`Faltan variables en .env: ${faltan.join(", ")}. Ejecute npm run local:preparar.`);
    process.exit(1);
  }
}

/** Conexión de administrador (superusuario) al servidor, a la base indicada. Solo para aprovisionar. */
export async function conectarAdmin(base = "postgres"): Promise<Client> {
  requerirEntorno("PG_ADMIN_PASSWORD");
  const c = new Client({
    host: process.env.PG_HOST ?? "127.0.0.1",
    port: Number(process.env.PG_PORT ?? 5432),
    user: process.env.PG_ADMIN_USER ?? "postgres",
    password: process.env.PG_ADMIN_PASSWORD,
    database: base,
  });
  await c.connect();
  return c;
}

export const nombresDe = (slug: string) => {
  const base = `wms_cliente_${slug}`;
  return { base, app: `${base}_app`, mig: `${base}_mig` };
};

export function ultimaMigracion(): string | null {
  const dir = join(process.cwd(), "prisma", "migrations");
  const nombres = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  return nombres.at(-1) ?? null;
}

/** prisma migrate deploy contra la base de UN cliente, con el rol migrador. */
export function migrar(cliente: Cliente): { ok: boolean; salida: string } {
  const r = spawnSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: urlConexion(cliente, "migrador") },
    encoding: "utf8",
    shell: true,
  });
  return { ok: r.status === 0, salida: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** Permisos del rol de la app: solo datos (DML), nunca DDL ni la tabla de migraciones. Idempotente. */
export async function aplicarPermisos(cliente: Cliente) {
  const admin = await conectarAdmin(cliente.base);
  try {
    const app = admin.escapeIdentifier(cliente.usuarioApp);
    const mig = admin.escapeIdentifier(cliente.usuarioMigrador);
    await admin.query(`
      REVOKE ALL ON DATABASE ${admin.escapeIdentifier(cliente.base)} FROM PUBLIC;
      GRANT CONNECT ON DATABASE ${admin.escapeIdentifier(cliente.base)} TO ${app}, ${mig};
      REVOKE ALL ON SCHEMA public FROM PUBLIC;
      GRANT USAGE ON SCHEMA public TO ${app};
      GRANT ALL ON SCHEMA public TO ${mig};
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${app};
      GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${app};
      ALTER DEFAULT PRIVILEGES FOR ROLE ${mig} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${app};
      ALTER DEFAULT PRIVILEGES FOR ROLE ${mig} IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${app};
    `);
    const existe = await admin.query("SELECT to_regclass('public._prisma_migrations') AS t");
    if (existe.rows[0].t) await admin.query(`REVOKE ALL ON TABLE public._prisma_migrations FROM ${app}`);
  } finally {
    await admin.end();
  }
}

export type ResultadoAlta = { slug: string; email: string; contrasenaTemporal: string };

export async function crearCliente(slug: string, nombre: string, emailAdmin?: string): Promise<ResultadoAlta> {
  if (!SLUG.test(slug)) throw new Error("El código del cliente debe ser minúsculas, números o _, empezar con letra (3 a 31).");
  if (await clientePorSlug(slug)) throw new Error(`Ya existe el cliente "${slug}".`);
  const email = (emailAdmin ?? `admin@${slug}.local`).toLowerCase();

  const { base, app, mig } = nombresDe(slug);
  const claveApp = randomBytes(24).toString("hex");
  const claveMig = randomBytes(24).toString("hex");

  const admin = await conectarAdmin();
  let creadoEnServidor = false;
  try {
    const q = (s: string) => admin.escapeIdentifier(s);
    const l = (s: string) => admin.escapeLiteral(s);
    await admin.query(`CREATE ROLE ${q(mig)} LOGIN PASSWORD ${l(claveMig)}`);
    await admin.query(`CREATE ROLE ${q(app)} LOGIN PASSWORD ${l(claveApp)}`);
    creadoEnServidor = true;
    // Los roles de la base no pueden crear bases ni roles ni ver otras bases: solo conectan a la suya.
    await admin.query(`CREATE DATABASE ${q(base)} OWNER ${q(mig)} ENCODING 'UTF8'`);

    const filaControl = await poolControl().query(
      `INSERT INTO cliente (slug, nombre, host, puerto, base, usuario_app, contrasena_app_cifrada,
                            usuario_migrador, contrasena_migrador_cifrada)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [
        slug,
        nombre,
        process.env.PG_HOST ?? "127.0.0.1",
        Number(process.env.PG_PORT ?? 5432),
        base,
        app,
        cifrar(claveApp),
        mig,
        cifrar(claveMig),
      ],
    );
    const id = filaControl.rows[0].id as string;
    const cliente = (await clientePorSlug(slug))!;

    await aplicarPermisos(cliente); // CONNECT y esquema antes de migrar
    const m = migrar(cliente);
    if (!m.ok) throw new Error(`Falló prisma migrate deploy:\n${m.salida}`);
    await aplicarPermisos(cliente); // ahora ya existen las tablas

    // Datos iniciales con el rol migrador (el de la app no puede crear perfiles de administrador por sí solo).
    const contrasenaTemporal = generarTemporal();
    const seed = new Client({ connectionString: urlConexion(cliente, "migrador") });
    await seed.connect();
    try {
      await seed.query("BEGIN");
      const p = await seed.query(
        "INSERT INTO perfil (nombre, descripcion, es_administrador) VALUES ('Administrador','Acceso total',true) RETURNING id",
      );
      const perfilId = p.rows[0].id as string;
      await seed.query("INSERT INTO perfil_permiso (perfil_id, permiso) SELECT $1, unnest($2::text[])", [
        perfilId,
        [...TODOS_LOS_PERMISOS],
      ]);
      await seed.query(
        `INSERT INTO usuario (email, nombre, hash_contrasena, debe_cambiar_contrasena, perfil_id)
         VALUES ($1,'Administrador',$2,true,$3)`,
        [email, await hashear(contrasenaTemporal), perfilId],
      );
      await seed.query("COMMIT");
    } catch (e) {
      await seed.query("ROLLBACK");
      throw e;
    } finally {
      await seed.end();
    }

    await marcarVersionEsquema(id, ultimaMigracion());
    await registrarAprovisionamiento(id, slug, "crear", true);
    return { slug, email, contrasenaTemporal };
  } catch (e) {
    // Deshacer lo que se alcanzó a crear para no dejar clientes a medias.
    if (creadoEnServidor) await eliminarEnServidor(slug).catch(() => {});
    await poolControl().query("DELETE FROM cliente WHERE slug = $1", [slug]).catch(() => {});
    await registrarAprovisionamiento(null, slug, "crear", false, e instanceof Error ? e.message : String(e)).catch(() => {});
    throw e;
  } finally {
    await admin.end();
  }
}

async function eliminarEnServidor(slug: string) {
  const { base, app, mig } = nombresDe(slug);
  const admin = await conectarAdmin();
  try {
    const q = (s: string) => admin.escapeIdentifier(s);
    await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1", [base]);
    await admin.query(`DROP DATABASE IF EXISTS ${q(base)}`);
    await admin.query(`DROP ROLE IF EXISTS ${q(app)}`);
    await admin.query(`DROP ROLE IF EXISTS ${q(mig)}`);
  } finally {
    await admin.end();
  }
}

/** Borra la base, los roles y el registro. Irreversible: los scripts exigen --confirmar. */
export async function eliminarCliente(slug: string) {
  if (!SLUG.test(slug)) throw new Error("Código de cliente inválido");
  const c = await clientePorSlug(slug);
  await eliminarEnServidor(slug);
  await poolControl().query("DELETE FROM cliente WHERE slug = $1", [slug]);
  await registrarAprovisionamiento(null, slug, "eliminar", true, c ? undefined : "no estaba en el catálogo");
}
