-- CreateTable
CREATE TABLE "plantilla_zpl" (
    "tipo" VARCHAR(20) NOT NULL,
    "contenido" TEXT NOT NULL,
    "actualizada_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizada_por" VARCHAR(40),

    CONSTRAINT "plantilla_zpl_pkey" PRIMARY KEY ("tipo")
);
