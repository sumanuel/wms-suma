import "dotenv/config";
import { crearCliente, requerirEntorno } from "../lib/aprovisionar";
import { poolControl } from "../../src/lib/nucleo/control";

// npm run cliente:crear -- <codigo> "<Nombre>" [correo-del-administrador]

async function main() {
  requerirEntorno("CONTROL_DATABASE_URL", "CONTROL_CLAVE_MAESTRA", "PG_ADMIN_PASSWORD");
  const [slug, nombre, email] = process.argv.slice(2);
  if (!slug || !nombre) {
    console.error('Uso: npm run cliente:crear -- <codigo> "<Nombre>" [correo-administrador]');
    process.exit(1);
  }
  console.log(`Creando cliente ${slug}…`);
  const r = await crearCliente(slug, nombre, email);
  console.log(`
Cliente "${r.slug}" listo.
  Administrador:        ${r.email}
  Contraseña temporal:  ${r.contrasenaTemporal}   (se muestra una sola vez; deberá cambiarla al ingresar)
`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => poolControl().end());
