-- Base de control: catálogo de clientes. Una sola, administrada por el proveedor.
CREATE TABLE IF NOT EXISTS cliente (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                      text NOT NULL UNIQUE CHECK (slug ~ '^[a-z][a-z0-9_]{2,30}$'),
  nombre                    text NOT NULL,
  estado                    text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido')),
  host                      text NOT NULL,
  puerto                    integer NOT NULL DEFAULT 5432,
  base                      text NOT NULL UNIQUE,
  -- Rol de la aplicación (solo lectura/escritura de datos) y rol migrador (dueño de la base). Cifrados AES-256-GCM.
  usuario_app               text NOT NULL,
  contrasena_app_cifrada    text NOT NULL,
  usuario_migrador          text NOT NULL,
  contrasena_migrador_cifrada text NOT NULL,
  max_conexiones            integer NOT NULL DEFAULT 5 CHECK (max_conexiones BETWEEN 1 AND 50),
  -- Banderas de módulos activos por cliente, p. ej. {"aduana": true, "conteo": false}
  modulos                   jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Nombre de la última migración de Prisma aplicada con éxito en la base del cliente
  version_esquema           text,
  creado_en                 timestamptz NOT NULL DEFAULT now(),
  actualizado_en            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS registro_aprovisionamiento (
  id          bigserial PRIMARY KEY,
  cliente_id  uuid REFERENCES cliente(id) ON DELETE SET NULL,
  slug        text NOT NULL,
  accion      text NOT NULL,
  exito       boolean NOT NULL,
  detalle     text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);
