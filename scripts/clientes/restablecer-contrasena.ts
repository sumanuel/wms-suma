import "dotenv/config";
import { Client } from "pg";
import { generarTemporal, hashear } from "../../src/lib/nucleo/contrasenas";
import { clientePorSlug, poolControl, urlConexion } from "../../src/lib/nucleo/control";

// npm run cliente:contrasena -- <codigo> <correo>
// Deja una contraseña temporal (se muestra una sola vez) y obliga a cambiarla al ingresar.

async function main() {
  const [slug, correo] = process.argv.slice(2);
  if (!slug || !correo) {
    console.error("Uso: npm run cliente:contrasena -- <codigo> <correo>");
    process.exit(1);
  }
  const c = await clientePorSlug(slug);
  if (!c) throw new Error(`No existe el cliente "${slug}".`);
  const temporal = generarTemporal();
  const db = new Client({ connectionString: urlConexion(c, "migrador") });
  await db.connect();
  try {
    const r = await db.query(
      `UPDATE usuario SET hash_contrasena = $2, debe_cambiar_contrasena = true, contrasena_cambiada_en = now(),
              intentos_fallidos = 0, bloqueado_hasta = NULL, actualizado_en = now()
       WHERE email = $1`,
      [correo.toLowerCase(), await hashear(temporal)],
    );
    if (r.rowCount !== 1) throw new Error(`No existe el usuario ${correo} en ${slug}.`);
  } finally {
    await db.end();
  }
  console.log(`Contraseña temporal para ${correo}: ${temporal}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => poolControl().end());
