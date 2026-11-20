import "dotenv/config";
import { Client } from "pg";
import { clientePorSlug, poolControl, urlConexion } from "../../src/lib/nucleo/control";

// npm run cliente:aduana-demo -- <codigo> <picking> poner|quitar
// Solo para pruebas en un cliente de PRUEBA: simula que un picking ya tiene una caja aduanada (t_aduana_wms_pos), para probar
// que Prepacking no deja revertir un picking aduanado. Necesita el tipo de caja «C-DEMO».

async function main() {
  const [slug, picking, accion] = process.argv.slice(2);
  if (!slug || !picking || !["poner", "quitar"].includes(accion ?? "")) throw new Error("Uso: npm run cliente:aduana-demo -- <codigo> <picking> poner|quitar");
  const c = await clientePorSlug(slug);
  if (!c) throw new Error(`No existe el cliente "${slug}".`);
  const db = new Client({ connectionString: urlConexion(c, "migrador") });
  await db.connect();
  try {
    if (accion === "poner") {
      await db.query("INSERT INTO t_aduana_wms_pos (numpicking, productoean, numdecaja, cantidad, tipocaja, fecharegistro) VALUES ($1,'DEMO',1,1,'C-DEMO',now())", [Number(picking)]);
    } else {
      await db.query("DELETE FROM t_aduana_wms_pos WHERE numpicking = $1 AND productoean = 'DEMO'", [Number(picking)]);
      await db.query("DELETE FROM tiposdecaja WHERE tipo_caja = 'C-DEMO'");
    }
    console.log(accion === "poner" ? "Caja aduanada de prueba puesta." : "Caja aduanada de prueba quitada.");
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
