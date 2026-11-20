import "dotenv/config";
import { listarClientes, poolControl } from "../../src/lib/nucleo/control";
import { ultimaMigracion } from "../lib/aprovisionar";

async function main() {
  const clientes = await listarClientes();
  const ultima = ultimaMigracion();
  if (!clientes.length) return console.log("No hay clientes. Cree uno con: npm run cliente:crear -- demo \"Cliente Demo\"");
  console.table(
    clientes.map((c) => ({
      codigo: c.slug,
      nombre: c.nombre,
      estado: c.estado,
      base: c.base,
      esquema: c.versionEsquema === ultima ? "al día" : (c.versionEsquema ?? "sin migrar"),
    })),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => poolControl().end());
