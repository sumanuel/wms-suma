-- Índices no únicos de las consultas de inventario (ver scripts/legado/indices.txt).
CREATE INDEX "ix_t_historia_status_calidad_lote_productoean" ON "t_historia_status_calidad"("lote", "productoean");
CREATE INDEX "ix_t_ins_coordenadas_bodegac" ON "t_ins_coordenadas"("bodegac");
CREATE INDEX "ix_t_pic_lote_cod_producto" ON "t_pic"("lote", "cod_producto");
CREATE INDEX "ix_t_pic_ubicacion" ON "t_pic"("ubicacion");
CREATE INDEX "ix_t_pic_cajap" ON "t_pic"("cajap");
CREATE INDEX "ix_t_entradas_ras_lote_orden_producto" ON "t_entradas_ras"("lote_orden", "producto");
