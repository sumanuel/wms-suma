import "dotenv/config";
import { aplicarPermisos, migrar, requerirEntorno, ultimaMigracion } from "../lib/aprovisionar";
import {
  listarClientes,
  marcarVersionEsquema,
  poolControl,
  registrarAprovisionamiento,
} from "../../src/lib/nucleo/control";

// npm run db:migrar:todos [-- --solo <codigo>] [--parar-al-primer-error]
// Aplica las migraciones de Prisma a cada cliente activo. Un cliente que falla no bloquea a los demás (salvo la bandera).

async function main() {
  requerirEntorno("CONTROL_DATABASE_URL", "CONTROL_CLAVE_MAESTRA", "PG_ADMIN_PASSWORD");
  const args = process.argv.slice(2);
  const solo = args.includes("--solo") ? args[args.indexOf("--solo") + 1] : null;
  const parar = args.includes("--parar-al-primer-error");

  let clientes = await listarClientes(true);
  if (solo) clientes = clientes.filter((c) => c.slug === solo);
  if (!clientes.length) {
    console.log("No hay clientes activos que migrar.");
    return;
  }

  const fallidos: string[] = [];
  for (const c of clientes) {
    process.stdout.write(`• ${c.slug.padEnd(24)} `);
    const r = migrar(c);
    if (!r.ok) {
      console.log("FALLÓ");
      console.log(r.salida.split("\n").map((l) => `    ${l}`).join("\n"));
      fallidos.push(c.slug);
      await registrarAprovisionamiento(c.id, c.slug, "migrar", false, r.salida);
      if (parar) break;
      continue;
    }
    await aplicarPermisos(c);
    await marcarVersionEsquema(c.id, ultimaMigracion());
    await registrarAprovisionamiento(c.id, c.slug, "migrar", true);
    console.log("ok");
  }

  console.log(`\n${clientes.length - fallidos.length} de ${clientes.length} clientes al día.`);
  if (fallidos.length) {
    console.error(`Con error: ${fallidos.join(", ")}`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => poolControl().end());
