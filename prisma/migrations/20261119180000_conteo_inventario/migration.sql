-- CreateTable
CREATE TABLE "t_temporal_conteowms" (
    "prodean" VARCHAR(50) NOT NULL,
    "bod" VARCHAR(15) NOT NULL,
    "caja" DOUBLE PRECISION NOT NULL,
    "idconteo" INTEGER NOT NULL,
    "kantidadteo" DOUBLE PRECISION DEFAULT 0,
    "cantidadcontab" DOUBLE PRECISION DEFAULT 0,
    "ubicacion" VARCHAR(20) DEFAULT '',
    "idconsecutivo" SERIAL NOT NULL,
    "estado" INTEGER,
    "descripcion" VARCHAR(150),
    "id_empleado" INTEGER,
    "fechacuenta" TIMESTAMP(3),
    "fin_qtyteorico" DECIMAL(18,3) DEFAULT 0,
    "fin_qtycontabilizado" DECIMAL(18,3) DEFAULT 0,
    "fin_fecha" TIMESTAMP(3),
    "cantidadteoricaerp" DECIMAL(14,3),
    "fechateoricoerp" TIMESTAMP(3),
    "fechalectura" TIMESTAMP(3),
    "estadoajuste" INTEGER,
    "nro" INTEGER,
    "estado_unifica" INTEGER,

    CONSTRAINT "t_temporal_conteowms_pkey" PRIMARY KEY ("idconsecutivo")
);

-- CreateTable
CREATE TABLE "t_temporar_encabezado_conteowms" (
    "idconteo" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3),
    "programa" VARCHAR(50),
    "realiza" VARCHAR(50),
    "tipoconteo" INTEGER DEFAULT 1,
    "productoean" VARCHAR(50),
    "estado" INTEGER,
    "lenguajesql" VARCHAR(500),
    "bodega" VARCHAR(50),

    CONSTRAINT "t_temporar_encabezado_conteowms_pkey" PRIMARY KEY ("idconteo")
);

-- CreateIndex
CREATE INDEX "ix_t_temporal_conteowms_idconteo" ON "t_temporal_conteowms"("idconteo");

-- CreateIndex
CREATE INDEX "ix_t_temporal_conteowms_caja" ON "t_temporal_conteowms"("caja");

-- AddForeignKey
ALTER TABLE "t_temporal_conteowms" ADD CONSTRAINT "fk_t_temporal_conteowms" FOREIGN KEY ("caja") REFERENCES "t_entradas_ras"("cajano") ON DELETE NO ACTION ON UPDATE NO ACTION;
