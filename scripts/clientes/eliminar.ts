import "dotenv/config";
import { eliminarCliente, requerirEntorno } from "../lib/aprovisionar";
import { poolControl } from "../../src/lib/nucleo/control";

// npm run cliente:eliminar -- <codigo> --confirmar     (IRREVERSIBLE: borra la base y los roles del cliente)

async function main() {
  requerirEntorno("CONTROL_DATABASE_URL", "PG_ADMIN_PASSWORD");
  const [slug, bandera] = process.argv.slice(2);
  if (!slug || bandera !== "--confirmar") {
    console.error("Uso: npm run cliente:eliminar -- <codigo> --confirmar\nBorra la base y los roles del cliente. Haga un respaldo antes.");
    process.exit(1);
  }
  await eliminarCliente(slug);
  console.log(`Cliente ${slug} eliminado.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => poolControl().end());
