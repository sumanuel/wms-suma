-- CreateTable
CREATE TABLE "pallet_despacho" (
    "id" SERIAL NOT NULL,
    "bodega" VARCHAR(15) NOT NULL,
    "estado" VARCHAR(12) NOT NULL DEFAULT 'abierto',
    "creado_en" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por" VARCHAR(40),
    "alto" DECIMAL(18,2),
    "ancho" DECIMAL(18,2),
    "largo" DECIMAL(18,2),
    "peso" DECIMAL(18,2),
    "transportador" VARCHAR(50),
    "remesa" VARCHAR(50),
    "placa" VARCHAR(20),
    "despachado_en" TIMESTAMPTZ(6),
    "despachado_por" VARCHAR(40),

    CONSTRAINT "pallet_despacho_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pallet_despacho_caja" (
    "id" SERIAL NOT NULL,
    "pallet_id" INTEGER NOT NULL,
    "picking" INTEGER NOT NULL,
    "caja" INTEGER NOT NULL,

    CONSTRAINT "pallet_despacho_caja_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pallet_despacho_estado_idx" ON "pallet_despacho"("estado");
CREATE INDEX "pallet_despacho_caja_pallet_id_idx" ON "pallet_despacho_caja"("pallet_id");
CREATE UNIQUE INDEX "pallet_despacho_caja_picking_caja_key" ON "pallet_despacho_caja"("picking", "caja");

-- AddForeignKey
ALTER TABLE "pallet_despacho_caja" ADD CONSTRAINT "pallet_despacho_caja_pallet_id_fkey" FOREIGN KEY ("pallet_id") REFERENCES "pallet_despacho"("id") ON DELETE CASCADE ON UPDATE CASCADE;
