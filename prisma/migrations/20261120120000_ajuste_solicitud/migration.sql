-- CreateTable
CREATE TABLE "ajuste_solicitud" (
    "id" SERIAL NOT NULL,
    "caja" DOUBLE PRECISION NOT NULL,
    "ean" VARCHAR(50) NOT NULL,
    "bodega" VARCHAR(15) NOT NULL,
    "modo" VARCHAR(10) NOT NULL,
    "cantidad" DECIMAL(18,4) NOT NULL,
    "motivo" VARCHAR(50) NOT NULL,
    "detalle" VARCHAR(400),
    "soporte" VARCHAR(50),
    "saldo_solicitado" DECIMAL(18,4) NOT NULL,
    "diferencia" DECIMAL(18,4) NOT NULL,
    "estado" VARCHAR(12) NOT NULL DEFAULT 'pendiente',
    "solicitado_por" VARCHAR(40),
    "solicitado_nombre" VARCHAR(120),
    "fecha_solicitud" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto_por" VARCHAR(40),
    "resuelto_nombre" VARCHAR(120),
    "fecha_resolucion" TIMESTAMPTZ(6),
    "nota_resolucion" VARCHAR(300),
    "ajuste_id" INTEGER,

    CONSTRAINT "ajuste_solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ajuste_solicitud_estado_idx" ON "ajuste_solicitud"("estado");
