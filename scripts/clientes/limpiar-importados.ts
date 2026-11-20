import "dotenv/config";
import { Client } from "pg";
import { clientePorSlug, poolControl, urlConexion } from "../../src/lib/nucleo/control";

// npm run cliente:limpiar-importados -- <codigo>
// Borra lo que dejan las pruebas de importación de maestros en un cliente de PRUEBA (todo lo que empieza por «IMP»).

async function main() {
  const slug = process.argv[2];
  if (!slug) throw new Error("Uso: npm run cliente:limpiar-importados -- <codigo>");
  const c = await clientePorSlug(slug);
  if (!c) throw new Error(`No existe el cliente "${slug}".`);
  const db = new Client({ connectionString: urlConexion(c, "migrador") });
  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query("DELETE FROM t_ins_coordenadas WHERE ubicacion LIKE 'IMP%'");
    await db.query("DELETE FROM t_ins_ubicaciones_fijas_mp WHERE bodega LIKE 'IMP%' OR eanmaterial LIKE 'IMP%'");
    await db.query("DELETE FROM t_detalle_referencia WHERE productoean LIKE 'IMP%'");
    await db.query("DELETE FROM t_ins_referencias WHERE codigoreferencia LIKE 'IMP%'");
    await db.query("DELETE FROM t_clientes_direcciones WHERE nit LIKE 'IMP%'");
    await db.query("DELETE FROM t_clientes WHERE nit LIKE 'IMP%'");
    await db.query("DELETE FROM t_ins_bodega WHERE bodega LIKE 'IMP%'");
    await db.query("DELETE FROM tiposdecaja WHERE tipo_caja LIKE 'IMP%'");
    await db.query("DELETE FROM t_transportador WHERE transportador LIKE 'IMP%'");
    await db.query("COMMIT");
    console.log("Datos de importación de prueba eliminados.");
  } catch (e) {
    await db.query("ROLLBACK").catch(() => undefined);
    throw e;
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
