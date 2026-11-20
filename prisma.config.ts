import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // DATABASE_URL la arma cada comando para UN cliente (scripts/clientes/*): no existe una base "global".
    // process.env y no env(): env() falla al cargar la config sin la variable y rompe prisma generate.
    url: process.env.DATABASE_URL,
  },
});
