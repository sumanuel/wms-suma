import "dotenv/config";
import { Client } from "pg";
import { crearCliente, eliminarCliente, requerirEntorno } from "../lib/aprovisionar";
import { clientePorSlug, poolControl, urlConexion } from "../../src/lib/nucleo/control";

// npm run probar:aislamiento
// Crea dos clientes temporales y comprueba, contra el servidor real, que uno no puede tocar al otro.

let fallos = 0;
function verificar(descripcion: string, ok: boolean, detalle?: string) {
  console.log(`${ok ? "  ✔" : "  ✘"} ${descripcion}${!ok && detalle ? ` — ${detalle}` : ""}`);
  if (!ok) fallos++;
}

async function conectar(url: string) {
  const c = new Client({ connectionString: url });
  await c.connect();
  return c;
}

async function falla(url: string, sql?: string): Promise<string | null> {
  try {
    const c = await conectar(url);
    try {
      if (sql) await c.query(sql);
    } finally {
      await c.end();
    }
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

async function main() {
  requerirEntorno("CONTROL_DATABASE_URL", "CONTROL_CLAVE_MAESTRA", "PG_ADMIN_PASSWORD");
  const A = "prueba_aisla_a";
  const B = "prueba_aisla_b";
  await eliminarCliente(A).catch(() => {});
  await eliminarCliente(B).catch(() => {});
  try {
    console.log("Creando dos clientes temporales…");
    await crearCliente(A, "Prueba A");
    await crearCliente(B, "Prueba B");
    const a = (await clientePorSlug(A))!;
    const b = (await clientePorSlug(B))!;

    console.log("\nAislamiento de datos");
    const ca = await conectar(urlConexion(a, "app"));
    const cb = await conectar(urlConexion(b, "app"));
    await ca.query("INSERT INTO configuracion (clave, valor) VALUES ('marca', '\"solo-A\"')");
    await cb.query("INSERT INTO configuracion (clave, valor) VALUES ('marca', '\"solo-B\"')");
    const ra = await ca.query("SELECT valor FROM configuracion WHERE clave = 'marca'");
    const rb = await cb.query("SELECT valor FROM configuracion WHERE clave = 'marca'");
    verificar("A solo ve su propio dato", ra.rowCount === 1 && ra.rows[0].valor === "solo-A");
    verificar("B solo ve su propio dato", rb.rowCount === 1 && rb.rows[0].valor === "solo-B");
    verificar("A y B tienen usuarios administradores distintos e independientes", (await ca.query("SELECT 1 FROM usuario")).rowCount === 1);
    await ca.end();
    await cb.end();

    console.log("\nAislamiento de credenciales");
    // Usuario y clave de A contra la base de B.
    const urlAenB = urlConexion({ ...a, base: b.base }, "app");
    const e1 = await falla(urlAenB);
    verificar("El rol de A no puede conectarse a la base de B", e1 !== null, "se conectó");

    console.log("\nPrivilegios del rol de la aplicación");
    const e2 = await falla(urlConexion(a, "app"), "CREATE TABLE intruso (x int)");
    verificar("El rol de la app no puede crear tablas (DDL)", e2 !== null, "creó una tabla");
    const e3 = await falla(urlConexion(a, "app"), "SELECT * FROM _prisma_migrations");
    verificar("El rol de la app no puede leer _prisma_migrations", e3 !== null, "la leyó");
    const e4 = await falla(urlConexion(a, "app"), "CREATE DATABASE otra");
    verificar("El rol de la app no puede crear bases", e4 !== null, "creó una base");
    const e5 = await falla(urlConexion(a, "app"), "CREATE ROLE intruso LOGIN");
    verificar("El rol de la app no puede crear roles", e5 !== null, "creó un rol");
  } finally {
    console.log("\nLimpiando clientes temporales…");
    await eliminarCliente(A).catch((e) => console.error("No pude eliminar A:", e.message));
    await eliminarCliente(B).catch((e) => console.error("No pude eliminar B:", e.message));
  }
  console.log(fallos === 0 ? "\nAislamiento verificado." : `\n${fallos} verificación(es) fallaron.`);
  process.exitCode = fallos === 0 ? 0 : 1;
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => poolControl().end());
