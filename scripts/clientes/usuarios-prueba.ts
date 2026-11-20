import "dotenv/config";
import { writeFileSync } from "node:fs";
import { Client } from "pg";
import { generarTemporal, hashear } from "../../src/lib/nucleo/contrasenas";
import { clientePorSlug, poolControl, urlConexion } from "../../src/lib/nucleo/control";

// npm run cliente:usuarios-prueba -- <codigo> [archivo]
// Deja en la base de un cliente de PRUEBA un conjunto de perfiles y usuarios para probar los permisos, y escribe un archivo con
// sus credenciales (por defecto USUARIOS-DE-PRUEBA.md, que está en .gitignore). Se puede repetir: cada vez vuelve a asignar
// contraseñas nuevas a esos usuarios (menos al administrador, que no se toca). NO usar en un cliente real.

type Perfil = { nombre: string; descripcion: string; permisos: string[] };
const p = (modulos: string[], acciones: string[]) => modulos.flatMap((m) => acciones.map((a) => `${m}.${a}`));
const TODAS = ["ver", "crear", "editar", "eliminar", "exportar"];
const OPERATIVOS = ["articulos", "bodegas", "ubicaciones", "terceros", "cajas", "transporte", "inventario", "conteo", "pedidos", "picking", "prepacking", "pallets", "aduana", "despacho", "movil", "indicadores"];

const PERFILES: Perfil[] = [
  { nombre: "Supervisor de bodega", descripcion: "Todo lo operativo, más ver la auditoría. Sin usuarios ni perfiles.", permisos: [...p(OPERATIVOS, TODAS), "auditoria.ver"] },
  { nombre: "Operario de picking", descripcion: "Ve pedidos e inventario, y ejecuta el picking (pickea).", permisos: [...p(["pedidos", "picking", "inventario", "ubicaciones", "movil"], ["ver"]), ...p(["prepacking"], ["ver", "editar"])] },
  { nombre: "Operario de aduana y despacho", descripcion: "Empaca en aduana y despacha con guía.", permisos: [...p(["pedidos", "prepacking", "cajas", "transporte"], ["ver"]), ...p(["aduana"], ["ver", "editar"]), ...p(["despacho"], ["ver", "crear", "editar"]), ...p(["movil"], ["ver"])] },
  { nombre: "Comercial", descripcion: "Crea y gestiona pedidos y clientes; consulta el resto.", permisos: [...p(["pedidos"], TODAS), ...p(["terceros"], ["ver", "crear", "editar"]), ...p(["articulos", "inventario", "despacho", "picking"], ["ver"])] },
  { nombre: "Inventarios", descripcion: "Existencias, lotes, conteos y ubicaciones.", permisos: [...p(["inventario"], ["ver", "editar", "exportar"]), ...p(["conteo"], ["ver", "crear", "editar", "eliminar"]), ...p(["ubicaciones"], ["ver", "crear", "editar"]), ...p(["articulos", "bodegas", "movil"], ["ver"])] },
  { nombre: "Consulta", descripcion: "Solo ve; no cambia nada.", permisos: p(OPERATIVOS, ["ver"]) },
];

type Usuario = { email: string; nombre: string; perfil: string; activo?: boolean; debeCambiar?: boolean; para: string };
const USUARIOS: Usuario[] = [
  { email: "supervisor@demo.local", nombre: "Carlos Supervisor", perfil: "Supervisor de bodega", para: "Recorrer todo el flujo operativo y la auditoría sin ser administrador." },
  { email: "picking@demo.local", nombre: "Pedro Picking", perfil: "Operario de picking", para: "Pickear en Prepacking. No puede crear pedidos, ni generar pickings, ni usar la aduana." },
  { email: "despacho@demo.local", nombre: "Diana Despacho", perfil: "Operario de aduana y despacho", para: "Empacar en Aduana y despachar. No puede pickear." },
  { email: "comercial@demo.local", nombre: "Camila Comercial", perfil: "Comercial", para: "Crear, importar y aprobar pedidos y clientes. No ve Aduana ni Prepacking." },
  { email: "inventarios@demo.local", nombre: "Ivan Inventarios", perfil: "Inventarios", para: "Conteos, calidad de lotes y ubicaciones. No ve Pedidos." },
  { email: "consulta@demo.local", nombre: "Clara Consulta", perfil: "Consulta", para: "Comprobar que no aparece ningún botón de crear, editar ni eliminar." },
  { email: "inactivo@demo.local", nombre: "Ines Inactiva", perfil: "Consulta", activo: false, para: "Debe ser rechazada al ingresar (usuario inactivo)." },
  { email: "cambio@demo.local", nombre: "Cesar Cambio", perfil: "Consulta", debeCambiar: true, para: "Debe cambiar la contraseña antes de entrar (primer ingreso)." },
];

async function main() {
  const [slug, archivo = "USUARIOS-DE-PRUEBA.md"] = process.argv.slice(2);
  if (!slug) throw new Error("Uso: npm run cliente:usuarios-prueba -- <codigo> [archivo]");
  const c = await clientePorSlug(slug);
  if (!c) throw new Error(`No existe el cliente "${slug}".`);
  const db = new Client({ connectionString: urlConexion(c, "migrador") });
  await db.connect();
  const credenciales: { u: Usuario; clave: string }[] = [];
  try {
    await db.query("BEGIN");
    const perfiles = new Map<string, string>();
    for (const pf of PERFILES) {
      const r = await db.query(
        `INSERT INTO perfil (nombre, descripcion, es_administrador, activo) VALUES ($1,$2,false,true)
         ON CONFLICT (nombre) DO UPDATE SET descripcion = EXCLUDED.descripcion, activo = true, actualizado_en = now() RETURNING id`,
        [pf.nombre, pf.descripcion],
      );
      const id = r.rows[0].id as string;
      perfiles.set(pf.nombre, id);
      await db.query("DELETE FROM perfil_permiso WHERE perfil_id = $1", [id]);
      await db.query("INSERT INTO perfil_permiso (perfil_id, permiso) SELECT $1, unnest($2::text[])", [id, pf.permisos]);
    }
    for (const u of USUARIOS) {
      const clave = generarTemporal();
      await db.query(
        `INSERT INTO usuario (email, nombre, hash_contrasena, debe_cambiar_contrasena, contrasena_cambiada_en, activo, perfil_id)
         VALUES ($1,$2,$3,$4,now(),$5,$6)
         ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre, hash_contrasena = EXCLUDED.hash_contrasena, debe_cambiar_contrasena = EXCLUDED.debe_cambiar_contrasena,
           contrasena_cambiada_en = now(), activo = EXCLUDED.activo, perfil_id = EXCLUDED.perfil_id, intentos_fallidos = 0, bloqueado_hasta = NULL, actualizado_en = now()`,
        [u.email, u.nombre, await hashear(clave), u.debeCambiar ?? false, u.activo ?? true, perfiles.get(u.perfil)],
      );
      credenciales.push({ u, clave });
    }
    await db.query("COMMIT");
  } catch (e) {
    await db.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    await db.end();
  }

  const url = process.env.URL_APP ?? "http://localhost:3000";
  const md = `# Usuarios de prueba

> Solo para el cliente **${c.nombre}** (\`${slug}\`) en este equipo. No uses estas credenciales en un cliente real. Este archivo está en \`.gitignore\`.

- **Dirección:** ${url}/ingresar
- **Empresa:** si el formulario la pide, escribe \`${slug}\`.
- **Regenerar:** \`npm run cliente:usuarios-prueba -- ${slug}\` vuelve a crear los perfiles y asigna contraseñas nuevas (cambia este archivo).

## Administrador

| Usuario | Contraseña | Perfil |
|---|---|---|
| \`admin@${slug}.local\` | la que se le dio al probar el sistema (si no la recuerdas: \`npm run cliente:contrasena -- ${slug} admin@${slug}.local\` deja una temporal y exige cambiarla) | Administrador (todo) |

## Usuarios de prueba

| Usuario | Contraseña | Perfil | Para probar |
|---|---|---|---|
${credenciales.map(({ u, clave }) => `| \`${u.email}\` | \`${clave}\` | ${u.perfil} | ${u.para} |`).join("\n")}

## Perfiles y permisos

${PERFILES.map((pf) => {
  const porModulo = new Map<string, string[]>();
  for (const x of pf.permisos) {
    const [m, a] = x.split(".");
    porModulo.set(m, [...(porModulo.get(m) ?? []), a]);
  }
  return `### ${pf.nombre}\n${pf.descripcion}\n\n${[...porModulo].map(([m, a]) => `- **${m}**: ${a.join(", ")}`).join("\n")}\n`;
}).join("\n")}
## Qué comprobar con cada uno

- El menú solo muestra los módulos con permiso de ver; los botones de crear, editar y eliminar solo aparecen con su permiso.
- Entrar a la dirección de un módulo sin permiso (por ejemplo \`/seguridad\` con \`consulta@${slug}.local\`) lleva a «Sin acceso».
- \`inactivo@${slug}.local\` y \`cambio@${slug}.local\` prueban los dos casos especiales de ingreso.
- Cinco intentos fallidos seguidos bloquean al usuario 15 minutos.
`;
  writeFileSync(archivo, md, "utf8");
  console.log(`Perfiles y usuarios de prueba listos en "${slug}". Credenciales en ${archivo}.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => poolControl().end());
