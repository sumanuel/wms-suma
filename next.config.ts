import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servidor independiente para la imagen de Docker.
  output: "standalone",
  // pg usa módulos nativos opcionales; que Next no intente empaquetarlo.
  serverExternalPackages: ["pg"],
};

export default nextConfig;
