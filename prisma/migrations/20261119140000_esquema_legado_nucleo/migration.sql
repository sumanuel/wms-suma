-- CreateTable
CREATE TABLE "t_clientes" (
    "nit" VARCHAR(15) NOT NULL,
    "nombrecliente" VARCHAR(70),
    "nomcorto" VARCHAR(50),
    "telefono" VARCHAR(50),
    "tele2" VARCHAR(50),
    "tele3" VARCHAR(50),
    "celular" VARCHAR(50),
    "direccion" VARCHAR(200) DEFAULT '',
    "fax" VARCHAR(50) DEFAULT '',
    "ciudad" VARCHAR(50) DEFAULT '',
    "beeper" VARCHAR(50),
    "email" VARCHAR(70) DEFAULT '',
    "condicionesventa" INTEGER,
    "cupoasignado" DOUBLE PRECISION,
    "vendedor" VARCHAR(50),
    "tipo_cliente" VARCHAR(100),
    "pais" VARCHAR(20),
    "canal" VARCHAR(100),
    "depto" VARCHAR(30),
    "activo" INTEGER DEFAULT 0,
    "bloqueado" INTEGER DEFAULT 0,
    "inactivo" INTEGER DEFAULT 0,
    "pais_2" VARCHAR(20),
    "observaciones" TEXT,
    "contacto1" VARCHAR(50),
    "cd1" VARCHAR(50),
    "telefono_contac1" VARCHAR(50),
    "direccion_contac1" VARCHAR(50),
    "email_contac1" VARCHAR(60),
    "contacto2" VARCHAR(50),
    "cd2" VARCHAR(50),
    "telefono_contac2" VARCHAR(50),
    "direccion_contac2" VARCHAR(50),
    "email_contac2" VARCHAR(60),
    "contacto3" VARCHAR(50),
    "cd3" VARCHAR(50),
    "telefonocontac3" VARCHAR(50),
    "direccioncontac3" VARCHAR(50),
    "email_contac3" VARCHAR(60),
    "contacto4" VARCHAR(50),
    "cd4" VARCHAR(50),
    "telefono_contac4" VARCHAR(50),
    "direccioncontac4" VARCHAR(50),
    "email_contac4" VARCHAR(60),
    "contacto5" VARCHAR(50),
    "cd5" VARCHAR(50),
    "telefonocontac5" VARCHAR(50),
    "direccioncontac5" VARCHAR(50),
    "email_contac5" VARCHAR(60),
    "contacto6" VARCHAR(50),
    "cd6" VARCHAR(50),
    "telefonocontac6" VARCHAR(50),
    "direccioncontac6" VARCHAR(50),
    "email_contac6" VARCHAR(60),
    "contacto7" VARCHAR(50),
    "cd7" VARCHAR(50),
    "telefonocontac7" VARCHAR(50),
    "direccioncontac7" VARCHAR(50),
    "email_contac7" VARCHAR(60),
    "dto1" DOUBLE PRECISION,
    "plazo2" INTEGER,
    "dto2" DOUBLE PRECISION,
    "plazo3" INTEGER,
    "dto3" DOUBLE PRECISION,
    "ob1" TEXT,
    "fechaingreso" TIMESTAMP(3),
    "mercado" INTEGER,
    "zona" INTEGER,
    "tipodedocumento" INTEGER,
    "primernombre" VARCHAR(50),
    "segundonombre" VARCHAR(50),
    "primerapellido" VARCHAR(50),
    "segundoapellido" VARCHAR(50),
    "actividad_economica" VARCHAR(50),
    "img_cliente" BYTEA,

    CONSTRAINT "t_clientes_pkey" PRIMARY KEY ("nit")
);

-- CreateTable
CREATE TABLE "t_clientes_direcciones" (
    "item" INTEGER NOT NULL,
    "nit" VARCHAR(15),
    "ivac" DOUBLE PRECISION,
    "dctos" DOUBLE PRECISION DEFAULT 0,
    "nombrecliente" VARCHAR(70),
    "telefono" VARCHAR(50),
    "direccion" VARCHAR(200),
    "ciudad" VARCHAR(50),
    "coveta" INTEGER,
    "vendedor" VARCHAR(50),
    "nitvariable" VARCHAR(15),
    "rtfte" DOUBLE PRECISION,
    "lprecio" INTEGER,
    "tipo" VARCHAR(1),
    "activo" INTEGER DEFAULT 0,
    "clave" VARCHAR(10),
    "zona" VARCHAR(50),
    "campo1" VARCHAR(50),
    "campo2" VARCHAR(50),
    "codint" VARCHAR(15),
    "memocartera" VARCHAR(250),
    "clasificacioncontable" VARCHAR(10),
    "puc" VARCHAR(17),
    "trasportadora" VARCHAR(50) DEFAULT '',
    "division" VARCHAR(50),
    "indicativo" VARCHAR(3),
    "fechaapertura" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "firstname" VARCHAR(100),
    "secondname" VARCHAR(80),
    "firstlastname" VARCHAR(80),
    "secondlastname" VARCHAR(80),
    "cobrasegurodetransporte" BOOLEAN,
    "sedeasignada" VARCHAR(50),
    "radicarfactura" BOOLEAN,
    "requiereordendecompra" BOOLEAN,
    "monedadefacturacion" CHAR(10),
    "generarestadodecuenta" BOOLEAN,
    "observaciones" VARCHAR(1000),
    "isfacturable" BOOLEAN,
    "paisdeorigen" VARCHAR(50),
    "codigopanoramacontable" VARCHAR(10),
    "isactivoproveedor" BOOLEAN,
    "contacto" VARCHAR(50),
    "condicionescompra" INTEGER,
    "tipoprov" VARCHAR(50),
    "marcacomercial" VARCHAR(50),
    "codigopais" VARCHAR(10),
    "beneficiario" VARCHAR(50),
    "codigopanoramacontableprov" VARCHAR(10),
    "clasificacioncontableprov" VARCHAR(10),
    "direccionparacorrespondencia" BOOLEAN,
    "ruta" VARCHAR(15),
    "prefdespacho" CHAR(4),
    "promotor" VARCHAR(100),
    "item3" INTEGER,

    CONSTRAINT "t_clientes_direcciones_pkey" PRIMARY KEY ("item")
);

-- CreateTable
CREATE TABLE "t_detalle_refencia_cv" (
    "productoean" VARCHAR(50) NOT NULL,
    "codigoreferencia" VARCHAR(50),
    "diasvigenciaproveedor" INTEGER,
    "diasvigenciacedi" INTEGER,
    "cantidadempaque" DECIMAL(14,2),
    "peso" DECIMAL(14,3),
    "volumen" DECIMAL(14,3),
    "fechamodificacion" TIMESTAMP(3),
    "stockmin" DECIMAL(14,2),
    "stockmax" DECIMAL(14,2),
    "bodega" VARCHAR(20) NOT NULL,
    "codgrupoprm" VARCHAR(10),
    "controla_status_calidad" INTEGER,
    "factor_estibado" INTEGER,
    "controlafechavencimiento" INTEGER,

    CONSTRAINT "t_detalle_refencia_cv_pkey" PRIMARY KEY ("productoean")
);

-- CreateTable
CREATE TABLE "t_detalle_referencia" (
    "productoean" VARCHAR(50) NOT NULL,
    "presentacion" VARCHAR(50),
    "descripciontalla" VARCHAR(2) DEFAULT '',
    "descripcioncolor" VARCHAR(50),
    "codigoreferencia" VARCHAR(5),
    "descripcion" VARCHAR(120),
    "dimenxion" VARCHAR(50),
    "um1" VARCHAR(50),
    "um2" VARCHAR(50),
    "cantidadempaque" DOUBLE PRECISION,
    "costo" DOUBLE PRECISION,
    "bodega" VARCHAR(15),
    "hrvolumen" DOUBLE PRECISION,
    "hrpeso" DOUBLE PRECISION,
    "cempaque" DOUBLE PRECISION,
    "abuelo" INTEGER,
    "cant_fcos" INTEGER,
    "estado" INTEGER DEFAULT 0,
    "campo1" INTEGER,
    "campo2" INTEGER,
    "puc" VARCHAR(15),
    "suicheweb" INTEGER,
    "ivadetalle" DOUBLE PRECISION,
    "prioridad" INTEGER,
    "codigoreferenciavc" VARCHAR(5),
    "tipo_empaque" VARCHAR(50),
    "tipo_mercado" VARCHAR(50),
    "laboratorio" VARCHAR(50),
    "prioridadrotacion" CHAR(10),
    "nombrecomercial" VARCHAR(50),
    "registroinvima" VARCHAR(50),
    "costopromajustado" DOUBLE PRECISION DEFAULT 0,
    "tiporef" INTEGER,
    "inventariable" SMALLINT DEFAULT 1,
    "categoriaart" CHAR(5) DEFAULT '',
    "claseart" CHAR(5) DEFAULT '',
    "tipoart" CHAR(5) DEFAULT '',
    "fechaapertura" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "pedidoautomatico" INTEGER,
    "fraccion" INTEGER,
    "descuentodistribuidor" DECIMAL(18,0),
    "isfacturable" BOOLEAN,
    "iscompuesto" VARCHAR(1),
    "codigopanoramacontable" VARCHAR(10),
    "costoinicial" DOUBLE PRECISION,
    "stockmin" DECIMAL(15,3),
    "stockmax" DECIMAL(15,3),
    "img_articulo" BYTEA,
    "costopromajustado2" DOUBLE PRECISION,

    CONSTRAINT "t_detalle_referencia_pkey" PRIMARY KEY ("productoean")
);

-- CreateTable
CREATE TABLE "t_detalle_referencia_ext" (
    "id" SERIAL NOT NULL,
    "referencia" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(300) NOT NULL,
    "ean" VARCHAR(50) NOT NULL,
    "consumo_mensual" INTEGER,
    "punto_de_reorden" INTEGER,
    "cantidad_ideal_de_compra" INTEGER,
    "valor_maximo_inventario" DECIMAL(19,3),
    "valor_unitario" DECIMAL(19,3),
    "descripcioncliente" VARCHAR(300) NOT NULL,

    CONSTRAINT "t_detalle_referencia_ext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_ins_consultas_aleatorias" (
    "codselec" VARCHAR(15) NOT NULL,
    "nombre" VARCHAR(150),
    "descripcion" VARCHAR(500),
    "lenguajesql" VARCHAR(500),
    "numcampobusqueda" INTEGER,
    "titulosgrilla" TEXT,
    "anchosgrilla" TEXT,
    "numcolumnanamecontacto" INTEGER,
    "coneccion" VARCHAR(50),
    "usuario" CHAR(25),
    "formulario" VARCHAR(60),

    CONSTRAINT "t_ins_consultas_aleatorias_pkey" PRIMARY KEY ("codselec")
);

-- CreateTable
CREATE TABLE "t_ins_descripciones" (
    "grupo" VARCHAR(100) NOT NULL,
    "codigodescripcion" CHAR(50) NOT NULL,
    "descripcion" VARCHAR(250),
    "descripcion_default" VARCHAR(100),

    CONSTRAINT "t_ins_descripciones_pkey" PRIMARY KEY ("grupo","codigodescripcion")
);

-- CreateTable
CREATE TABLE "t_ins_genericos" (
    "idgenericos" SERIAL NOT NULL,
    "ref" VARCHAR(5),
    "codigoinsumo" VARCHAR(50),
    "consumo" DOUBLE PRECISION,
    "procesoconsume" VARCHAR(50),
    "clase_consumo" VARCHAR(100),
    "orden" SMALLINT,
    "num" VARCHAR(10),
    "paquetes" INTEGER,
    "eaninsumo" VARCHAR(50),
    "escompuesto" VARCHAR(1) DEFAULT '-',
    "descripcion" VARCHAR(150) DEFAULT '',
    "nivel" SMALLINT DEFAULT 1,

    CONSTRAINT "t_ins_genericos_pkey" PRIMARY KEY ("idgenericos")
);

-- CreateTable
CREATE TABLE "t_ins_referencias" (
    "codigoreferencia" VARCHAR(5) NOT NULL,
    "nombreref" VARCHAR(120),
    "tallas" VARCHAR(70),
    "pventa" REAL,
    "foto" BYTEA,
    "linea" VARCHAR(50),
    "cod_muestra" VARCHAR(50),
    "coleccion" VARCHAR(50),
    "observaciones" TEXT,
    "posarancel" VARCHAR(50),
    "fechacrea" TIMESTAMP(3),
    "categoria" VARCHAR(50),
    "dimension" VARCHAR(50),
    "confirmar" BOOLEAN DEFAULT false,
    "hiperfoto" TEXT,
    "tiporef" VARCHAR(2),
    "lote_prox" INTEGER,
    "ano_prox" VARCHAR(50),
    "ceros" VARCHAR(3),
    "abuelo" INTEGER,
    "numero_meses" INTEGER,
    "tipo_producto" VARCHAR(50),
    "grupo_terapeutico" VARCHAR(50),
    "pricipioactivo" VARCHAR(50),
    "unido" VARCHAR(50),
    "referencia" VARCHAR(30),

    CONSTRAINT "t_ins_referencias_pkey" PRIMARY KEY ("codigoreferencia")
);

-- CreateTable
CREATE TABLE "t_ins_registo_sanitario" (
    "id" SERIAL NOT NULL,
    "cod_registro" VARCHAR(50) NOT NULL,
    "productoean" VARCHAR(50) NOT NULL,
    "fecharegistro" TIMESTAMP(3),
    "fechavencimiento" TIMESTAMP(3),
    "codpaisregistro" VARCHAR(10),
    "estado" INTEGER,

    CONSTRAINT "t_ins_registo_sanitario_pkey" PRIMARY KEY ("cod_registro","productoean")
);

-- CreateTable
CREATE TABLE "t_ins_wms" (
    "bode" VARCHAR(20),
    "namearea" VARCHAR(150),
    "x1pos" INTEGER,
    "x2pos" INTEGER,
    "y1pos" INTEGER,
    "y2pos" INTEGER,
    "zonapiso" VARCHAR(15),
    "zonapadre" VARCHAR(15),
    "esfinal" CHAR(1),
    "mapaid" INTEGER,
    "wmsid" SERIAL NOT NULL,

    CONSTRAINT "t_ins_wms_pkey" PRIMARY KEY ("wmsid")
);

-- CreateTable
CREATE TABLE "t_log_transacciones" (
    "idlog" SERIAL NOT NULL,
    "usuario" VARCHAR(50),
    "transaccion" VARCHAR(100),
    "fecha" TIMESTAMP(3),
    "programa" TEXT,
    "formulario" VARCHAR(100),
    "ensamblado" VARCHAR(50),
    "nombredeequipo" VARCHAR(50),
    "direccionip" VARCHAR(50),
    "backup" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "t_log_transacciones_pkey" PRIMARY KEY ("idlog")
);

-- CreateTable
CREATE TABLE "t_metacadena" (
    "idcadena" SERIAL NOT NULL,
    "metacadena" VARCHAR(2000),

    CONSTRAINT "t_metacadena_pkey" PRIMARY KEY ("idcadena")
);

-- CreateTable
CREATE TABLE "t_programas_usuarios" (
    "id" SERIAL NOT NULL,
    "programa" VARCHAR(50) NOT NULL,
    "usuario" INTEGER NOT NULL,
    "grupo" VARCHAR(50),
    "actualizar" BOOLEAN NOT NULL,
    "eliminar" BOOLEAN NOT NULL,
    "consultar" BOOLEAN NOT NULL,
    "adicionar" BOOLEAN NOT NULL,

    CONSTRAINT "t_programas_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templeados" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(50),
    "apellidos" VARCHAR(50),
    "fecha_nacimiento" VARCHAR(50),
    "cedula" VARCHAR(50),
    "telefono" VARCHAR(50),
    "direccion" VARCHAR(50),
    "cuentabancaria" VARCHAR(50),
    "corporacion" VARCHAR(50),
    "eps" VARCHAR(50),
    "numero_eps" VARCHAR(500),
    "ips" VARCHAR(50),
    "numero_ips" VARCHAR(50),
    "foto" BYTEA,
    "fechaingreso" TIMESTAMP(3),
    "fechatermina" TIMESTAMP(3),
    "salabasico" DOUBLE PRECISION,
    "horastraba" DOUBLE PRECISION,
    "prestamos" DOUBLE PRECISION,
    "subtte" DOUBLE PRECISION,
    "dediss" DOUBLE PRECISION,
    "otrasdeducciones" DOUBLE PRECISION,
    "ingresoscontrato" INTEGER,
    "valorhora" DOUBLE PRECISION,
    "nivelempleado" VARCHAR(50),
    "area" VARCHAR(25),
    "estado" BOOLEAN NOT NULL,
    "turno" CHAR(5),

    CONSTRAINT "templeados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "traza" (
    "id" SERIAL NOT NULL,
    "paso" VARCHAR(50),

    CONSTRAINT "traza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_usuarios" (
    "id" SERIAL NOT NULL,
    "usuario" VARCHAR(50) NOT NULL,
    "clave" VARCHAR(50) NOT NULL,
    "grupo" VARCHAR(50) NOT NULL,
    "codcia" VARCHAR(10) NOT NULL,
    "direlectronica" VARCHAR(50),
    "telefono" VARCHAR(10),
    "cargo" VARCHAR(50),
    "direccionip" VARCHAR(15),
    "nombrecompleto" VARCHAR(100),
    "imgfirma" BYTEA,
    "fechacreacion" TIMESTAMP(3),
    "fechamodificacion" TIMESTAMP(3),
    "fechainicio" TIMESTAMP(3),
    "fechavencimiento" TIMESTAMP(3),
    "estado" INTEGER,
    "fechaultimaconexion" TIMESTAMP(3),
    "adminmodificacion" INTEGER,
    "idmac" VARCHAR(100),

    CONSTRAINT "t_usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_equivalencias_ean" (
    "id" SERIAL NOT NULL,
    "ean" VARCHAR(30),
    "cantidad" DOUBLE PRECISION,
    "ean_equivalente" VARCHAR(30),
    "activo" BOOLEAN,

    CONSTRAINT "t_equivalencias_ean_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_historia_status_calidad" (
    "id" SERIAL NOT NULL,
    "lote" VARCHAR(20) NOT NULL,
    "productoean" VARCHAR(50) NOT NULL,
    "fecha_registro" TIMESTAMP(3),
    "estado" VARCHAR(20),
    "id_usuario" INTEGER NOT NULL,
    "saldo" DECIMAL(16,4),

    CONSTRAINT "t_historia_status_calidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_historia_status_rechazo" (
    "id" SERIAL NOT NULL,
    "id_historia_status_calidad" INTEGER NOT NULL,
    "descripcion_status" VARCHAR(100) NOT NULL,
    "fecha_libera_reproceso" TIMESTAMP(3),
    "id_usuario_reproceso" INTEGER,
    "descripcion_solucion" VARCHAR(100),
    "id_lote" VARCHAR(20) NOT NULL,
    "codean" VARCHAR(50) NOT NULL,
    "fecha_reg_falla" TIMESTAMP(3),

    CONSTRAINT "t_historia_status_rechazo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_maestro_lote_pt" (
    "idlote" SERIAL NOT NULL,
    "loteproveedor" VARCHAR(20) NOT NULL,
    "nitprov" VARCHAR(50) NOT NULL,
    "codean" VARCHAR(50) NOT NULL,
    "fechaingresa" TIMESTAMP(3) NOT NULL,
    "fechavence" TIMESTAMP(3) NOT NULL,
    "confirmacertif" INTEGER NOT NULL,
    "pedproveedor" VARCHAR(50),
    "ord_no" VARCHAR(50),
    "numcontrolliberacion" VARCHAR(20),
    "ord_no2" VARCHAR(50),
    "idciego" INTEGER,

    CONSTRAINT "t_maestro_lote_pt_pkey" PRIMARY KEY ("loteproveedor","codean")
);

-- CreateTable
CREATE TABLE "t_pdto_terminado" (
    "bod" VARCHAR(15) NOT NULL,
    "prodean" VARCHAR(50) NOT NULL,
    "ref" VARCHAR(50),
    "color" VARCHAR(50),
    "talla" VARCHAR(2),
    "ininicial" DOUBLE PRECISION DEFAULT 0,
    "etrpdn1a" DOUBLE PRECISION DEFAULT 0,
    "etrpdn2a" INTEGER DEFAULT 0,
    "entrdev" INTEGER DEFAULT 0,
    "salifact" DOUBLE PRECISION DEFAULT 0,
    "resernoconform" DOUBLE PRECISION DEFAULT 0,
    "reserconfirmada" DOUBLE PRECISION DEFAULT 0,
    "reservadopara" INTEGER DEFAULT 0,
    "consignacion" INTEGER DEFAULT 0,
    "planpdnenvia" INTEGER DEFAULT 0,
    "tarifadeimpuesto" VARCHAR(10),
    "panoramacontable" VARCHAR(10),
    "invmax" DOUBLE PRECISION,
    "invmin" DOUBLE PRECISION,
    "multiplocantidad" DOUBLE PRECISION,
    "costopromajustado2" DOUBLE PRECISION,

    CONSTRAINT "t_pdto_terminado_pkey" PRIMARY KEY ("bod","prodean")
);

-- CreateTable
CREATE TABLE "t_relacion_codbarras" (
    "idinternoean" VARCHAR(30) NOT NULL,
    "codbarrasasignado" VARCHAR(50) NOT NULL,
    "cantidad" DOUBLE PRECISION,
    "qtynew" DECIMAL(14,2),
    "fechacrea" TIMESTAMP(3),
    "pesobruto" DECIMAL(14,5),
    "qtytara" DECIMAL(14,5),
    "cantidad_tara" DECIMAL(16,4),

    CONSTRAINT "t_relacion_codbarras_pkey" PRIMARY KEY ("codbarrasasignado")
);

-- CreateTable
CREATE TABLE "t_resumenstatuscalidad" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3),
    "cajainicial" INTEGER,
    "cajafinal" INTEGER,
    "estado" VARCHAR(20),
    "aprueba" INTEGER,

    CONSTRAINT "t_resumenstatuscalidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_empleados_zonas" (
    "empleado" INTEGER NOT NULL,
    "zona" CHAR(20) NOT NULL,
    "turno" CHAR(20) NOT NULL,
    "estado" BOOLEAN NOT NULL,

    CONSTRAINT "t_empleados_zonas_pkey" PRIMARY KEY ("empleado","zona")
);

-- CreateTable
CREATE TABLE "t_ins_bodega" (
    "bodega" VARCHAR(15) NOT NULL,
    "descripcion" VARCHAR(50),
    "ubicacionf_c" VARCHAR(50),
    "tipu" INTEGER,
    "prcierre" BOOLEAN NOT NULL DEFAULT false,
    "codcc" VARCHAR(6) DEFAULT 'ND',
    "regional" VARCHAR(2) DEFAULT 'ND',
    "imgmapa" BYTEA,

    CONSTRAINT "t_ins_bodega_pkey" PRIMARY KEY ("bodega")
);

-- CreateTable
CREATE TABLE "t_ins_mapas_wms" (
    "mapaid" SERIAL NOT NULL,
    "imagen" VARCHAR(100),
    "bodega" VARCHAR(15),
    "isprincipal" BOOLEAN,
    "imgmapa" BYTEA,

    CONSTRAINT "t_ins_mapas_wms_pkey" PRIMARY KEY ("mapaid")
);

-- CreateTable
CREATE TABLE "t_ins_ubicaciones_fijas_mp" (
    "idubicacion" SERIAL NOT NULL,
    "bodega" VARCHAR(10),
    "eanmaterial" VARCHAR(50),
    "codubicacion1" VARCHAR(50),
    "codubicacion2" VARCHAR(50),
    "codubicacion3" VARCHAR(50),
    "codubicacion4" VARCHAR(50),
    "codubicacion5" VARCHAR(50),

    CONSTRAINT "t_ins_ubicaciones_fijas_mp_pkey" PRIMARY KEY ("idubicacion")
);

-- CreateTable
CREATE TABLE "t_ins_zona_empleado" (
    "empleado" INTEGER NOT NULL,
    "zona" VARCHAR(15) NOT NULL,
    "turno" CHAR(20) NOT NULL,
    "estado" BOOLEAN NOT NULL,
    "id_empleado" INTEGER,

    CONSTRAINT "t_ins_zona_empleado_pkey" PRIMARY KEY ("empleado","zona")
);

-- CreateTable
CREATE TABLE "t_ajustedereserva" (
    "id" SERIAL NOT NULL,
    "autoriza" CHAR(80),
    "fecha" TIMESTAMP(3),
    "bodega" CHAR(10),
    "ean" CHAR(50),
    "reservaanterior" DECIMAL(14,2),
    "nuevareserva" DECIMAL(14,2),
    "picking" INTEGER,

    CONSTRAINT "t_ajustedereserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_detalle_orden_compra" (
    "nordencompra" INTEGER,
    "requerido" DOUBLE PRECISION,
    "material" DOUBLE PRECISION,
    "color" VARCHAR(10),
    "eanproveedores" VARCHAR(50),
    "numroorden" INTEGER,
    "precioentra" DOUBLE PRECISION,
    "iddetordcomppra" SERIAL NOT NULL,
    "recibidok" DOUBLE PRECISION DEFAULT 0,
    "solicitacotiza" INTEGER DEFAULT 0,
    "fechainvita" TIMESTAMP(3),
    "descrive" VARCHAR(150),
    "fechcompentrega" TIMESTAMP(3),
    "provasignado" VARCHAR(15),
    "plazogana" INTEGER,
    "consecutivoocasignado" DOUBLE PRECISION DEFAULT 0,
    "cumplido" INTEGER DEFAULT 0,
    "cantpendientexrecib" DOUBLE PRECISION,
    "valormoneda" DOUBLE PRECISION,
    "codigoarticulo" VARCHAR(20),
    "precioderecibo" DOUBLE PRECISION,
    "fechaprometidad" TIMESTAMP(3),
    "iva" DECIMAL(18,0),
    "numerotrabajador" INTEGER,
    "descripciondetalle" VARCHAR(500),
    "codigodearancel" SMALLINT,
    "bodega" VARCHAR(10),
    "codigopais" VARCHAR(10),
    "porcdescuentocomercial" DOUBLE PRECISION,

    CONSTRAINT "t_detalle_orden_compra_pkey" PRIMARY KEY ("iddetordcomppra")
);

-- CreateTable
CREATE TABLE "t_encabezadopedido" (
    "npedido" INTEGER NOT NULL,
    "cliente" VARCHAR(15),
    "fechapedido" TIMESTAMP(3),
    "fechavence" TIMESTAMP(3),
    "c_fact_ccord" INTEGER,
    "c_fact_scord" INTEGER,
    "fechafactura" TIMESTAMP(3),
    "clientefactura" VARCHAR(50),
    "recursommto" INTEGER,
    "autoorden" SERIAL NOT NULL,
    "bodterc" VARCHAR(15),
    "tipopaquete" CHAR(25),
    "estado" SMALLINT DEFAULT 0,

    CONSTRAINT "t_encabezadopedido_pkey" PRIMARY KEY ("npedido")
);

-- CreateTable
CREATE TABLE "t_ins_coordenadas" (
    "ubicacion" VARCHAR(20) NOT NULL,
    "fila_piso" VARCHAR(10) NOT NULL,
    "columna_piso" VARCHAR(10) NOT NULL,
    "piso" VARCHAR(10) NOT NULL,
    "posicion_x" VARCHAR(10) NOT NULL,
    "posicion_z" VARCHAR(10) NOT NULL,
    "seleccion" BOOLEAN DEFAULT false,
    "bodegac" VARCHAR(15) NOT NULL,
    "capcubica" DOUBLE PRECISION,
    "cappeso" DOUBLE PRECISION,
    "ocupacion" INTEGER DEFAULT 0,
    "distanciaptoref" DOUBLE PRECISION DEFAULT 0,
    "prioridadrotacion" CHAR(10) NOT NULL,
    "posicion_z_num" INTEGER DEFAULT 0,
    "orden" INTEGER DEFAULT 0,
    "zonapiso" VARCHAR(15) NOT NULL,
    "nro" INTEGER,
    "slt" INTEGER,
    "new_coor" INTEGER,
    "posicion_x_num" VARCHAR(5),
    "posicion_col_num" VARCHAR(5) DEFAULT '0',
    "cara" DECIMAL(14,2),
    "centro" VARCHAR(20),
    "tunel" INTEGER,
    "tipo_producto" VARCHAR(50),

    CONSTRAINT "t_ins_coordenadas_pkey" PRIMARY KEY ("ubicacion")
);

-- CreateTable
CREATE TABLE "t_ins_coordenadas_pods" (
    "cajap_pods" DOUBLE PRECISION NOT NULL,
    "ubicacion" VARCHAR(20) NOT NULL,
    "vol_ubic" VARCHAR(10),
    "tipo_ubic" VARCHAR(20),
    "ocupacion" INTEGER,

    CONSTRAINT "t_ins_coordenadas_pods_pkey" PRIMARY KEY ("ubicacion")
);

-- CreateTable
CREATE TABLE "t_ins_permisosxusuario_tipodeorden" (
    "id" SERIAL NOT NULL,
    "programa" VARCHAR(80),
    "tipoo" VARCHAR(80),
    "usuario" INTEGER,
    "actualizar" BOOLEAN,
    "eliminar" BOOLEAN,
    "consultar" BOOLEAN,
    "adicionar" BOOLEAN,

    CONSTRAINT "t_ins_permisosxusuario_tipodeorden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_ins_procesos" (
    "cod_proces" INTEGER NOT NULL,
    "referencia" VARCHAR(5) NOT NULL,
    "seccion" INTEGER,
    "proceso" VARCHAR(100),
    "maquina" VARCHAR(50),
    "standar" DOUBLE PRECISION,
    "vl_proceso" DOUBLE PRECISION,
    "porcinvent" DOUBLE PRECISION,
    "secuencia" INTEGER,
    "ppp" DOUBLE PRECISION,
    "udsmedida" VARCHAR(5),
    "presentacion" VARCHAR(2),
    "producto" VARCHAR(50),
    "pre_producto" VARCHAR(50),
    "senal" INTEGER,
    "sw" INTEGER,
    "cant_opera" DOUBLE PRECISION,
    "observaciones" VARCHAR(1000),

    CONSTRAINT "t_ins_procesos_pkey" PRIMARY KEY ("cod_proces","referencia")
);

-- CreateTable
CREATE TABLE "t_ins_tiposdeorden" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "descripcion" VARCHAR(50),
    "contiene_materiales" BOOLEAN,
    "contiene_parametros" BOOLEAN,
    "contabiliza_al_cierre" BOOLEAN,
    "req_reserva" BOOLEAN,
    "controla_procs" BOOLEAN,
    "bodega_entrada_productos_fabricados" VARCHAR(10),
    "cod_hecho_economico" VARCHAR(20),
    "cod_comprob_contable" VARCHAR(20),
    "contiene_documentos" BOOLEAN,
    "isfacturable" BOOLEAN,
    "valoriza_costo" BOOLEAN,
    "valoriza_precio" BOOLEAN,
    "valoriza_costo_promedio" BOOLEAN,
    "valoriza_costo_ultima_compra" BOOLEAN,

    CONSTRAINT "t_ins_tiposdeorden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_materiales_por_orden" (
    "orden" INTEGER,
    "material" VARCHAR(50),
    "color" VARCHAR(20) DEFAULT 'ND',
    "procesoconsume" VARCHAR(50),
    "cantidadgastada" DOUBLE PRECISION DEFAULT 0,
    "cantidadentregada" DOUBLE PRECISION DEFAULT 0,
    "abonon" DOUBLE PRECISION DEFAULT 0,
    "entregado" INTEGER DEFAULT 0,
    "largotrazon" DOUBLE PRECISION,
    "numcapasn" INTEGER,
    "anchotrazon" DOUBLE PRECISION,
    "fecha_corten" TIMESTAMP(3),
    "cantiproducidan" INTEGER DEFAULT 0,
    "observacionesn" VARCHAR(500),
    "standbcon" DOUBLE PRECISION DEFAULT 0,
    "asentarn" BOOLEAN DEFAULT false,
    "fechainicia" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "fechallega" TIMESTAMP(3),
    "asentarcomp1" BOOLEAN DEFAULT false,
    "asentarcomp2" BOOLEAN DEFAULT false,
    "proveedor" VARCHAR(50),
    "loterecibido" INTEGER DEFAULT 0,
    "thypo" VARCHAR(50),
    "clase_consumo" VARCHAR(50),
    "secuencia" SMALLINT,
    "num" VARCHAR(10),
    "loteempresa" VARCHAR(50) DEFAULT '',
    "paquetes" INTEGER DEFAULT 0,
    "idenformula" VARCHAR(50),
    "consumocalculado" DOUBLE PRECISION DEFAULT 0,
    "ordendis" INTEGER DEFAULT 0,
    "eaninsumo" VARCHAR(50),
    "iditem" SERIAL NOT NULL,
    "porcitem" DOUBLE PRECISION DEFAULT 0,
    "porcacumulado" DOUBLE PRECISION DEFAULT 0,
    "cedempleado" VARCHAR(50),
    "costounitariosale" DOUBLE PRECISION DEFAULT 0,
    "qtyreserva" DOUBLE PRECISION DEFAULT 0,
    "bodegareserva" VARCHAR(20) DEFAULT '',
    "descripcion" VARCHAR(150) DEFAULT '',
    "escompuesto" VARCHAR(1) DEFAULT '-',
    "pvsale" DOUBLE PRECISION,

    CONSTRAINT "t_materiales_por_orden_pkey" PRIMARY KEY ("iditem")
);

-- CreateTable
CREATE TABLE "t_narth_encabezado_pedido" (
    "autonped" INTEGER NOT NULL,
    "fechapedido" TIMESTAMP(3),
    "npedido" VARCHAR(50) NOT NULL,
    "cliente" VARCHAR(15),
    "fechavence" TIMESTAMP(3),
    "c_fact_ccord" INTEGER DEFAULT 0,
    "c_fact_scord" INTEGER DEFAULT 0,
    "fechafactura" TIMESTAMP(3),
    "clientefactura" VARCHAR(50),
    "aprobacion_cartera" INTEGER DEFAULT 0,
    "aprobacion_pdn" INTEGER DEFAULT 0,
    "busca_aprobacion" INTEGER DEFAULT 0,
    "prioridad" INTEGER,
    "nitvble" INTEGER,
    "ocompra" VARCHAR(50),
    "fechacita" TIMESTAMP(3),
    "horacita" TIMESTAMP(3),
    "listap" INTEGER,
    "requisitos" VARCHAR(500),
    "anulado" INTEGER DEFAULT 0,
    "despachado" INTEGER,
    "fechanueva" TIMESTAMP(3),
    "pedido_muerto" INTEGER DEFAULT 0,
    "iddespacho" INTEGER DEFAULT 0,
    "notificadosrecibido" VARCHAR(150),
    "notificadosdespacho" VARCHAR(150),
    "idpicking" DOUBLE PRECISION DEFAULT 0,
    "aprueba_picking" INTEGER DEFAULT 0,
    "descuentoaplicadoped" DOUBLE PRECISION DEFAULT 0,
    "fecha_cartera" TIMESTAMP(3),
    "comenta_cartera" VARCHAR(500),
    "prefijoped" VARCHAR(10) DEFAULT '',
    "registradopor" VARCHAR(50) DEFAULT '',
    "tazacambio" INTEGER DEFAULT 1,
    "margen" DOUBLE PRECISION DEFAULT 0,
    "vlpedidopesos" DECIMAL(19,4) DEFAULT 0,
    "ivapedidopesos" DECIMAL(19,4) DEFAULT 0,
    "refererido" VARCHAR(50) DEFAULT '',
    "tipodecomprobante" VARCHAR(10),
    "tarifadeimpuesto" VARCHAR(10),
    "direcciondeenvio" VARCHAR(350),
    "personasolicitapedido" VARCHAR(100),
    "tipoventa" VARCHAR(2),
    "panoramacontable" VARCHAR(10),
    "personaapruebapedido" VARCHAR(50),
    "formadepago" CHAR(2),
    "codcomprobantecontable" VARCHAR(10),
    "codsegmento" VARCHAR(20),
    "clavepresupuesto" VARCHAR(50),

    CONSTRAINT "t_narth_encabezado_pedido_pkey" PRIMARY KEY ("npedido")
);

-- CreateTable
CREATE TABLE "t_narth_serie_pedido" (
    "numpedido" VARCHAR(50),
    "ordenpdn" INTEGER DEFAULT 0,
    "ref" VARCHAR(50),
    "pares" DOUBLE PRECISION DEFAULT 0,
    "precio_unitario" DOUBLE PRECISION DEFAULT 0,
    "estado" INTEGER DEFAULT 0,
    "color" VARCHAR(50),
    "f_ing_orden" TIMESTAMP(3),
    "fact_orden" BOOLEAN DEFAULT false,
    "identcolor" VARCHAR(50),
    "udsentreg" DOUBLE PRECISION DEFAULT 0,
    "contador" SERIAL NOT NULL,
    "udscortadasn" INTEGER DEFAULT 0,
    "observaciones" VARCHAR(800),
    "tiquet" BOOLEAN DEFAULT false,
    "campo1" VARCHAR(50),
    "plucadena" VARCHAR(20),
    "bonifica" DECIMAL(14,2) DEFAULT 0,
    "reserva" DOUBLE PRECISION DEFAULT 0,
    "conffacturado" INTEGER DEFAULT 0,
    "bodega" VARCHAR(15),
    "pendiente" INTEGER DEFAULT 0,
    "numocauto" DOUBLE PRECISION DEFAULT 0,
    "idplantilla" DOUBLE PRECISION DEFAULT 0,
    "visible" SMALLINT DEFAULT 1,
    "margenaplicado" DOUBLE PRECISION DEFAULT 0,
    "margensegundario" DOUBLE PRECISION DEFAULT 0,
    "tarifadeimpuesto" VARCHAR(10),
    "fechafinalentrega" TIMESTAMP(3),
    "panoramacontable" VARCHAR(10) DEFAULT '',

    CONSTRAINT "t_narth_serie_pedido_pkey" PRIMARY KEY ("contador")
);

-- CreateTable
CREATE TABLE "t_orden_compra" (
    "plan_proyecto" VARCHAR(10),
    "linea" VARCHAR(10),
    "actividad" VARCHAR(12),
    "numordencompra" INTEGER NOT NULL,
    "verificaorden" INTEGER DEFAULT 0,
    "fechacompra" TIMESTAMP(3),
    "fecharecibe" TIMESTAMP(3),
    "proveedor" VARCHAR(15),
    "observacionescompra" VARCHAR(500),
    "apruebaorden" INTEGER DEFAULT 0,
    "observacionesrecibo" VARCHAR(500),
    "autofechasolicita" TIMESTAMP(3),
    "autofechaaprueba" TIMESTAMP(3),
    "tipooc" VARCHAR(50),
    "estadot" VARCHAR(1),
    "planearecibo" INTEGER DEFAULT 0,
    "consecutivoauto" SERIAL NOT NULL,
    "lentrega" VARCHAR(100),
    "elabora" VARCHAR(50),
    "aprueba" VARCHAR(50),
    "qsolicita" VARCHAR(50),
    "anulado" INTEGER,
    "plazopactadodias" INTEGER DEFAULT 0,
    "observacionesaprueba" VARCHAR(300),
    "prefijo" VARCHAR(50),
    "consecprefijo" DOUBLE PRECISION,
    "estado" VARCHAR(20),
    "codfob" VARCHAR(20),
    "codenvio" VARCHAR(20),
    "codmoneda" VARCHAR(10),
    "noformatooc" INTEGER,
    "tiposolicitud" VARCHAR(10),
    "req_aprobacion_de" VARCHAR(50),
    "comprobante_contable" VARCHAR(20),

    CONSTRAINT "t_orden_compra_pkey" PRIMARY KEY ("numordencompra")
);

-- CreateTable
CREATE TABLE "t_pic" (
    "cod_producto" VARCHAR(50) NOT NULL,
    "bodepicking" VARCHAR(15) NOT NULL,
    "cajap" DOUBLE PRECISION NOT NULL,
    "inv_minimo" DOUBLE PRECISION DEFAULT 0,
    "entradas" DECIMAL(16,4) DEFAULT 0,
    "salidas" DECIMAL(16,4) DEFAULT 0,
    "lote" VARCHAR(20) NOT NULL DEFAULT '',
    "ubicacion" VARCHAR(50) DEFAULT '',
    "asignado" INTEGER DEFAULT 0,
    "ordenestiba" INTEGER DEFAULT 0,
    "reserva" DECIMAL(14,2) DEFAULT 0,
    "nro" INTEGER,
    "idempleado" INTEGER,
    "transaccion" VARCHAR(50),
    "documentooc" VARCHAR(50),

    CONSTRAINT "t_pic_pkey" PRIMARY KEY ("cod_producto","bodepicking","cajap")
);

-- CreateTable
CREATE TABLE "t_pic_ajuste" (
    "caja" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3),
    "saldoinicial" DECIMAL(16,4),
    "qtyentrada" DECIMAL(16,4),
    "qtysale" DECIMAL(16,4),
    "id" SERIAL NOT NULL,
    "idempleado" INTEGER,
    "motivoajuste" VARCHAR(500),
    "loteproveedor" VARCHAR(20),
    "numdocumento" VARCHAR(50),
    "ubicacion_sale" VARCHAR(20),

    CONSTRAINT "t_pic_ajuste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_pic_multiproducto" (
    "id" SERIAL NOT NULL,
    "cajap" DOUBLE PRECISION NOT NULL,
    "productoean" VARCHAR(50) NOT NULL,
    "referencia" VARCHAR(50),
    "entradas" DECIMAL(16,4),
    "salidas" DECIMAL(16,4),
    "loteproveedor" VARCHAR(40),
    "fechaultimomvto" TIMESTAMP(3),
    "idempleado" INTEGER,
    "ean" VARCHAR(50),
    "transaccion" VARCHAR(50),
    "documentooc" VARCHAR(50),
    "id_recibociego" INTEGER,

    CONSTRAINT "t_pic_multiproducto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_pic_pods" (
    "id" SERIAL NOT NULL,
    "cajap_pods" DOUBLE PRECISION NOT NULL,
    "productoean" VARCHAR(50) NOT NULL,
    "referencia" VARCHAR(50) NOT NULL,
    "entradas" DECIMAL(14,2),
    "salidas" DECIMAL(14,2),
    "loteproveedor" VARCHAR(40),
    "fechaultimomvto" TIMESTAMP(3),
    "idempleado" INTEGER,
    "transaccion" VARCHAR(20),
    "ean" VARCHAR(50) NOT NULL,
    "documentooc" VARCHAR(50),
    "ubicacion" VARCHAR(20) NOT NULL,

    CONSTRAINT "t_pic_pods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_pic_ubicacionesfijasxean" (
    "id" SERIAL NOT NULL,
    "productoean" VARCHAR(50) NOT NULL,
    "ubicacion" VARCHAR(20) NOT NULL,
    "entradas" DECIMAL(18,5),
    "salidas" DECIMAL(18,5),
    "reservas" DECIMAL(18,5),
    "contenedor" VARCHAR(20),
    "ubicacion_old" VARCHAR(20),

    CONSTRAINT "t_pic_ubicacionesfijasxean_pkey" PRIMARY KEY ("productoean","ubicacion")
);

-- CreateTable
CREATE TABLE "t_procesos_oredenes" (
    "orden" INTEGER,
    "cod_proces" INTEGER,
    "referencia" VARCHAR(5),
    "talla" VARCHAR(50),
    "pakete" INTEGER,
    "confirmacion" INTEGER DEFAULT 0,
    "numpedido" DECIMAL(18,0),
    "maquina" VARCHAR(50),
    "standar" DOUBLE PRECISION,
    "vl_proceso" DOUBLE PRECISION,
    "f_ingreso" TIMESTAMP(3),
    "f_procesa" TIMESTAMP(3),
    "pares_orden" INTEGER,
    "uds_reproces" INTEGER,
    "empleado_grupo" INTEGER,
    "cantidad_talla" INTEGER,
    "confirma2" BOOLEAN DEFAULT false,
    "confirma3" BOOLEAN DEFAULT false,
    "confirma4" BOOLEAN DEFAULT false,
    "ppp" VARCHAR(100),
    "secuencia" INTEGER,
    "controltiquete" SERIAL NOT NULL,
    "cosectiquet" INTEGER,
    "hip" TIMESTAMP(3),
    "npers" INTEGER,
    "codpers" VARCHAR(50),
    "tporeal" DOUBLE PRECISION,
    "htp" TIMESTAMP(3),
    "udliqtalla" INTEGER,
    "confprglog" BOOLEAN DEFAULT false,
    "nummaqfco" INTEGER,
    "seccion" CHAR(10),
    "observ" VARCHAR(200),

    CONSTRAINT "t_procesos_oredenes_pkey" PRIMARY KEY ("controltiquete")
);

-- CreateTable
CREATE TABLE "t_programacion_produccion" (
    "id" SERIAL NOT NULL,
    "ean" VARCHAR(60),
    "maquina" VARCHAR(60),
    "yyyy" INTEGER,
    "mm" INTEGER,
    "dd" INTEGER,
    "inicio_hh" INTEGER,
    "inicio_mm" INTEGER,
    "inicio_ss" INTEGER,
    "final_hh" INTEGER,
    "final_mm" INTEGER,
    "final_ss" INTEGER,
    "fecha_registro" TIMESTAMP(3),

    CONSTRAINT "t_programacion_produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_serie_pedido_nueva" (
    "nofatura" INTEGER,
    "refean" VARCHAR(50),
    "nopedido" VARCHAR(50),
    "listapre" INTEGER,
    "unidades" DOUBLE PRECISION,
    "confirma" INTEGER DEFAULT 0,
    "bodegas" VARCHAR(15),
    "dezcuento" DOUBLE PRECISION DEFAULT 0,
    "preciopasa" DOUBLE PRECISION,
    "pickinorigen" INTEGER,
    "lotte" VARCHAR(20),
    "bonifi" DECIMAL(18,2),
    "idseriepedidonueva" SERIAL NOT NULL,
    "costomciaventa" DOUBLE PRECISION,
    "docaplica" VARCHAR(50),
    "costopromedio" DOUBLE PRECISION DEFAULT 0,
    "descripcion" VARCHAR(200),
    "tarifadeimpuesto" VARCHAR(10),

    CONSTRAINT "t_serie_pedido_nueva_pkey" PRIMARY KEY ("idseriepedidonueva")
);

-- CreateTable
CREATE TABLE "t_seriepedido" (
    "numpedido" INTEGER,
    "ordenpdn" INTEGER NOT NULL,
    "ref" VARCHAR(5),
    "pares" DOUBLE PRECISION,
    "precio_unitario" INTEGER,
    "estado" INTEGER DEFAULT 0,
    "color" VARCHAR(20),
    "f_ing_orden" TIMESTAMP(3),
    "fact_orden" BOOLEAN DEFAULT false,
    "identcolor" VARCHAR(20),
    "udsentreg" DOUBLE PRECISION,
    "udscortadasn" INTEGER,
    "observaciones" VARCHAR(500),
    "tiquet" BOOLEAN DEFAULT false,
    "lotebatch" VARCHAR(100),
    "fechaprepara" TIMESTAMP(3),
    "cif" DOUBLE PRECISION,
    "tcosto" DOUBLE PRECISION,
    "fecha_ven" TIMESTAMP(3),
    "tipoo" VARCHAR(50) DEFAULT '',
    "cantterminada" INTEGER,
    "opasociada" INTEGER,
    "ok" INTEGER,
    "consecutivoprefijo" INTEGER DEFAULT 0,
    "plantiasociada" DOUBLE PRECISION DEFAULT 0,
    "nitdetalle" VARCHAR(18) DEFAULT '',
    "npedidocliente" VARCHAR(50),
    "estadoreservamp" INTEGER DEFAULT 0,
    "refsecundaria" VARCHAR(50) DEFAULT '',
    "idsolicitud" INTEGER DEFAULT 0,
    "conclusioncierre" VARCHAR(500) DEFAULT '',
    "asignadopara" VARCHAR(50) DEFAULT '',
    "ordendeinicio" INTEGER DEFAULT 0,
    "ubicacionfisica" VARCHAR(50) DEFAULT 'ND',
    "codigopresupuesto" VARCHAR(50) DEFAULT '',
    "pickingasignado" INTEGER DEFAULT 0,
    "valoraprobadoorden" DOUBLE PRECISION,

    CONSTRAINT "t_seriepedido_pkey" PRIMARY KEY ("ordenpdn")
);

-- CreateTable
CREATE TABLE "tgg_t_pic" (
    "cajap" INTEGER,
    "referencia" VARCHAR(50),
    "entradas" DECIMAL(16,4),
    "salidas" DECIMAL(16,4),
    "idempleado" INTEGER,
    "fecha" TIMESTAMP(3),
    "ubicacion_sale" VARCHAR(50),
    "ean" VARCHAR(50),
    "transaccion" VARCHAR(100),
    "id" SERIAL NOT NULL,
    "saldo" DECIMAL(16,4),
    "loteproveedor" VARCHAR(50),
    "documentooc" VARCHAR(50),

    CONSTRAINT "tgg_t_pic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_boxplan" (
    "id" SERIAL NOT NULL,
    "picking" INTEGER,
    "tipocaja" VARCHAR(2),
    "cantidad" INTEGER,
    "volabsorbido" INTEGER,
    "transportador" VARCHAR(100),
    "vlxkilo" DECIMAL(14,2),

    CONSTRAINT "t_boxplan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_caja_contenedora" (
    "id" SERIAL NOT NULL,
    "empleado" VARCHAR(50),
    "fecha" TIMESTAMP(3),
    "bodega" VARCHAR(10),

    CONSTRAINT "t_caja_contenedora_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_detalle_prepack" (
    "iddetpripack" SERIAL NOT NULL,
    "numpicking" INTEGER,
    "conscaja" VARCHAR(50),
    "product" VARCHAR(50),
    "cant" DECIMAL(16,4) DEFAULT 0,
    "fecha" TIMESTAMP(3),
    "lothe" VARCHAR(50),
    "origen" VARCHAR(150),
    "precioventa" DOUBLE PRECISION DEFAULT 1,
    "bonificacion" DOUBLE PRECISION DEFAULT 0,
    "diponepick" DECIMAL(16,4) DEFAULT 0,
    "saldoaduana" DECIMAL(16,4) DEFAULT 0,
    "bode" VARCHAR(20),
    "cmv" DOUBLE PRECISION DEFAULT 0,
    "pedido" VARCHAR(50),
    "listapre" INTEGER,
    "descuento" DOUBLE PRECISION,
    "estadolinea" INTEGER DEFAULT 0,
    "cospromedio" DOUBLE PRECISION DEFAULT 0,
    "alerta" VARCHAR(50),
    "descripcion" VARCHAR(250),
    "ref" VARCHAR(50),
    "transaccion" VARCHAR(50),
    "zonapiso" VARCHAR(20),
    "ubicacion_asig" VARCHAR(20),
    "cargue" VARCHAR(50),
    "barcode" VARCHAR(50),
    "bl" VARCHAR(50),

    CONSTRAINT "t_detalle_prepack_pkey" PRIMARY KEY ("iddetpripack")
);

-- CreateTable
CREATE TABLE "t_detalle_prepack_xlineapedido" (
    "iddetpripack" SERIAL NOT NULL,
    "numpicking" INTEGER,
    "conscaja" INTEGER,
    "product" VARCHAR(50),
    "cant" DECIMAL(16,4) DEFAULT 0,
    "fecha" TIMESTAMP(3),
    "lothe" VARCHAR(20),
    "origen" VARCHAR(150),
    "precioventa" DOUBLE PRECISION DEFAULT 1,
    "bonificacion" DOUBLE PRECISION DEFAULT 0,
    "diponepick" DECIMAL(16,4) DEFAULT 0,
    "saldoaduana" DECIMAL(16,4) DEFAULT 0,
    "bode" VARCHAR(20),
    "cmv" DOUBLE PRECISION DEFAULT 0,
    "pedido" VARCHAR(50),
    "listapre" INTEGER,
    "descuento" DOUBLE PRECISION,
    "estadolinea" INTEGER DEFAULT 0,
    "cospromedio" DOUBLE PRECISION DEFAULT 0,
    "alerta" VARCHAR(50),
    "descripcion" VARCHAR(150),
    "ref" VARCHAR(50),
    "idempleadoaduana" INTEGER,
    "fechaaduana" TIMESTAMP(3),
    "bl" VARCHAR(50),
    "barcode" VARCHAR(50),

    CONSTRAINT "t_detalle_prepack_xlineapedido_pkey" PRIMARY KEY ("iddetpripack")
);

-- CreateTable
CREATE TABLE "t_encabezado_prepack" (
    "idmovimiento" INTEGER NOT NULL,
    "picking" INTEGER,
    "fecha" TIMESTAMP(3),
    "turno" INTEGER,
    "seccion" INTEGER,
    "modulo" INTEGER,
    "empacador" INTEGER,
    "valida" INTEGER DEFAULT 0,
    "facturado" INTEGER DEFAULT 0,
    "nitprepack" VARCHAR(50),
    "consmov" INTEGER,
    "npedid" VARCHAR(50),
    "nom_empacador" VARCHAR(50),
    "pedido" VARCHAR(50),
    "ok" INTEGER DEFAULT 0,
    "bodegapicking" VARCHAR(15) NOT NULL,
    "impreso" INTEGER DEFAULT 0,
    "observpepack" VARCHAR(250),
    "transportador" VARCHAR(50),
    "aduanadopor" VARCHAR(50),

    CONSTRAINT "t_encabezado_prepack_pkey" PRIMARY KEY ("idmovimiento")
);

-- CreateTable
CREATE TABLE "t_encabezado_prepack_cargue" (
    "id" SERIAL NOT NULL,
    "bigpicking" VARCHAR(20) NOT NULL,
    "picking" INTEGER NOT NULL,
    "cargue" VARCHAR(20) NOT NULL,
    "unitarizador" VARCHAR(20) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "idempleado" INTEGER NOT NULL,
    "zonapiso" VARCHAR(10) NOT NULL,

    CONSTRAINT "t_encabezado_prepack_cargue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_encabezado_prepack_ext" (
    "id" SERIAL NOT NULL,
    "picking" INTEGER NOT NULL,
    "f_pedido" TIMESTAMP(3),
    "tipodcto" VARCHAR(30),
    "tipopedido" VARCHAR(50),
    "pedidoerp" VARCHAR(50),
    "codcliente" VARCHAR(50),
    "nombrecliente" VARCHAR(250),
    "contacto" VARCHAR(100),
    "email" VARCHAR(200),
    "notas" VARCHAR(1000),
    "ciudad_despacho" VARCHAR(150),
    "pais_despacho" VARCHAR(150),
    "departamento_despacho" VARCHAR(150),
    "sucursal_despacho" VARCHAR(150),
    "direccion_despacho" VARCHAR(500),
    "idsucursal" VARCHAR(50),
    "ciudad" VARCHAR(150),
    "pedidorelacionado" VARCHAR(50),
    "cargue" VARCHAR(50),

    CONSTRAINT "t_encabezado_prepack_ext_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_ins_valoresfijosxempaque" (
    "id" SERIAL NOT NULL,
    "tipodecaja" VARCHAR(50) NOT NULL,
    "componentecosto" DECIMAL(18,2),
    "costo" DECIMAL(18,2),
    "transportadora" VARCHAR(50),

    CONSTRAINT "t_ins_valoresfijosxempaque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_ins_volumenesxean" (
    "gtin" VARCHAR(50) NOT NULL,
    "imagen" BYTEA,
    "figurageometrica" VARCHAR(70),
    "radio" DECIMAL(18,5),
    "altura" DECIMAL(18,5),
    "areabase" DECIMAL(18,5),
    "longitudarista" DECIMAL(18,5),
    "volumen" DECIMAL(18,5),
    "areatotal" DECIMAL(18,5),
    "ancho" DECIMAL(18,5),
    "largo" DECIMAL(18,5),
    "porcentajedesperdicio" DECIMAL(18,5),

    CONSTRAINT "t_ins_volumenesxean_pkey" PRIMARY KEY ("gtin")
);

-- CreateTable
CREATE TABLE "t_pallets" (
    "cajapallet" DOUBLE PRECISION NOT NULL,
    "cajaasociada" VARCHAR(20),
    "idpallet" SERIAL NOT NULL,
    "estado" INTEGER,
    "fechacrea" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "cantidad" DECIMAL(18,5),
    "canitidad" DECIMAL(14,3),
    "documentoasociado" VARCHAR(30),
    "idempleado" INTEGER,

    CONSTRAINT "t_pallets_pkey" PRIMARY KEY ("idpallet")
);

-- CreateTable
CREATE TABLE "t_ssccxcaja" (
    "idprepack" INTEGER,
    "eancontenido" VARCHAR(50),
    "eancaja" VARCHAR(20),
    "numcajade" INTEGER,
    "cantidad" DECIMAL(16,4),
    "id" INTEGER,
    "iditemsscc" SERIAL NOT NULL,
    "lote" VARCHAR(50) DEFAULT '',
    "idcaja" INTEGER,
    "sscc" INTEGER DEFAULT 0,
    "tipocaja" CHAR(1),
    "cantidadaduanada" DECIMAL(16,4),
    "fecharegistro" TIMESTAMP(3),
    "marca" VARCHAR(50),
    "pesocaja" VARCHAR(20),
    "cantidaddestelle" DECIMAL(18,3),
    "ubicacion" VARCHAR(20),
    "ubicacion_sale" VARCHAR(20),
    "listapre" INTEGER,
    "estado" INTEGER,

    CONSTRAINT "t_ssccxcaja_pkey" PRIMARY KEY ("iditemsscc")
);

-- CreateTable
CREATE TABLE "tbltextoimprimezpl" (
    "textoimprime" TEXT,
    "campo1" VARCHAR(50),
    "campo2" VARCHAR(50),
    "campo3" VARCHAR(50),
    "idempleado" INTEGER,
    "codigo_dinamica" VARCHAR(50),
    "estadoimprime" INTEGER,
    "id" SERIAL NOT NULL,
    "estado" INTEGER,
    "fecha" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tbltextoimprimezpl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tgg_t_reg_movimientosdecaja" (
    "id" SERIAL NOT NULL,
    "caja" DOUBLE PRECISION NOT NULL,
    "ubicacion" VARCHAR(20),
    "fecha" TIMESTAMP(3) NOT NULL,
    "idempleado" INTEGER NOT NULL,
    "transaccion" VARCHAR(20),
    "ubicacion_inicial" VARCHAR(20),
    "saldo" DECIMAL(16,4),
    "productoean" VARCHAR(50),
    "loteproveedor" VARCHAR(30),
    "bodega_inicial" VARCHAR(30),
    "bodega_final" VARCHAR(30),
    "pallet" INTEGER,
    "documentooc" VARCHAR(50),
    "tipodocto" VARCHAR(30),

    CONSTRAINT "tgg_t_reg_movimientosdecaja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tiposdecaja" (
    "tipo_caja" VARCHAR(50) NOT NULL,
    "peso" DOUBLE PRECISION,
    "alto" DOUBLE PRECISION,
    "ancho" DOUBLE PRECISION,
    "largo" DOUBLE PRECISION,
    "volumen" DOUBLE PRECISION,
    "descripcioncaja" VARCHAR(100),
    "factor" INTEGER,

    CONSTRAINT "tiposdecaja_pkey" PRIMARY KEY ("tipo_caja")
);

-- CreateTable
CREATE TABLE "t_vbles_logisticasxcaja" (
    "id" SERIAL NOT NULL,
    "cajano" VARCHAR(20) NOT NULL,
    "vbl1" VARCHAR(100),
    "vbl2" VARCHAR(100),
    "vbl3" VARCHAR(100),
    "vbl4" VARCHAR(100),
    "vbl5" VARCHAR(100),
    "codean" VARCHAR(50) NOT NULL,

    CONSTRAINT "t_vbles_logisticasxcaja_pkey" PRIMARY KEY ("cajano","codean")
);

-- CreateTable
CREATE TABLE "t_aduana_envio_liquidado" (
    "id" SERIAL NOT NULL,
    "picking" INTEGER NOT NULL,
    "tipocaja" VARCHAR(2),
    "pesototalenviado" DECIMAL(18,3),
    "pesoenreexpedicion" DECIMAL(14,3),
    "valorxkg" DECIMAL(18,3),
    "fletesxpesoenviado" DECIMAL(18,3),
    "mciaenviadaacosto" DECIMAL(18,3),
    "acuerdo" DECIMAL(18,3),
    "totalxtransportadora" DECIMAL(18,3),
    "transportador" VARCHAR(100) NOT NULL,
    "tipodepoblacion" VARCHAR(5),

    CONSTRAINT "t_aduana_envio_liquidado_pkey" PRIMARY KEY ("picking","transportador")
);

-- CreateTable
CREATE TABLE "t_aduana_recepcion" (
    "wms_id" BIGSERIAL NOT NULL,
    "tipodoc" VARCHAR(10),
    "numdoc" VARCHAR(20),
    "nit" VARCHAR(30),
    "ean" VARCHAR(50),
    "cantidad" DOUBLE PRECISION,
    "fecharecepcion" TIMESTAMP(3),
    "fechaalmacenamiento" TIMESTAMP(3),

    CONSTRAINT "t_aduana_recepcion_pkey" PRIMARY KEY ("wms_id")
);

-- CreateTable
CREATE TABLE "t_aduana_recepcion_archivoedi" (
    "wms_id" BIGSERIAL NOT NULL,
    "numdoc" VARCHAR(20),
    "nit" VARCHAR(30),
    "ean" VARCHAR(50),
    "cantidad" DOUBLE PRECISION,

    CONSTRAINT "t_aduana_recepcion_archivoedi_pkey" PRIMARY KEY ("wms_id")
);

-- CreateTable
CREATE TABLE "t_aduana_wms_pos" (
    "numpicking" INTEGER,
    "productoean" VARCHAR(50),
    "numdecaja" INTEGER,
    "cantidad" DOUBLE PRECISION,
    "id" SERIAL NOT NULL,
    "eancaja" INTEGER,
    "lote" VARCHAR(50),
    "tipocaja" VARCHAR(50) NOT NULL,
    "pesoempacado" DECIMAL(14,2),
    "fecharegistro" TIMESTAMP(3),
    "idusuarioaduana" INTEGER,
    "idcajamaster" VARCHAR(30),
    "npedido" VARCHAR(20),

    CONSTRAINT "t_aduana_wms_pos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_entradas_ras" (
    "autocaja" DOUBLE PRECISION DEFAULT 0,
    "cajano" DOUBLE PRECISION NOT NULL,
    "producto" VARCHAR(50) NOT NULL,
    "cantidadprog" DOUBLE PRECISION DEFAULT 0,
    "registra" INTEGER DEFAULT 0,
    "lote_orden" VARCHAR(20) NOT NULL,
    "nmvto" INTEGER,
    "brecibe" VARCHAR(15),
    "cajaasociada" INTEGER,
    "describteetiqueta" VARCHAR(250) NOT NULL,
    "saldoactual" DOUBLE PRECISION,
    "ubicacionpreasign" VARCHAR(50),
    "operadorras" VARCHAR(20),
    "impresa" INTEGER DEFAULT 0,
    "des_prov" VARCHAR(100),
    "des_articulo" VARCHAR(100),
    "des_umedida" VARCHAR(50),
    "pesocaja" DECIMAL(14,3),
    "tipocaja" VARCHAR(10),
    "fecha" TIMESTAMP(3),
    "cajarecargable" INTEGER,
    "cantidadvalida" DOUBLE PRECISION,
    "idempleadoempaca" INTEGER,
    "fechaempaque" TIMESTAMP(3),

    CONSTRAINT "t_entradas_ras_pkey" PRIMARY KEY ("cajano")
);

-- CreateTable
CREATE TABLE "t_importa_recibo_ciego" (
    "id" SERIAL NOT NULL,
    "ref" VARCHAR(50),
    "lote" VARCHAR(40),
    "fvence" TIMESTAMP(3),
    "cantcajas" INTEGER,
    "factorcaja" DECIMAL(18,3),
    "documentooc" VARCHAR(100),
    "nit" VARCHAR(20),
    "estado" INTEGER,
    "autorizarecibo" INTEGER,
    "fecharegistro" TIMESTAMP(3),
    "idempleadorecibe" INTEGER,
    "idempleadoautoriza" INTEGER,
    "ean" VARCHAR(50),
    "barcode" VARCHAR(50),
    "ord_no" VARCHAR(50),
    "pesociego" VARCHAR(10),
    "lineaidpicking" INTEGER,
    "loteproveedor" VARCHAR(20),
    "tipodocto" VARCHAR(30),

    CONSTRAINT "t_importa_recibo_ciego_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_recepcionextendida" (
    "id" SERIAL NOT NULL,
    "documento" VARCHAR(20) NOT NULL,
    "oc" VARCHAR(10),
    "nit" VARCHAR(30) NOT NULL,
    "id_t100_oc_envia" INTEGER NOT NULL,
    "ean" VARCHAR(50) NOT NULL,
    "pedproveedor" VARCHAR(50) NOT NULL,
    "cod_registro" VARCHAR(50),
    "fechavencimientors" DATE,
    "fechavencimiento" DATE NOT NULL,
    "cantidadrotulos" INTEGER NOT NULL,
    "cantidadcontenido" INTEGER NOT NULL,
    "loteproveedor" VARCHAR(50),
    "descripcionproducto" VARCHAR(50),
    "estado" INTEGER,
    "bodega" VARCHAR(10),

    CONSTRAINT "t_recepcionextendida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_traer_ras" (
    "npedido" VARCHAR(20),
    "eanref" VARCHAR(50),
    "cantyref" DECIMAL(18,5),
    "estado" INTEGER,
    "usuarioprograma" INTEGER,
    "empleadoresurte" INTEGER,
    "id" SERIAL NOT NULL,
    "fechaprogramada" TIMESTAMP(3),
    "fecharesurte" TIMESTAMP(3),
    "qtyresurte" DECIMAL(18,5),
    "prioridad" INTEGER,
    "frecuencia" INTEGER,
    "descripcion" VARCHAR(200),
    "referencia" VARCHAR(50),
    "bodega" VARCHAR(20),
    "ubic_origen" VARCHAR(20),
    "ubic_destino" VARCHAR(20),
    "caja" INTEGER,
    "id_padre" INTEGER,
    "bl" VARCHAR(50),
    "demcal" DECIMAL(14,2),

    CONSTRAINT "t_traer_ras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_codigos_ciudad_dane" (
    "codigo_dane" VARCHAR(50) NOT NULL,
    "codigoc" CHAR(10),
    "ciudad" VARCHAR(50),
    "depto" VARCHAR(50),

    CONSTRAINT "t_codigos_ciudad_dane_pkey" PRIMARY KEY ("codigo_dane")
);

-- CreateTable
CREATE TABLE "t_departamentomunicipio_dane" (
    "wms_id" BIGSERIAL NOT NULL,
    "codigodepartamento" VARCHAR(50),
    "nombredepartamento" VARCHAR(50),
    "codigomunicipio" VARCHAR(50),
    "nombremunicipio" VARCHAR(50),

    CONSTRAINT "t_departamentomunicipio_dane_pkey" PRIMARY KEY ("wms_id")
);

-- CreateTable
CREATE TABLE "t_despachos" (
    "reporte" SERIAL NOT NULL,
    "npedido" VARCHAR(50),
    "cliente" VARCHAR(80),
    "fecha_pedido" TIMESTAMP(3),
    "fecha_despacho" TIMESTAMP(3),
    "fecha_desp" TIMESTAMP(3),
    "numero_guia" VARCHAR(50),
    "transportador" VARCHAR(50),
    "cant_de_cajas" INTEGER,
    "observacion" TEXT,
    "direcc_destino" VARCHAR(50),
    "completo" INTEGER DEFAULT 0,
    "parcial" INTEGER DEFAULT 0,
    "factura" INTEGER NOT NULL,
    "valor_f" INTEGER,
    "hora" VARCHAR(50),
    "obser_servi_pedido" TEXT,
    "remision" VARCHAR(50),
    "placa" VARCHAR(20),
    "ciudad" VARCHAR(50),
    "factura2" INTEGER,
    "valor_f2" INTEGER,
    "factura3" INTEGER,
    "valor_f3" INTEGER,
    "valor_flete" INTEGER,
    "cant_total" INTEGER,
    "nit" VARCHAR(50),
    "item" INTEGER,
    "zona" VARCHAR(50),
    "operador" VARCHAR(50),
    "fecha_edicion" TIMESTAMP(3),
    "factura4" INTEGER,
    "valor_f4" INTEGER,
    "factura5" INTEGER,
    "valor_f5" INTEGER,
    "valor_declarado" INTEGER DEFAULT 0,
    "tipocaja1" INTEGER DEFAULT 0,
    "tipocaja2" INTEGER DEFAULT 0,
    "tipocaja3" INTEGER DEFAULT 0,
    "fact_firm" INTEGER DEFAULT 0,
    "fecha_transporte" TIMESTAMP(3),

    CONSTRAINT "t_despachos_pkey" PRIMARY KEY ("reporte")
);

-- CreateTable
CREATE TABLE "t_guias_generadas" (
    "num_guia" VARCHAR(50) NOT NULL,
    "transportador" VARCHAR(50) NOT NULL,
    "remitente" VARCHAR(100),
    "nit_remitente" VARCHAR(50),
    "ciudad_origen" VARCHAR(50),
    "cod_ciud_origen" VARCHAR(50),
    "fecha_despacho" TIMESTAMP(3),
    "destinatario" VARCHAR(100),
    "nit_destinatario" VARCHAR(50),
    "direccion" VARCHAR(100),
    "telefono" VARCHAR(50),
    "cod_cliente" INTEGER DEFAULT 0,
    "ciudad_destino" VARCHAR(50),
    "cod_ciud_destino" VARCHAR(50),
    "departamento" VARCHAR(50),
    "unidades" DOUBLE PRECISION DEFAULT 0,
    "kilos" DOUBLE PRECISION DEFAULT 0,
    "volumen" DOUBLE PRECISION DEFAULT 0,
    "valor_mercancia" DOUBLE PRECISION DEFAULT 0,
    "valor_declarado" DOUBLE PRECISION DEFAULT 0,
    "total" DOUBLE PRECISION DEFAULT 0,
    "anulada" INTEGER DEFAULT 0,
    "impresa" INTEGER DEFAULT 0,
    "otro" INTEGER DEFAULT 0,
    "comentario" VARCHAR(500),
    "pedido" VARCHAR(100) NOT NULL,
    "division" INTEGER DEFAULT 0,
    "producto" VARCHAR(50) DEFAULT 'MCIA',
    "cuenta" VARCHAR(50) DEFAULT 'CC',
    "acuerdo" VARCHAR(50),
    "divisionremi" VARCHAR(50) DEFAULT '1',
    "id_reporte" DOUBLE PRECISION DEFAULT 0,
    "caja1" DOUBLE PRECISION DEFAULT 0,
    "caja2" DOUBLE PRECISION DEFAULT 0,
    "num_envio" INTEGER DEFAULT 0,
    "auto" SERIAL NOT NULL,
    "prepackingid" INTEGER NOT NULL,
    "factura" VARCHAR(50),
    "empleado" INTEGER,
    "enviado" BOOLEAN,
    "consecdia" SMALLINT,
    "shorturl" VARCHAR(500),
    "fecha_entregacliente" TIMESTAMP(3),
    "id_empleado" INTEGER,

    CONSTRAINT "t_guias_generadas_pkey" PRIMARY KEY ("auto")
);

-- CreateTable
CREATE TABLE "t_ins_tarifasdetransporte" (
    "id" SERIAL NOT NULL,
    "id_transportadora" VARCHAR(50) NOT NULL,
    "id_codciuorigen" VARCHAR(20),
    "id_codciudestino" VARCHAR(20),
    "tipodepoblacion" VARCHAR(20),
    "valor" DECIMAL(18,2),

    CONSTRAINT "t_ins_tarifasdetransporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_totalcode_guiagenerada" (
    "id" SERIAL NOT NULL,
    "orden" INTEGER,
    "sku" VARCHAR(50),
    "cantidad" DECIMAL(18,2),
    "guia" VARCHAR(50),
    "picking" INTEGER,
    "fecha" TIMESTAMP(3),

    CONSTRAINT "t_totalcode_guiagenerada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_transportador" (
    "transportador" VARCHAR(50) NOT NULL,
    "direccion" VARCHAR(50),
    "telefono1" VARCHAR(50),
    "telefono2" VARCHAR(50),
    "valor_acuerdo" INTEGER,
    "estado" INTEGER DEFAULT 0,
    "nit_transportador" CHAR(12),
    "peso" INTEGER DEFAULT 0,
    "peso2" DOUBLE PRECISION DEFAULT 0,
    "pesovol1" DOUBLE PRECISION DEFAULT 0,
    "pesovol2" DOUBLE PRECISION DEFAULT 0,
    "reporte" VARCHAR(50),
    "vinculohttp" VARCHAR(150),
    "restriccioncarga" DOUBLE PRECISION,
    "num_guia" VARCHAR(50) DEFAULT '0',
    "usuario" VARCHAR(50),
    "contrasena" BYTEA,
    "codigocuentacliente" VARCHAR(50),
    "bodega" VARCHAR(20),

    CONSTRAINT "t_transportador_pkey" PRIMARY KEY ("transportador")
);

-- CreateTable
CREATE TABLE "ta_facturacion" (
    "nfact" INTEGER NOT NULL,
    "npedido" VARCHAR(50),
    "fechafactura" TIMESTAMP(3),
    "clientefactura" INTEGER,
    "retenciones" DOUBLE PRECISION DEFAULT 0,
    "cia" VARCHAR(10),
    "nremision" INTEGER,
    "pesobruto" DOUBLE PRECISION,
    "pesoneto" DOUBLE PRECISION,
    "ncajas" INTEGER,
    "observaciones" VARCHAR(1000),
    "listapre" INTEGER,
    "numero" SERIAL NOT NULL,
    "bodegaf" VARCHAR(15),
    "cargada" INTEGER DEFAULT 0,
    "tipodoc" VARCHAR(4),
    "observanulado" TEXT,
    "picking" INTEGER,
    "exportado" INTEGER DEFAULT 0,
    "flete" DOUBLE PRECISION,
    "efsd" BOOLEAN DEFAULT false,
    "consecutivo" DOUBLE PRECISION DEFAULT 63,
    "vlfra" DOUBLE PRECISION,
    "iva" DOUBLE PRECISION,
    "retefuente" DOUBLE PRECISION,
    "reteiva" DOUBLE PRECISION,
    "reteica" DOUBLE PRECISION,
    "neto" DOUBLE PRECISION,
    "anulada" INTEGER DEFAULT 0,
    "tasacambio" DECIMAL(8,2) DEFAULT 1,
    "caja1" INTEGER,
    "caja2" INTEGER,
    "transportador" VARCHAR(50),
    "completo" INTEGER,
    "parcial" INTEGER,
    "despachador" VARCHAR(50),
    "despacho" INTEGER DEFAULT 0,
    "seguro" DOUBLE PRECISION DEFAULT 0,
    "plazo" INTEGER DEFAULT 0,
    "tarifadeimpuesto" VARCHAR(20),
    "volumen" DOUBLE PRECISION,
    "iddescuentonit" INTEGER,

    CONSTRAINT "ta_facturacion_pkey" PRIMARY KEY ("nfact")
);

-- CreateTable
CREATE TABLE "t_facturacion_ppal" (
    "num_factura" VARCHAR(50) NOT NULL,
    "retencion" INTEGER DEFAULT 0,
    "vlfactura" INTEGER DEFAULT 0,
    "flete" INTEGER DEFAULT 0,
    "iva" INTEGER DEFAULT 0,
    "abono" INTEGER DEFAULT 0,
    "fecha_factura" TIMESTAMP(3),
    "nitcliente" VARCHAR(15),
    "num_pedido" VARCHAR(50),
    "descuento" INTEGER,
    "dctonocomercial" INTEGER,
    "notas" INTEGER,
    "otr1" INTEGER,
    "otr2" INTEGER,
    "unidades" INTEGER,
    "notainteres" BOOLEAN DEFAULT false,
    "tipodocumento" VARCHAR(4),
    "nvariable" INTEGER,
    "vendedor" VARCHAR(50),
    "plazo" INTEGER,
    "anula" INTEGER DEFAULT 0,
    "observaciones" VARCHAR(355),
    "fechavence" TIMESTAMP(3),
    "vmonedaini" DOUBLE PRECISION,
    "factorini" DOUBLE PRECISION DEFAULT 1,
    "money" VARCHAR(3),
    "typopago" VARCHAR(3),
    "factorvble" DOUBLE PRECISION,
    "estado" VARCHAR(20),
    "efsd" BOOLEAN DEFAULT false,
    "fecha_pago" TIMESTAMP(3),
    "valor_pago_aux" INTEGER,
    "descrip_pago_aux" TEXT,
    "cheque_post_fe" BOOLEAN DEFAULT false,
    "problema" INTEGER,
    "fecha_reporte" TIMESTAMP(3),
    "orden" INTEGER,
    "costomercvend" DECIMAL(19,4) DEFAULT 0,
    "costoinvent" DECIMAL(19,4) DEFAULT 0,
    "ajustexinflac" DECIMAL(19,4) DEFAULT 0,
    "reteiva" DECIMAL(19,4) DEFAULT 0,
    "reteica" DECIMAL(19,4) DEFAULT 0,
    "neto" DECIMAL(19,4) DEFAULT 0,
    "sw" INTEGER DEFAULT 0,
    "numfact" DECIMAL(10,0) DEFAULT 0,
    "seguro" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "t_facturacion_ppal_pkey" PRIMARY KEY ("num_factura")
);

-- CreateTable
CREATE TABLE "t_ins_detallesdeimpuesto" (
    "codigodeimpuesto" VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(150),
    "cuentapuc" VARCHAR(20),
    "porcimpuesto" DECIMAL(8,4),
    "montodeimpuesto" DECIMAL(10,2),
    "montominimo" DECIMAL(10,2),
    "prefijoimpuesto" CHAR(10),
    "isgrabable" CHAR(1),

    CONSTRAINT "t_ins_detallesdeimpuesto_pkey" PRIMARY KEY ("codigodeimpuesto")
);

-- CreateTable
CREATE TABLE "t_ins_lista_precio_ppal" (
    "refe" VARCHAR(50) NOT NULL,
    "lista" INTEGER NOT NULL,
    "precio_de_venta" DOUBLE PRECISION,
    "factor" DOUBLE PRECISION,
    "referencia" VARCHAR(50),
    "moneda" VARCHAR(3),
    "descuento1" DOUBLE PRECISION,
    "idlistapre" SERIAL NOT NULL,
    "descripcion" VARCHAR(150),
    "margenupgrate" DOUBLE PRECISION DEFAULT 0,
    "codarancel" SMALLINT,
    "nomlista" VARCHAR(50),

    CONSTRAINT "t_ins_lista_precio_ppal_pkey" PRIMARY KEY ("refe","lista")
);

-- CreateTable
CREATE TABLE "t_ins_tarifasdeimpuesto" (
    "codigotarifa" VARCHAR(10),
    "descripcion" VARCHAR(100),
    "grupodeimpuesto" VARCHAR(50),
    "codigodeimpuesto" VARCHAR(10),
    "id" SERIAL NOT NULL,

    CONSTRAINT "t_ins_tarifasdeimpuesto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "t_ins_trm" (
    "idtrm" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3),
    "usuario" VARCHAR(50),
    "moneda" VARCHAR(50),
    "trm" DOUBLE PRECISION,
    "isactiva" BOOLEAN,

    CONSTRAINT "t_ins_trm_pkey" PRIMARY KEY ("idtrm")
);

-- CreateTable
CREATE TABLE "t_panoramacontable" (
    "codigo" VARCHAR(10) NOT NULL,
    "descripcion" CHAR(30) NOT NULL,
    "inventario" CHAR(8),
    "recepcion" CHAR(8),
    "ajustecant" CHAR(8),
    "ajustecosto" CHAR(8),
    "variacioncosto" CHAR(8),
    "variacioncant" CHAR(8),
    "ventas_cxp" CHAR(8),
    "costo" CHAR(8),
    "devolucion" CHAR(8),
    "comprobante" VARCHAR(20),
    "cuentadescuentonif" VARCHAR(20),
    "garantiaestimada" INTEGER,

    CONSTRAINT "t_panoramacontable_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "t_plan_cuentas" (
    "numcuenta" VARCHAR(50) NOT NULL,
    "descripcion" VARCHAR(50),
    "tipo" INTEGER,
    "t2" INTEGER,
    "nivel" VARCHAR(10),
    "clasificadorcuenta" VARCHAR(5),
    "cod_tipoctapuc" VARCHAR(5),
    "porcentajeimpuesto" DECIMAL(18,2),
    "isnormalocal" BOOLEAN,
    "isnormanif" BOOLEAN,
    "mvtomonedaextran" BOOLEAN,
    "cuentautilidadoperdida" VARCHAR(20),
    "isfuente" BOOLEAN,
    "codflujoefectivo" VARCHAR(50),
    "formatomm" VARCHAR(4),
    "conceptomm" VARCHAR(4),
    "manejacartera" BOOLEAN,

    CONSTRAINT "t_plan_cuentas_pkey" PRIMARY KEY ("numcuenta")
);

-- CreateIndex
CREATE UNIQUE INDEX "t_maestro_lote_pt_idlote_key" ON "t_maestro_lote_pt"("idlote");

-- CreateIndex
CREATE UNIQUE INDEX "t_ins_ubicaciones_fijas_mp_bodega_eanmaterial_key" ON "t_ins_ubicaciones_fijas_mp"("bodega", "eanmaterial");

-- CreateIndex
CREATE UNIQUE INDEX "t_ins_permisosxusuario_tipodeorden_programa_tipoo_usuario_key" ON "t_ins_permisosxusuario_tipodeorden"("programa", "tipoo", "usuario");

-- CreateIndex
CREATE UNIQUE INDEX "t_procesos_oredenes_orden_cod_proces_key" ON "t_procesos_oredenes"("orden", "cod_proces");

-- CreateIndex
CREATE UNIQUE INDEX "t_encabezado_prepack_cargue_cargue_bigpicking_unitarizador__key" ON "t_encabezado_prepack_cargue"("cargue", "bigpicking", "unitarizador", "zonapiso");

-- CreateIndex
CREATE UNIQUE INDEX "t_ssccxcaja_id_key" ON "t_ssccxcaja"("id");

-- CreateIndex
CREATE UNIQUE INDEX "t_ins_tarifasdeimpuesto_codigotarifa_codigodeimpuesto_key" ON "t_ins_tarifasdeimpuesto"("codigotarifa", "codigodeimpuesto");

-- AddForeignKey
ALTER TABLE "t_clientes_direcciones" ADD CONSTRAINT "fk_t_clientes_direcciones_t_clientes" FOREIGN KEY ("nit") REFERENCES "t_clientes"("nit") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_detalle_referencia" ADD CONSTRAINT "fk_t_detalle_referencia_t_ins_referencias" FOREIGN KEY ("codigoreferencia") REFERENCES "t_ins_referencias"("codigoreferencia") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_ins_genericos" ADD CONSTRAINT "fk_t_ins_genericos_t_ins_referencias" FOREIGN KEY ("ref") REFERENCES "t_ins_referencias"("codigoreferencia") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_programas_usuarios" ADD CONSTRAINT "fk_t_programas_usuarios_t_usuarios" FOREIGN KEY ("usuario") REFERENCES "t_usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_historia_status_calidad" ADD CONSTRAINT "fk_t_historia_status_calidad_maestro_lote_pt" FOREIGN KEY ("lote", "productoean") REFERENCES "t_maestro_lote_pt"("loteproveedor", "codean") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_historia_status_rechazo" ADD CONSTRAINT "fk_t_historia_status_rechazo" FOREIGN KEY ("id_historia_status_calidad") REFERENCES "t_historia_status_calidad"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_historia_status_rechazo" ADD CONSTRAINT "fk_t_historia_status_rechazo_t_maestro_lote_pt" FOREIGN KEY ("id_lote", "codean") REFERENCES "t_maestro_lote_pt"("loteproveedor", "codean") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_empleados_zonas" ADD CONSTRAINT "fk_t_empleados_zonas" FOREIGN KEY ("empleado") REFERENCES "templeados"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_detalle_orden_compra" ADD CONSTRAINT "fk_t_detalle_orden_compra_t_detalle_referencia" FOREIGN KEY ("eanproveedores") REFERENCES "t_detalle_referencia"("productoean") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_detalle_orden_compra" ADD CONSTRAINT "fk_t_detalle_orden_compra_t_orden_compra" FOREIGN KEY ("nordencompra") REFERENCES "t_orden_compra"("numordencompra") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_encabezadopedido" ADD CONSTRAINT "fk_t_encabezadopedido_t_clientes" FOREIGN KEY ("cliente") REFERENCES "t_clientes"("nit") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_ins_coordenadas_pods" ADD CONSTRAINT "fk_t_ins_coordenadas_pods_t_entradas_ras" FOREIGN KEY ("cajap_pods") REFERENCES "t_entradas_ras"("cajano") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_materiales_por_orden" ADD CONSTRAINT "fk_t_materiales_por_orden_t_seriepedido" FOREIGN KEY ("orden") REFERENCES "t_seriepedido"("ordenpdn") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_orden_compra" ADD CONSTRAINT "fk_t_orden_compra_t_clientes" FOREIGN KEY ("proveedor") REFERENCES "t_clientes"("nit") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_pic" ADD CONSTRAINT "fk_t_pic" FOREIGN KEY ("cajap") REFERENCES "t_entradas_ras"("cajano") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_pic" ADD CONSTRAINT "fk_t_pic_t_ins_bodega" FOREIGN KEY ("bodepicking") REFERENCES "t_ins_bodega"("bodega") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_pic_ajuste" ADD CONSTRAINT "fk_t_pic_ajuste" FOREIGN KEY ("caja") REFERENCES "t_entradas_ras"("cajano") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_pic_multiproducto" ADD CONSTRAINT "fk_t_pic_multiproducto_entradas_ras" FOREIGN KEY ("cajap") REFERENCES "t_entradas_ras"("cajano") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_procesos_oredenes" ADD CONSTRAINT "fk_t_procesos_oredenes_t_seriepedido" FOREIGN KEY ("orden") REFERENCES "t_seriepedido"("ordenpdn") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_serie_pedido_nueva" ADD CONSTRAINT "fk_t_serie_pedido_nueva_t_detalle_referencia" FOREIGN KEY ("refean") REFERENCES "t_detalle_referencia"("productoean") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_serie_pedido_nueva" ADD CONSTRAINT "fk_t_serie_pedido_nueva_ta_facturacion" FOREIGN KEY ("nofatura") REFERENCES "ta_facturacion"("nfact") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_seriepedido" ADD CONSTRAINT "fk_t_seriepedido_t_encabezadopedido" FOREIGN KEY ("numpedido") REFERENCES "t_encabezadopedido"("npedido") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_seriepedido" ADD CONSTRAINT "fk_t_seriepedido_t_ins_referencias" FOREIGN KEY ("ref") REFERENCES "t_ins_referencias"("codigoreferencia") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_detalle_prepack" ADD CONSTRAINT "fk_t_detalle_prepack_t_encabezado_prepack" FOREIGN KEY ("numpicking") REFERENCES "t_encabezado_prepack"("idmovimiento") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_detalle_prepack_xlineapedido" ADD CONSTRAINT "fk_t_detalle_prepack_xlineapedido_t_encabezado_prepack" FOREIGN KEY ("numpicking") REFERENCES "t_encabezado_prepack"("idmovimiento") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_encabezado_prepack_cargue" ADD CONSTRAINT "fk_t_encabez_picki_04f1402b" FOREIGN KEY ("picking") REFERENCES "t_encabezado_prepack"("idmovimiento") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_encabezado_prepack_ext" ADD CONSTRAINT "fk_t_encabezado_prepack_ext" FOREIGN KEY ("picking") REFERENCES "t_encabezado_prepack"("idmovimiento") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_ins_valoresfijosxempaque" ADD CONSTRAINT "fk_t_ins_valoresfijosxempaque" FOREIGN KEY ("tipodecaja") REFERENCES "tiposdecaja"("tipo_caja") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_ins_valoresfijosxempaque" ADD CONSTRAINT "fk_t_ins_valoresfijosxempaque_transportadora" FOREIGN KEY ("transportadora") REFERENCES "t_transportador"("transportador") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_ssccxcaja" ADD CONSTRAINT "fk_t_ssccxcaja_t_encabezado_prepack" FOREIGN KEY ("idprepack") REFERENCES "t_encabezado_prepack"("idmovimiento") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_vbles_logisticasxcaja" ADD CONSTRAINT "fk_t_vbles_logisticasxcaja" FOREIGN KEY ("cajano", "codean") REFERENCES "t_maestro_lote_pt"("loteproveedor", "codean") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_aduana_wms_pos" ADD CONSTRAINT "fk_t_aduana_wms_pos" FOREIGN KEY ("tipocaja") REFERENCES "tiposdecaja"("tipo_caja") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_entradas_ras" ADD CONSTRAINT "fk_t_entradas_ras_maestro_lote_pt" FOREIGN KEY ("lote_orden", "producto") REFERENCES "t_maestro_lote_pt"("loteproveedor", "codean") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_guias_generadas" ADD CONSTRAINT "fk_t_guias_generadas" FOREIGN KEY ("prepackingid") REFERENCES "t_encabezado_prepack"("idmovimiento") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_guias_generadas" ADD CONSTRAINT "fk_t_guias_generadas_transportador" FOREIGN KEY ("transportador") REFERENCES "t_transportador"("transportador") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_facturacion_ppal" ADD CONSTRAINT "fk_t_facturacion_ppal_t_clientes" FOREIGN KEY ("nitcliente") REFERENCES "t_clientes"("nit") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_facturacion_ppal" ADD CONSTRAINT "fk_t_facturacion_ppal_t_clientes_direcciones" FOREIGN KEY ("nvariable") REFERENCES "t_clientes_direcciones"("item") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_ins_lista_precio_ppal" ADD CONSTRAINT "fk_t_ins_lista_precio_ppal_t_detalle_referencia" FOREIGN KEY ("refe") REFERENCES "t_detalle_referencia"("productoean") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "t_ins_tarifasdeimpuesto" ADD CONSTRAINT "fk_t_ins_tarifasdeimpuesto_t_ins_detallesdeimpuesto" FOREIGN KEY ("codigodeimpuesto") REFERENCES "t_ins_detallesdeimpuesto"("codigodeimpuesto") ON DELETE NO ACTION ON UPDATE NO ACTION;

