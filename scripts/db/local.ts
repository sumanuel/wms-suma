import "dotenv/config";
import { randomBytes } from "node:crypto";
import { existsSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

// Prepara el entorno local sobre el PostgreSQL instalado: rol y base de control, secretos en .env.
// Idempotente: se puede ejecutar varias veces. No toca bases de clientes.

const raiz = process.cwd();
const envRuta = join(raiz, ".env");

if (!existsSync(envRuta)) {
  copyFileSync(join(raiz, ".env.example"), envRuta);
  console.log("Creé .env a partir de .env.example.");
}

function leerEnv(): Map<string, string> {
  const m = new Map<string, string>();
  for (const linea of readFileSync(envRuta, "utf8").split(/\r?\n/)) {
    const i = linea.indexOf("=");
    if (i > 0 && !linea.startsWith("#")) m.set(linea.slice(0, i).trim(), linea.slice(i + 1));
  }
  return m;
}

function escribirClave(clave: string, valor: string) {
  const lineas = readFileSync(envRuta, "utf8").split(/\r?\n/);
  const i = lineas.findIndex((l) => l.startsWith(`${clave}=`));
  if (i >= 0) lineas[i] = `${clave}=${valor}`;
  else lineas.push(`${clave}=${valor}`);
  writeFileSync(envRuta, lineas.join("\n"));
}

async function main() {
  const env = leerEnv();
  const adminClave = env.get("PG_ADMIN_PASSWORD") ?? "";
  if (!adminClave) {
    console.error(
      "Falta PG_ADMIN_PASSWORD en .env.\n" +
        "Abra .env y escriba la contraseña del usuario postgres de su PostgreSQL local (no la comparta en el chat).\n" +
        "Luego vuelva a ejecutar: npm run local:preparar",
    );
    process.exit(1);
  }
  const host = env.get("PG_HOST") || "127.0.0.1";
  const puerto = Number(env.get("PG_PORT") || 5432);

  const admin = new Client({ host, port: puerto, user: env.get("PG_ADMIN_USER") || "postgres", password: adminClave, database: "postgres" });
  try {
    await admin.connect();
  } catch (e) {
    console.error(`No pude conectar a PostgreSQL en ${host}:${puerto}: ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  }
  console.log(`Conectado a PostgreSQL ${(await admin.query("SHOW server_version")).rows[0].server_version}.`);

  // 1. Rol de la aplicación sobre la base de control.
  const q = (s: string) => admin.escapeIdentifier(s);
  const l = (s: string) => admin.escapeLiteral(s);
  let controlUrl = env.get("CONTROL_DATABASE_URL") ?? "";
  const rol = "wms_plataforma";
  const existeRol = (await admin.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [rol])).rowCount === 1;
  if (!existeRol || !controlUrl) {
    const clave = randomBytes(24).toString("hex");
    await admin.query(`${existeRol ? "ALTER" : "CREATE"} ROLE ${q(rol)} LOGIN PASSWORD ${l(clave)}`);
    controlUrl = `postgresql://${rol}:${clave}@${host}:${puerto}/wms_control`;
    escribirClave("CONTROL_DATABASE_URL", controlUrl);
    console.log(`${existeRol ? "Renové la contraseña de" : "Creé"} el rol ${rol}.`);
  }

  // 2. Base de control.
  const existeBase = (await admin.query("SELECT 1 FROM pg_database WHERE datname = 'wms_control'")).rowCount === 1;
  if (!existeBase) {
    await admin.query(`CREATE DATABASE wms_control OWNER ${q(rol)} ENCODING 'UTF8'`);
    console.log("Creé la base wms_control.");
  }
  await admin.query(`REVOKE CONNECT ON DATABASE wms_control FROM PUBLIC`);
  await admin.query(`GRANT CONNECT ON DATABASE wms_control TO ${q(rol)}`);
  await admin.end();

  // 3. Tablas de control (con el rol de la aplicación, que es dueño de la base).
  const control = new Client({ connectionString: controlUrl });
  await control.connect();
  await control.query(readFileSync(join(raiz, "scripts", "control", "001_inicial.sql"), "utf8"));
  await control.end();
  console.log("Tablas de control listas.");

  // 4. Secretos.
  const actualizado = leerEnv();
  if (!actualizado.get("CONTROL_CLAVE_MAESTRA")) {
    escribirClave("CONTROL_CLAVE_MAESTRA", randomBytes(32).toString("base64"));
    console.log("Generé CONTROL_CLAVE_MAESTRA. Respáldela: sin ella no se pueden leer las credenciales de los clientes.");
  }
  if (!actualizado.get("SESSION_SECRET")) {
    escribirClave("SESSION_SECRET", randomBytes(48).toString("base64url"));
    console.log("Generé SESSION_SECRET.");
  }

  console.log("\nListo. Siguiente paso:\n  npm run cliente:crear -- demo \"Cliente Demo\"\n  npm run dev");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
