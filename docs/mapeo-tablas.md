# Mapeo del esquema legado (generado)

Tablas convertidas: **94** · relaciones: **41**. Generado por `scripts/legado/convertir_tablas.py`.

## Tablas por archivo de esquema

| Archivo | Modelo | Tabla nueva | Tabla legada |
|---|---|---|---|
| 30_maestros.prisma | Clientes | t_clientes | T_clientes |
| 30_maestros.prisma | ClientesDirecciones | t_clientes_direcciones | T_clientes_Direcciones |
| 30_maestros.prisma | DetalleRefenciaCv | t_detalle_refencia_cv | t_detalle_refencia_CV |
| 30_maestros.prisma | DetalleReferencia | t_detalle_referencia | T_Detalle_Referencia |
| 30_maestros.prisma | DetalleReferenciaExt | t_detalle_referencia_ext | T_detalle_referencia_ext |
| 30_maestros.prisma | InsConsultasAleatorias | t_ins_consultas_aleatorias | T_ins_Consultas_Aleatorias |
| 30_maestros.prisma | InsDescripciones | t_ins_descripciones | T_ins_Descripciones |
| 30_maestros.prisma | InsGenericos | t_ins_genericos | T_ins_genericos |
| 30_maestros.prisma | InsReferencias | t_ins_referencias | T_ins_referencias |
| 30_maestros.prisma | InsRegistoSanitario | t_ins_registo_sanitario | T_ins_Registo_Sanitario |
| 30_maestros.prisma | InsWms | t_ins_wms | T_ins_WMS |
| 30_maestros.prisma | LogTransacciones | t_log_transacciones | T_Log_Transacciones |
| 30_maestros.prisma | Metacadena | t_metacadena | T_MetaCadena |
| 30_maestros.prisma | ProgramasUsuarios | t_programas_usuarios | T_Programas_Usuarios |
| 30_maestros.prisma | Templeados | templeados | Templeados |
| 30_maestros.prisma | Traza | traza | traza |
| 30_maestros.prisma | Usuarios | t_usuarios | T_Usuarios |
| 40_inventario.prisma | EquivalenciasEan | t_equivalencias_ean | T_Equivalencias_EAN |
| 40_inventario.prisma | HistoriaStatusCalidad | t_historia_status_calidad | T_Historia_Status_Calidad |
| 40_inventario.prisma | HistoriaStatusRechazo | t_historia_status_rechazo | t_historia_status_rechazo |
| 40_inventario.prisma | MaestroLotePt | t_maestro_lote_pt | T_Maestro_lote_PT |
| 40_inventario.prisma | PdtoTerminado | t_pdto_terminado | T_pdto_TERMINADO |
| 40_inventario.prisma | RelacionCodbarras | t_relacion_codbarras | T_Relacion_CodBarras |
| 40_inventario.prisma | Resumenstatuscalidad | t_resumenstatuscalidad | t_resumenStatusCalidad |
| 40_inventario.prisma | TempParettoRotacion | t_temp_paretto_rotacion | t_temp_paretto_rotacion |
| 50_ubicaciones.prisma | EmpleadosZonas | t_empleados_zonas | T_Empleados_Zonas |
| 50_ubicaciones.prisma | InsBodega | t_ins_bodega | T_ins_Bodega |
| 50_ubicaciones.prisma | InsMapasWms | t_ins_mapas_wms | T_ins_Mapas_WMS |
| 50_ubicaciones.prisma | InsUbicacionesFijasMp | t_ins_ubicaciones_fijas_mp | T_Ins_Ubicaciones_Fijas_MP |
| 50_ubicaciones.prisma | InsZonaEmpleado | t_ins_zona_empleado | T_ins_Zona_Empleado |
| 60_pedidos.prisma | Ajustedereserva | t_ajustedereserva | T_AjusteDeReserva |
| 60_pedidos.prisma | DetalleOrdenCompra | t_detalle_orden_compra | T_detalle_ORDEN_Compra |
| 60_pedidos.prisma | Encabezadopedido | t_encabezadopedido | T_encabezadoPedido |
| 60_pedidos.prisma | InsCoordenadas | t_ins_coordenadas | T_Ins_Coordenadas |
| 60_pedidos.prisma | InsCoordenadasPods | t_ins_coordenadas_pods | t_ins_coordenadas_pods |
| 60_pedidos.prisma | InsPermisosxusuarioTipodeorden | t_ins_permisosxusuario_tipodeorden | T_ins_PermisosxUsuario_TipoDeOrden |
| 60_pedidos.prisma | InsProcesos | t_ins_procesos | T_ins_procesos |
| 60_pedidos.prisma | InsTiposdeorden | t_ins_tiposdeorden | T_ins_tiposDeOrden |
| 60_pedidos.prisma | MaterialesPorOrden | t_materiales_por_orden | T_materiales_por_orden |
| 60_pedidos.prisma | NarthEncabezadoPedido | t_narth_encabezado_pedido | T_Narth_Encabezado_Pedido |
| 60_pedidos.prisma | NarthSeriePedido | t_narth_serie_pedido | T_Narth_Serie_Pedido |
| 60_pedidos.prisma | OrdenCompra | t_orden_compra | T_Orden_COMPRA |
| 60_pedidos.prisma | Pic | t_pic | T_PIC |
| 60_pedidos.prisma | PicAjuste | t_pic_ajuste | T_PIC_Ajuste |
| 60_pedidos.prisma | PicMultiproducto | t_pic_multiproducto | T_PIC_multiproducto |
| 60_pedidos.prisma | PicPods | t_pic_pods | t_pic_pods |
| 60_pedidos.prisma | PicUbicacionesfijasxean | t_pic_ubicacionesfijasxean | T_PIC_UbicacionesFijasxEan |
| 60_pedidos.prisma | ProcesosOredenes | t_procesos_oredenes | T_procesos_OREDENES |
| 60_pedidos.prisma | ProgramacionProduccion | t_programacion_produccion | T_Programacion_Produccion |
| 60_pedidos.prisma | SeriePedidoNueva | t_serie_pedido_nueva | T_Serie_Pedido_Nueva |
| 60_pedidos.prisma | Seriepedido | t_seriepedido | T_seriePedido |
| 60_pedidos.prisma | TggTPic | tgg_t_pic | TGG_t_pic |
| 70_prepacking.prisma | Boxplan | t_boxplan | t_BoxPlan |
| 70_prepacking.prisma | CajaContenedora | t_caja_contenedora | t_caja_contenedora |
| 70_prepacking.prisma | DetallePrepack | t_detalle_prepack | T_Detalle_Prepack |
| 70_prepacking.prisma | DetallePrepackXlineapedido | t_detalle_prepack_xlineapedido | T_Detalle_Prepack_xLineaPedido |
| 70_prepacking.prisma | EncabezadoPrepack | t_encabezado_prepack | T_encabezado_Prepack |
| 70_prepacking.prisma | EncabezadoPrepackCargue | t_encabezado_prepack_cargue | t_encabezado_prepack_cargue |
| 70_prepacking.prisma | EncabezadoPrepackExt | t_encabezado_prepack_ext | t_encabezado_prepack_ext |
| 70_prepacking.prisma | InsValoresfijosxempaque | t_ins_valoresfijosxempaque | t_ins_valoresFijosxEmpaque |
| 70_prepacking.prisma | InsVolumenesxean | t_ins_volumenesxean | T_ins_VolumenesxEAN |
| 70_prepacking.prisma | Pallets | t_pallets | T_Pallets |
| 70_prepacking.prisma | Ssccxcaja | t_ssccxcaja | T_SSCCxCaja |
| 70_prepacking.prisma | Tbltextoimprimezpl | tbltextoimprimezpl | tbltextoimprimezpl |
| 70_prepacking.prisma | TggTRegMovimientosdecaja | tgg_t_reg_movimientosdecaja | TGG_T_reg_MovimientosDeCaja |
| 70_prepacking.prisma | Tiposdecaja | tiposdecaja | TiposDeCaja |
| 70_prepacking.prisma | VblesLogisticasxcaja | t_vbles_logisticasxcaja | T_Vbles_LogisticasxCaja |
| 70_prepacking.prisma | WmsTemporalAsignaPrepacking | t_wms_temporal_asigna_prepacking | T_WMS_Temporal_Asigna_Prepacking |
| 80_aduana.prisma | AduanaEnvioLiquidado | t_aduana_envio_liquidado | t_aduana_envio_liquidado |
| 80_aduana.prisma | AduanaRecepcion | t_aduana_recepcion | T_Aduana_Recepcion |
| 80_aduana.prisma | AduanaRecepcionArchivoedi | t_aduana_recepcion_archivoedi | T_Aduana_Recepcion_ArchivoEDI |
| 80_aduana.prisma | AduanaWmsPos | t_aduana_wms_pos | T_Aduana_WMS_POS |
| 80_aduana.prisma | EntradasRas | t_entradas_ras | T_entradas_RAS |
| 80_aduana.prisma | ImportaReciboCiego | t_importa_recibo_ciego | t_importa_recibo_ciego |
| 80_aduana.prisma | Recepcionextendida | t_recepcionextendida | T_RecepcionExtendida |
| 80_aduana.prisma | TraerRas | t_traer_ras | T_traer_RAS |
| 90_despacho.prisma | CodigosCiudadDane | t_codigos_ciudad_dane | T_Codigos_Ciudad_DANE |
| 90_despacho.prisma | DepartamentomunicipioDane | t_departamentomunicipio_dane | T_DepartamentoMunicipio_DANE |
| 90_despacho.prisma | Despachos | t_despachos | T_DESPACHOS |
| 90_despacho.prisma | GuiasGeneradas | t_guias_generadas | T_Guias_Generadas |
| 90_despacho.prisma | InsTarifasdetransporte | t_ins_tarifasdetransporte | T_ins_TarifasDeTransporte |
| 90_despacho.prisma | TotalcodeGuiagenerada | t_totalcode_guiagenerada | t_totalCode_guiaGenerada |
| 90_despacho.prisma | Transportador | t_transportador | T_transportador |
| 95_conteo.prisma | TemporalConteowms | t_temporal_conteowms | T_Temporal_ConteoWMS |
| 95_conteo.prisma | TemporalConteowmsMultiproducto | t_temporal_conteowms_multiproducto | T_Temporal_ConteoWMS_multiproducto |
| 95_conteo.prisma | TemporarEncabezadoConteowms | t_temporar_encabezado_conteowms | T_Temporar_Encabezado_ConteoWMS |
| 96_erp.prisma | Facturacion | ta_facturacion | TA_Facturacion |
| 96_erp.prisma | FacturacionPpal | t_facturacion_ppal | T_facturacion_Ppal |
| 96_erp.prisma | InsDetallesdeimpuesto | t_ins_detallesdeimpuesto | T_Ins_DetallesDeImpuesto |
| 96_erp.prisma | InsListaPrecioPpal | t_ins_lista_precio_ppal | T_ins_Lista_Precio_PPal |
| 96_erp.prisma | InsTarifasdeimpuesto | t_ins_tarifasdeimpuesto | T_Ins_TarifasDeImpuesto |
| 96_erp.prisma | InsTrm | t_ins_trm | T_ins_TRM |
| 96_erp.prisma | Panoramacontable | t_panoramacontable | T_PanoramaContable |
| 96_erp.prisma | PlanCuentas | t_plan_cuentas | T_plan_cuentas |

## Tablas excluidas (temporales o de prueba) (8)

- pruebaa
- t_prueba
- t_ver
- tmpEtiquetaSsccxcaja
- tmpImpresionesDeStatusCalidad
- tmpMvtoERP
- tmpStatusCalidad
- tmpTicketesxRangoCajas

## Tablas sin PK ni IDENTITY: se agregó la clave `wms_id` (al migrar datos se numera sola) (5)

- T_Aduana_Recepcion
- T_Aduana_Recepcion_ArchivoEDI
- T_DepartamentoMunicipio_DANE
- t_temp_paretto_rotacion
- T_WMS_Temporal_Asigna_Prepacking

## Tablas sin PK: se usó la columna IDENTITY como clave (19)

- T_Aduana_WMS_POS
- T_AjusteDeReserva
- t_BoxPlan
- T_detalle_referencia_ext
- t_encabezado_prepack_ext
- T_Equivalencias_EAN
- T_Historia_Status_Calidad
- T_ins_tiposDeOrden
- T_Log_Transacciones
- T_PIC_multiproducto
- T_Programacion_Produccion
- T_RecepcionExtendida
- t_resumenStatusCalidad
- T_Temporal_ConteoWMS
- t_totalCode_guiaGenerada
- T_traer_RAS
- tbltextoimprimezpl
- TGG_t_pic
- traza

## Columnas IDENTITY (al migrar datos hay que ajustar la secuencia con setval) (60)

- t_aduana_envio_liquidado.id
- T_Aduana_WMS_POS.ID
- T_AjusteDeReserva.id
- t_BoxPlan.id
- t_caja_contenedora.id
- T_DESPACHOS.REPORTE
- T_detalle_ORDEN_Compra.iddetordcomppra
- T_Detalle_Prepack.IddetPripack
- T_Detalle_Prepack_xLineaPedido.IddetPripack
- T_detalle_referencia_ext.id
- t_encabezado_prepack_cargue.id
- t_encabezado_prepack_ext.id
- T_encabezadoPedido.autoorden
- T_Equivalencias_EAN.ID
- T_Guias_Generadas.auto
- T_Historia_Status_Calidad.ID
- t_historia_status_rechazo.id
- t_importa_recibo_ciego.id
- T_ins_genericos.idgenericos
- T_ins_Lista_Precio_PPal.idlistapre
- T_ins_Mapas_WMS.MapaId
- T_ins_PermisosxUsuario_TipoDeOrden.id
- T_ins_Registo_Sanitario.id
- T_Ins_TarifasDeImpuesto.Id
- T_ins_TarifasDeTransporte.ID
- T_ins_tiposDeOrden.ID
- T_ins_TRM.IdTRM
- T_Ins_Ubicaciones_Fijas_MP.IdUbicacion
- t_ins_valoresFijosxEmpaque.ID
- T_ins_WMS.WMSId
- T_Log_Transacciones.IdLog
- T_Maestro_lote_PT.idLote
- T_materiales_por_orden.iditem
- T_MetaCadena.IDCadena
- T_Narth_Serie_Pedido.contador
- T_Orden_COMPRA.consecutivoauto
- T_Pallets.IdPallet
- T_PIC_Ajuste.id
- T_PIC_multiproducto.id
- t_pic_pods.id
- T_PIC_UbicacionesFijasxEan.id
- T_procesos_OREDENES.controltiquete
- T_Programacion_Produccion.Id
- T_Programas_Usuarios.Id
- T_RecepcionExtendida.id
- t_resumenStatusCalidad.id
- T_Serie_Pedido_Nueva.idseriepedidonueva
- T_SSCCxCaja.idItemSSCC
- T_Temporal_ConteoWMS.idconsecutivo
- T_Temporal_ConteoWMS_multiproducto.id
- t_totalCode_guiaGenerada.Id
- T_traer_RAS.id
- T_Usuarios.Id
- T_Vbles_LogisticasxCaja.id
- TA_Facturacion.numero
- tbltextoimprimezpl.id
- Templeados.Id
- TGG_t_pic.id
- TGG_T_reg_MovimientosDeCaja.id
- traza.id

## Columnas calculadas NO convertidas (reconstruir como vista, GENERATED o en código) (13)

- T_facturacion_Ppal.saldo = (isnull([neto],(0))-isnull([abono],(0)))
- T_Narth_Serie_Pedido._xEntregar = (isnull([pares]-[udsentreg],(0)))
- T_pdto_TERMINADO.Saldo = ((isnull([etrpdn1a],(0))+isnull([ininicial],(0)))-isnull([salifact],(0)))
- T_PIC.saldo = ([entradas]-[salidas])
- T_PIC_multiproducto.saldo = ([entradas]-[salidas])
- t_pic_pods.saldo = ([entradas]-[salidas])
- T_PIC_UbicacionesFijasxEan.Saldo = ([Entradas]-[Salidas])
- T_Relacion_CodBarras.qtypesounitario = (case when isnull([Cantidad_tara],(0))>(0) then ([pesobruto]-[qtytara])/[Cantidad_tara] else (0) end)
- T_SSCCxCaja.difpendiente = ([cantidad]-[cantidadAduanada])
- T_Temporal_ConteoWMS.fin_diferencia = ([fin_qtyContabilizado]-[fin_qtyTeorico])
- T_Temporal_ConteoWMS.diferencia = ([CantidadContab]-[kantidadTeo])
- T_Temporal_ConteoWMS_multiproducto.Diferencia = ([cantidadcontab]-[cantidadteorica])
- T_Temporal_ConteoWMS_multiproducto.fin_Diferencia = ([fin_qtyteorico]-[fin_qtycontab])

## Valores por defecto NO convertidos (expresiones T-SQL) (2)

- T_seriePedido.fechaprepara = ('')
- T_Temporal_ConteoWMS.fin_fecha = (NULL)

## Columnas renombradas por colisión (1)

- T_clientes.pais -> pais_2 (colisión de mayúsculas)

## Claves foráneas duplicadas en el legado (se conserva una) (1)

- T_PIC FK_T_PIC_T_entradas_RAS: igual a otra FK ya incluida (mismas columnas y padre)

## Claves foráneas hacia tablas fuera del núcleo (omitidas) (2)

- T_Programas_Usuarios -> T_Programas (FK_T_programas_usuarios_T_Programas)
- T_Usuarios -> T_Companias (FK_T_Usuarios_T_Companias)

## Líneas del DDL no reconocidas (131)

- t_aduana_envio_liquidado: [picking] ASC,
- t_aduana_envio_liquidado: [Transportador] ASC
- T_Aduana_WMS_POS: [ID] ASC
- t_caja_contenedora: [id] ASC
- T_clientes: [NIT] ASC
- T_clientes: [NIT] ASC
- T_clientes_Direcciones: [ITEM] ASC
- T_Codigos_Ciudad_DANE: [Codigo_DANE] ASC
- T_DESPACHOS: [REPORTE] ASC
- T_detalle_ORDEN_Compra: [iddetordcomppra] ASC
- T_Detalle_Prepack: [IddetPripack] ASC
- T_Detalle_Prepack: [IddetPripack] ASC
- T_Detalle_Prepack_xLineaPedido: [IddetPripack] ASC
- T_Detalle_Prepack_xLineaPedido: [IddetPripack] ASC
- t_detalle_refencia_CV: [productoEAN] ASC
- T_Detalle_Referencia: [ProductoEAN] ASC
- T_Empleados_Zonas: [Empleado] ASC,
- T_Empleados_Zonas: [Zona] ASC
- T_encabezado_Prepack: [IdMovimiento] ASC
- T_encabezado_Prepack: [Picking] ASC,
- T_encabezado_Prepack: [consmov] ASC
- T_encabezado_Prepack: [consmov] ASC
- t_encabezado_prepack_cargue: [id] ASC
- t_encabezado_prepack_cargue: [cargue] ASC,
- t_encabezado_prepack_cargue: [bigpicking] ASC,
- t_encabezado_prepack_cargue: [unitarizador] ASC,
- t_encabezado_prepack_cargue: [zonapiso] ASC
- T_encabezadoPedido: [NPEDIDO] ASC
- T_entradas_RAS: [CajaNo] ASC
- T_Equivalencias_EAN: [ID] ASC
- T_facturacion_Ppal: [Num_Factura] ASC
- T_Guias_Generadas: [auto] ASC
- T_Guias_Generadas: [Num_Guia] ASC,
- T_Guias_Generadas: [pedido] ASC,
- T_Guias_Generadas: [Factura] ASC,
- T_Guias_Generadas: [PrepackingID] ASC
- T_Historia_Status_Calidad: [ID] ASC
- t_historia_status_rechazo: [id] ASC
- t_importa_recibo_ciego: [id] ASC
- T_ins_Bodega: [Bodega] ASC
- T_ins_Consultas_Aleatorias: [codSelec] ASC
- T_Ins_Coordenadas: [Ubicación] ASC
- t_ins_coordenadas_pods: [ubicacion] ASC
- T_ins_Descripciones: [Grupo] ASC,
- T_ins_Descripciones: [CodigoDescripcion] ASC
- T_Ins_DetallesDeImpuesto: [CodigoDeImpuesto] ASC
- T_ins_genericos: [idgenericos] ASC
- T_ins_Lista_Precio_PPal: [Refe] ASC,
- T_ins_Lista_Precio_PPal: [Lista] ASC
- T_ins_Mapas_WMS: [MapaId] ASC
- T_ins_PermisosxUsuario_TipoDeOrden: [id] ASC
- T_ins_PermisosxUsuario_TipoDeOrden: [Programa] ASC,
- T_ins_PermisosxUsuario_TipoDeOrden: [Tipoo] ASC,
- T_ins_PermisosxUsuario_TipoDeOrden: [usuario] ASC
- T_ins_procesos: [COD_PROCES] ASC,
- T_ins_procesos: [REFERENCIA] ASC
- T_ins_referencias: [CODIGOREFERENCIA] ASC
- T_ins_Registo_Sanitario: [Cod_Registro] ASC,
- T_ins_Registo_Sanitario: [ProductoEAN] ASC
- T_Ins_TarifasDeImpuesto: [Id] ASC
- T_Ins_TarifasDeImpuesto: [CodigoTarifa] ASC,
- T_Ins_TarifasDeImpuesto: [CodigoDeImpuesto] ASC
- T_ins_TarifasDeTransporte: [ID] ASC
- T_ins_tiposDeOrden: [ID] ASC
- T_ins_tiposDeOrden: [CODIGO] ASC
- T_ins_TRM: [IdTRM] ASC
- T_Ins_Ubicaciones_Fijas_MP: [IdUbicacion] ASC
- T_Ins_Ubicaciones_Fijas_MP: [Bodega] ASC,
- T_Ins_Ubicaciones_Fijas_MP: [EanMaterial] ASC
- t_ins_valoresFijosxEmpaque: [ID] ASC
- T_ins_VolumenesxEAN: [GTIN] ASC
- T_ins_WMS: [WMSId] ASC
- T_ins_Zona_Empleado: [Empleado] ASC,
- T_ins_Zona_Empleado: [Zona] ASC
- T_ins_Zona_Empleado: [Empleado] ASC,
- T_ins_Zona_Empleado: [Zona] ASC
- T_Log_Transacciones: [IdLog] ASC
- T_Maestro_lote_PT: [loteproveedor] ASC,
- T_Maestro_lote_PT: [codEan] ASC
- T_Maestro_lote_PT: [idLote] ASC
- T_materiales_por_orden: [iditem] ASC
- T_MetaCadena: [IDCadena] ASC
- T_Narth_Encabezado_Pedido: [NPEDIDO] ASC
- T_Narth_Serie_Pedido: [contador] ASC
- T_Orden_COMPRA: [numordencompra] ASC
- T_Pallets: [IdPallet] ASC
- T_Pallets: [CajaAsociada] ASC
- T_PanoramaContable: [Codigo] ASC
- T_pdto_TERMINADO: [bod] ASC,
- T_pdto_TERMINADO: [PRODEAN] ASC
- T_PIC: [Cod_producto] ASC,
- T_PIC: [bodePicking] ASC,
- T_PIC: [cajaP] ASC
- T_PIC_Ajuste: [id] ASC
- T_PIC_multiproducto: [cajap] ASC,
- T_PIC_multiproducto: [productoEAN] ASC,
- T_PIC_multiproducto: [loteproveedor] ASC
- t_pic_pods: [id] ASC
- t_pic_pods: [cajap_pods] ASC,
- t_pic_pods: [productoEAN] ASC,
- t_pic_pods: [ubicacion] ASC
- T_PIC_UbicacionesFijasxEan: [ProductoEAN] ASC,
- T_PIC_UbicacionesFijasxEan: [Ubicacion] ASC
- T_plan_cuentas: [NUMCUENTA] ASC
- T_procesos_OREDENES: [controltiquete] ASC
- T_procesos_OREDENES: [ORDEN] ASC,
- T_procesos_OREDENES: [COD_PROCES] ASC
- T_Programacion_Produccion: [Id] ASC
- T_Programas_Usuarios: [Id] ASC
- T_Relacion_CodBarras: [CodBarrasAsignado] ASC
- T_Relacion_CodBarras: [IdInternoEAN] ASC,
- T_Relacion_CodBarras: [CodBarrasAsignado] ASC
- T_Serie_Pedido_Nueva: [idseriepedidonueva] ASC
- T_seriePedido: [ORDENPDN] ASC
- T_SSCCxCaja: [idItemSSCC] ASC
- T_SSCCxCaja: [id] ASC,
- T_SSCCxCaja: [idItemSSCC] ASC
- T_SSCCxCaja: [id] ASC
- T_Temporal_ConteoWMS_multiproducto: [idConteo] ASC,
- T_Temporal_ConteoWMS_multiproducto: [caja] ASC,
- T_Temporal_ConteoWMS_multiproducto: [barcode] ASC
- T_Temporar_Encabezado_ConteoWMS: [idConteo] ASC
- T_traer_RAS: [id] ASC
- T_transportador: [Transportador] ASC
- T_Usuarios: [Id] ASC
- T_Vbles_LogisticasxCaja: [CajaNo] ASC,
- T_Vbles_LogisticasxCaja: [codean] ASC
- TA_Facturacion: [nfact] ASC
- Templeados: [Id] ASC
- TGG_T_reg_MovimientosDeCaja: [id] ASC
- TiposDeCaja: [TIPO_CAJA] ASC
