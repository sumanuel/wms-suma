-- CreateTable
CREATE TABLE "resurtido_regla" (
    "id" SERIAL NOT NULL,
    "bodega" VARCHAR(15) NOT NULL,
    "ean" VARCHAR(50) NOT NULL,
    "ubicacion" VARCHAR(20) NOT NULL,
    "minimo" DECIMAL(18,4) NOT NULL,
    "maximo" DECIMAL(18,4) NOT NULL,
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resurtido_regla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resurtido_tarea" (
    "id" SERIAL NOT NULL,
    "regla_id" INTEGER,
    "bodega" VARCHAR(15) NOT NULL,
    "ean" VARCHAR(50) NOT NULL,
    "caja" DOUBLE PRECISION NOT NULL,
    "cantidad" DECIMAL(18,4) NOT NULL,
    "ubicacion_origen" VARCHAR(20),
    "ubicacion_destino" VARCHAR(20) NOT NULL,
    "estado" VARCHAR(12) NOT NULL DEFAULT 'pendiente',
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creada_por" VARCHAR(40),
    "hecha_en" TIMESTAMPTZ(6),
    "hecha_por" VARCHAR(40),
    "nota" VARCHAR(200),

    CONSTRAINT "resurtido_tarea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "resurtido_regla_bodega_idx" ON "resurtido_regla"("bodega");
CREATE UNIQUE INDEX "resurtido_regla_ean_ubicacion_key" ON "resurtido_regla"("ean", "ubicacion");
CREATE INDEX "resurtido_tarea_estado_idx" ON "resurtido_tarea"("estado");
CREATE INDEX "resurtido_tarea_caja_idx" ON "resurtido_tarea"("caja");
