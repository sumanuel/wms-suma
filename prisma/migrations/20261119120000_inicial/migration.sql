-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "configuracion" (
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "perfil" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "es_administrador" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "perfil_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "perfil_permiso" (
    "perfil_id" UUID NOT NULL,
    "permiso" TEXT NOT NULL,

    CONSTRAINT "perfil_permiso_pkey" PRIMARY KEY ("perfil_id","permiso")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "hash_contrasena" TEXT,
    "debe_cambiar_contrasena" BOOLEAN NOT NULL DEFAULT true,
    "contrasena_cambiada_en" TIMESTAMPTZ(6),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "intentos_fallidos" INTEGER NOT NULL DEFAULT 0,
    "bloqueado_hasta" TIMESTAMPTZ(6),
    "perfil_id" UUID NOT NULL,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_ingreso" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" UUID,
    "email" TEXT NOT NULL,
    "exito" BOOLEAN NOT NULL,
    "motivo" TEXT,
    "ip" TEXT,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_ingreso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria_cambio" (
    "id" BIGSERIAL NOT NULL,
    "usuario_id" UUID,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "antes" JSONB,
    "despues" JSONB,
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "perfil_nombre_key" ON "perfil"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_perfil_id_idx" ON "usuario"("perfil_id");

-- CreateIndex
CREATE INDEX "registro_ingreso_email_creado_en_idx" ON "registro_ingreso"("email", "creado_en");

-- CreateIndex
CREATE INDEX "auditoria_cambio_entidad_entidad_id_idx" ON "auditoria_cambio"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "auditoria_cambio_creado_en_idx" ON "auditoria_cambio"("creado_en");

-- AddForeignKey
ALTER TABLE "perfil_permiso" ADD CONSTRAINT "perfil_permiso_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_perfil_id_fkey" FOREIGN KEY ("perfil_id") REFERENCES "perfil"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Reglas que Prisma no expresa
ALTER TABLE "perfil_permiso" ADD CONSTRAINT "ck_perfil_permiso_formato"
  CHECK ("permiso" ~ '^[a-z_]+\.(ver|crear|editar|eliminar|exportar)$');
ALTER TABLE "usuario" ADD CONSTRAINT "ck_usuario_intentos" CHECK ("intentos_fallidos" >= 0);
ALTER TABLE "usuario" ADD CONSTRAINT "ck_usuario_email" CHECK ("email" = lower("email"));
