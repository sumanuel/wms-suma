-- CreateTable
CREATE TABLE "impresora_etiquetas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(40) NOT NULL,
    "host" VARCHAR(120) NOT NULL,
    "puerto" INTEGER NOT NULL DEFAULT 9100,
    "dpi" INTEGER NOT NULL DEFAULT 203,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "creada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impresora_etiquetas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "impresora_etiquetas_nombre_key" ON "impresora_etiquetas"("nombre");
