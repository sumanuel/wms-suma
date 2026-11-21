-- CreateTable
CREATE TABLE "recibo_ciego" (
    "id" SERIAL NOT NULL,
    "orden" INTEGER NOT NULL,
    "bodega" VARCHAR(15) NOT NULL,
    "estado" VARCHAR(15) NOT NULL DEFAULT 'por_conciliar',
    "creado_por" VARCHAR(40),
    "creado_nombre" VARCHAR(120),
    "fecha" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto_por" VARCHAR(40),
    "resuelto_nombre" VARCHAR(120),
    "fecha_resolucion" TIMESTAMPTZ(6),
    "nota" VARCHAR(300),
    "calidad" VARCHAR(30) NOT NULL,

    CONSTRAINT "recibo_ciego_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recibo_ciego_linea" (
    "id" SERIAL NOT NULL,
    "recibo_id" INTEGER NOT NULL,
    "ean" VARCHAR(50) NOT NULL,
    "lote" VARCHAR(30) NOT NULL,
    "vence" DATE,
    "cajas" INTEGER NOT NULL,
    "cantidad" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "recibo_ciego_linea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recibo_ciego_estado_idx" ON "recibo_ciego"("estado");
CREATE INDEX "recibo_ciego_orden_idx" ON "recibo_ciego"("orden");
CREATE INDEX "recibo_ciego_linea_recibo_id_idx" ON "recibo_ciego_linea"("recibo_id");

-- AddForeignKey
ALTER TABLE "recibo_ciego_linea" ADD CONSTRAINT "recibo_ciego_linea_recibo_id_fkey" FOREIGN KEY ("recibo_id") REFERENCES "recibo_ciego"("id") ON DELETE CASCADE ON UPDATE CASCADE;
