import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**"]),
  {
    // Aislamiento entre clientes: ningún módulo puede crear su propio cliente Prisma ni importar uno fijo.
    // Todo acceso a datos pasa por dbDelCliente() (src/lib/tenant.ts).
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/tenant.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/generated/prisma/client",
              importNames: ["PrismaClient"],
              message: "Use dbDelCliente() de @/lib/tenant: no cree clientes Prisma fuera de ese módulo.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
