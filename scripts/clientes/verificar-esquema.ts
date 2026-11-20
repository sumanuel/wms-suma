import "dotenv/config";
import { Client } from "pg";
import { clientePorSlug, poolControl, urlConexion } from "../../src/lib/nucleo/control";

// npm run cliente:verificar -- <codigo>
// Comprueba con el rol de la APLICACIÓN que el esquema del cliente está completo: cuenta tablas y claves foráneas,
// lee/escribe en una tabla legada y confirma que las FK se hacen cumplir. Todo dentro de una transacción que se revierte.

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Uso: npm run cliente:verificar -- <codigo>");
  const c = await clientePorSlug(slug);
  if (!c) throw new Error(`No existe el cliente "${slug}".`);
  const db = new Client({ connectionString: urlConexion(c, "app") });
  await db.connect();
  try {
    const t = await db.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema = 'public'");
    const fk = await db.query(
      "SELECT count(*)::int n FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public'",
    );
    console.log(`Tablas: ${t.rows[0].n} · claves foráneas: ${fk.rows[0].n}`);

    await db.query("BEGIN");
    await db.query("INSERT INTO t_clientes (nit, nombrecliente) VALUES ('999', 'Prueba')");
    const lectura = await db.query("SELECT nit, nombrecliente FROM t_clientes WHERE nit = '999'");
    console.log("Escritura y lectura con el rol de la app:", lectura.rows[0]);
    await db.query("SAVEPOINT fk");
    // Fila "completa" (todas las columnas obligatorias con valor) cuyo único defecto es apuntar a un cliente inexistente.
    const obligatorias = await db.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = 't_clientes_direcciones' AND is_nullable = 'NO' AND column_default IS NULL`,
    );
    const valor = (tipo: string) =>
      /char|text/.test(tipo) ? "'x'" : tipo === "boolean" ? "false" : /timestamp|date/.test(tipo) ? "now()" : "0";
    const otras = obligatorias.rows.filter((r) => r.column_name !== "nit");
    const nombres = ['"nit"', ...otras.map((r) => `"${r.column_name}"`)];
    const valores = ["'no-existe'", ...otras.map((r) => valor(r.data_type))];
    const resultado = await db
      .query(`INSERT INTO t_clientes_direcciones (${nombres.join(",")}) VALUES (${valores.join(",")})`)
      .then(
        () => "NO se hizo cumplir",
        (e: { code?: string }) => (e.code === "23503" ? "se hizo cumplir (23503)" : `error distinto: ${e.code}`),
      );
    console.log("Clave foránea t_clientes_direcciones → t_clientes:", resultado);
    await db.query("ROLLBACK");
    if (!resultado.startsWith("se hizo")) process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => poolControl().end());
