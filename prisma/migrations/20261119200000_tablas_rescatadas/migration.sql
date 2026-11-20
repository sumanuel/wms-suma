-- CreateTable
CREATE TABLE "t_temp_paretto_rotacion" (
    "wms_id" BIGSERIAL NOT NULL,
    "id" INTEGER,
    "ean" VARCHAR(50),
    "refpadre" VARCHAR(50),
    "descripcion" VARCHAR(200),
    "presentacion" VARCHAR(10),
    "qtypedidosxperiodo" INTEGER,
    "presentacion2" VARCHAR(50),
    "porcetajeitem" DECIMAL(14,3),
    "acumulado" DECIMAL(14,3),
    "qtypedida" DECIMAL(18,5),
    "disponiblepick" DECIMAL(18,5),
    "xraresurtir" DECIMAL(18,5),
    "ubicaciones" VARCHAR(500),
    "clasificacion" VARCHAR(2),

    CONSTRAINT "t_temp_paretto_rotacion_pkey" PRIMARY KEY ("wms_id")
);

-- CreateTable
CREATE TABLE "t_wms_temporal_asigna_prepacking" (
    "wms_id" BIGSERIAL NOT NULL,
    "idpicking" DOUBLE PRECISION,
    "kaja" DOUBLE PRECISION,
    "ubicacion" VARCHAR(150),
    "canti" DOUBLE PRECISION,
    "lote" VARCHAR(50),
    "ean" VARCHAR(50),
    "pedido" VARCHAR(50),
    "pventaped" DOUBLE PRECISION,
    "bonif" DOUBLE PRECISION,
    "completa" INTEGER,
    "bode" VARCHAR(50),
    "cmvped" DOUBLE PRECISION,

    CONSTRAINT "t_wms_temporal_asigna_prepacking_pkey" PRIMARY KEY ("wms_id")
);

-- CreateTable
CREATE TABLE "t_temporal_conteowms_multiproducto" (
    "id" SERIAL NOT NULL,
    "idconteo" INTEGER NOT NULL,
    "caja" DOUBLE PRECISION NOT NULL,
    "ubicacion" VARCHAR(20),
    "barcode" VARCHAR(50) NOT NULL,
    "cantidadteorica" INTEGER DEFAULT 0,
    "cantidadcontab" INTEGER DEFAULT 0,
    "fin_qtyteorico" INTEGER DEFAULT 0,
    "fin_qtycontab" INTEGER DEFAULT 0,
    "fecha_lectura" TIMESTAMP(3),
    "fecha_fin" TIMESTAMP(3),
    "estado" INTEGER DEFAULT 0,
    "estadoajuste" INTEGER DEFAULT 0,
    "ean" VARCHAR(50) NOT NULL,

    CONSTRAINT "t_temporal_conteowms_multiproducto_pkey" PRIMARY KEY ("idconteo","caja","barcode")
);

-- CreateIndex
CREATE INDEX "ix_t_wms_temporal_asigna_prepacking_idpicking" ON "t_wms_temporal_asigna_prepacking"("idpicking");

-- AddForeignKey
ALTER TABLE "t_temporal_conteowms_multiproducto" ADD CONSTRAINT "fk_t_temporal_conteowms_multiproducto_t_entradas_ras" FOREIGN KEY ("caja") REFERENCES "t_entradas_ras"("cajano") ON DELETE NO ACTION ON UPDATE NO ACTION;
