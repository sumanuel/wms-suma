# WMS web · Plan de migración completo

Reemplazo del WMS de escritorio «Copernico ERP Prepacking» (`ProyectoHumax`, VB.NET WinForms + SQL Server)
por una aplicación web con el mismo patrón que `teyma-nuevo`.

## 1. Decisiones de arquitectura

| Tema | Decisión | Motivo |
|---|---|---|
| Framework | Next.js 16 (App Router, Cache Components, `output: standalone`) | Igual que `teyma-nuevo`; mismo equipo, mismas convenciones |
| Lenguaje | TypeScript estricto + Zod para validar entradas | Igual que referencia |
| Base de datos | **PostgreSQL 16** | Pedido del usuario |
| Multi-cliente | **Una base de datos por cliente** + una base de control (`wms_control`); ver sección 2b | Pedido del usuario: aislamiento total de datos, respaldo y migración por cliente |
| Entorno local | PostgreSQL 14 instalado en la máquina (servicio `postgresql-x64-14`, puerto 5432), sin Docker para la base | Pedido del usuario |
| ORM | Prisma 7 con `@prisma/adapter-pg`, esquema partido en `prisma/schema/NN_modulo.prisma` | Igual que referencia (allí `adapter-mssql`) |
| Reglas de datos | Migraciones Prisma + `CHECK` generados (`scripts/db/generar-checks.ts`) | Igual que referencia |
| Sesión | Cookie firmada JWT (`jose`), 30 min de inactividad, 12 h máximo; `src/proxy.ts` + `src/lib/dal.ts` | Igual que referencia |
| Contraseñas | scrypt, mínimo 10 caracteres, bloqueo 15 min tras 5 intentos, `registro_ingreso` | Igual que referencia |
| Permisos | `<modulo>.ver / .crear / .editar / .eliminar / .exportar`, verificados en página **y** en cada acción del servidor | Reemplaza `PermisosAutorizados` (Agregar/Modificar/Consultar/Borrar por programa) |
| Listados | `Definicion` declarativa + componente `<Listado>`; la misma definición alimenta Excel/PDF | Reemplaza ~40 formularios `frmC*` / `frmPlantillaConsulta` |
| Catálogos | Motor de catálogos declarativo (`definiciones.ts`) | Reemplaza los ~35 formularios de maestros `FrmM*` / `FrmC*` |
| Excel | `write-excel-file` / `read-excel-file` | Reemplaza Excel COM Interop |
| PDF y etiquetas | `pdfkit` (etiquetas SSCC, guías, reportes) | Reemplaza Crystal Reports 10.5 y ReportViewer |
| Archivos | S3 (o Azure Blob) con URL firmadas, como `src/lib/archivos.ts` | Igual que referencia |
| Móvil | **PWA** dentro de la misma app (`/movil`), lector por teclado/cámara | Reemplaza los 4 formularios `frm_Movil_*` |
| API externa | Rutas REST en `src/app/api/…` con OpenAPI y token | Reemplaza `PrepackingAndWmsIS.asmx` (57 métodos) y `eCommerceIS.asmx` (4) |
| Despliegue | Docker (Node 22) + RDS PostgreSQL o Azure Flexible Server; scripts en `scripts/aws` y `scripts/azure` | Igual que referencia |
| Hardware local (PLC, impresoras) | **Agente local** aparte (ver fase 9) | El navegador no puede hablar con el PLC ni con impresoras de red |

## 2. Estructura del repositorio

```
wms-web/
  prisma/schema/   00_config 10_seguridad 20_catalogos 30_maestros 40_inventario
                   50_ubicaciones 60_pedidos 70_prepacking 80_aduana 90_despacho 95_conteo
  scripts/db/      local.sh  bootstrap.ts  generar-checks.ts  importar-sqlserver/
  scripts/legado/  extraer-ddl.ts  extraer-sps.ts  comparar-resultados.ts
  src/app/(app)/   un directorio por módulo
  src/app/movil/   PWA
  src/app/api/     api externa + salud
  src/lib/         dal, sesion, listados, catalogos, pdf, etiquetas, sscc
  docs/            api-externa.md  mapa-pantallas.md  mapa-sps.md
```

## 2b. Multi-cliente: una base de datos por cliente

```
PostgreSQL
 ├─ wms_control        ← catálogo de clientes (un solo esquema, lo administra el proveedor)
 ├─ wms_cliente_acme   ← datos del cliente 1 (mismo esquema del WMS)
 ├─ wms_cliente_beta   ← datos del cliente 2
 └─ …
```

**Base de control (`wms_control`)**: tabla `cliente` (id, slug, nombre, estado activo/suspendido, dominio o subdominio,
host/puerto/nombre de BD, usuario y contraseña **cifrados** con AES-256-GCM usando `CONTROL_CLAVE_MAESTRA` de entorno,
versión de esquema aplicada, límites de conexiones), `administrador_plataforma` y `registro_aprovisionamiento`.

**Resolución del cliente en cada petición**
1. Subdominio (`acme.wms.midominio.com`) o, en local, ruta `/c/acme` o cabecera. El proxy (`src/proxy.ts`) lo traduce a `clienteId`.
2. El JWT de sesión incluye `clienteId`; `dal.ts` rechaza si el token no coincide con el cliente de la petición.
3. `getDb(clienteId)` devuelve un `PrismaClient` con su propio `Pool` de `pg`, cacheado en un `Map` (LRU con cierre de
   inactivos y máximo de conexiones por cliente, p. ej. 5) para no agotar `max_connections`.
4. Ningún código de negocio recibe una conexión global: todo pasa por `const db = await dbDelCliente()` (lee el cliente del
   contexto de la petición). Una regla de lint y una prueba impiden importar un cliente Prisma fijo.

**Ciclo de vida de un cliente**
- `npm run cliente:crear -- acme "ACME S.A."`: crea la base y los roles (`wms_app`, `wms_migrador`), aplica las migraciones,
  permisos y datos de referencia, crea el usuario administrador inicial y registra el cliente en `wms_control`.
- `npm run db:migrar:todos`: recorre los clientes activos y ejecuta `prisma migrate deploy` en cada uno, con registro de
  éxito/fallo por cliente y reintento. Un cliente que falla no bloquea a los demás; se despliega por lotes (canario primero).
- `npm run cliente:respaldar|restaurar|suspender|eliminar`: respaldo con `pg_dump` por cliente; eliminar exige confirmación y
  respaldo previo.
- Importación del legado: `scripts/db/importar-sqlserver/` recibe el cliente destino, de modo que cada cliente migra a su
  propia base desde su propio SQL Server.

**Personalización por cliente**: no se bifurca el código. Diferencias (p. ej. `FrmFormasDeAduanar` vs `_EXPO`, integraciones
de transportadoras, formatos de etiqueta) van como **configuración por cliente** (tabla `configuracion` dentro de su base,
más banderas de módulos activos en `wms_control`) y se leen con `configCliente()`.

**Seguridad y operación**
- Aislamiento fuerte: credenciales de BD distintas por cliente; una consulta nunca puede cruzar de cliente.
- Pruebas automáticas de aislamiento (usuario del cliente A no ve datos de B, ni con un token manipulado).
- Auditoría por cliente en su propia base; auditoría de plataforma en `wms_control`.
- Un solo despliegue de la aplicación sirve a todos los clientes. Si un cliente grande lo requiere, su base puede vivir en
  otro servidor porque el host está en `wms_control`.
- Límite práctico: decenas a pocos cientos de clientes por instancia; a partir de ahí, un pooler (PgBouncer) o agrupar servidores.

**Entorno local**: usa el PostgreSQL 14 ya instalado (puerto 5432). `scripts/db/local.sh` pasa a ser `scripts/db/local.ps1`:
crea `wms_control` y un cliente de pruebas `wms_cliente_demo`. Las credenciales quedan en `.env` (no versionado). Prisma 7
es compatible con PostgreSQL 14. Atención en los scripts: el usuario necesita `CREATEDB` y `CREATEROLE`.

## 3. Inventario de lo que hay que reemplazar

Origen: ~100 formularios, ~190 000 líneas VB, 374 stored procedures referenciados desde la capa DA
(554 llamadas `GetStoredProcCommand`).

| Módulo web | Pantallas legadas principales | Stored procedures (familias) |
|---|---|---|
| **Seguridad** | `FrmCusuarios`, `PermisosAutorizados`, `PermisosxUsuarioDeOrden`, `ProgramasxUsuario…` | usuarios, programas, permisos |
| **Catálogos y maestros** | `frmCArticulos`, `FrmCReferencias`, `frmCBodegas`, `frmCCiudades`, `frmCProveedores`, `frmCTransportadores`, `frmCTipoDeCaja`, `FrmMTiposDeCaja`, `FrmMLogisticasXCaja`, `FrmMRegistroSanitario`, `frmMvaloresFijosxEmpaque`, `frmCMotivosRechazo`, `frmCDescripcionesxGrupo`, `frmCFirmaAutorizada`, `FrmMZonasEmpleado`, `frmCEmpleados` | `Maestro`, `TiposDeCaja`, `LogisticasXCaja`, `transportador`, … |
| **Ubicaciones y bodega** | `frmCBodegasEnMapas`, `frmCoordenadasUbicacion`, `frmMUbicacionesEan`, `FrmUbicarEan`, `frmAsignacionUbicacionxCaja`, `FrmInventarioUbicaciones`, `frmMostrarElementosEnUbicacion`, `CajonUbicacionGrande`, `frmCZonas…` | `Narth`, `UbicacionesEan`, zonas |
| **Inventario y lotes** | `frmCLotes`, `frmMLotes`, `frmGenerarLotes`, `frmInventariosxEAN`, `frmLotesProductosVencer`, `frmStatusMaterial`, `frmVigenciaArticulos`, `frmAjusteDeReservas`, `frmCLotesDisponiblesxEan`, `frmRegistroSanitarioxLote` | `Materiales`, `Entradas`, `PIC` |
| **Pedidos y órdenes** | `FrmImportacionPedidosWMS`, `frmImportacionPedidosNew`, `FrmGenPedidosDinamicos`, `frmDetallePedido`, `frmCRutasDisponibles` | `SeriePedido`, `Detalle`, `encabezado` |
| **Planeación y picking** | `frmPlaneacionPicking` (5 700 líneas), `FrmPickingPOS`, `FrmSimuladorPicking`, `FrmInfoPicking`, `FrmDetallePickingConsolidado`, `FrmEditarCajasPickingAduana` | `Detalle`, `encabezado`, `LiquidacionEnvioPicking` |
| **Prepacking** | `frmPrepacking`, `frmPrepackingOrdenesProduccion`, `frmActualizaCantidadPrepacking`, `frmFiltroPrepacking`, `frmCPrepackingsCancelables`, `frmGenerarCajas`, `frmCajaContenedora`, `frmCajaPOD`, `frmCantidadesxCaja`, `frmMovimientoCaja` | `SSCCxCaja`, `Pallets`, cajas |
| **Aduana (recepción y salida)** | `frmAduana` (4 800), `FrmAduanaDeRecepcion`, `FrmFormasDeAduanar*` (3 variantes), `FrmAsignaAduana`, `FrmAsignaMuelle`, `FrmAduanaPLC` | `Aduana`, `TerminarAduanaDePicking`, `ValidarCodigoCajaMaster` |
| **Pallets / SSCC / etiquetas** | `frmPallets`, `frmCPalletDisponibles`, `frmFiltroTSSCC`, `frmLeerEtiquetaImpre`, `TareaDeImpresion` | `Pallets`, `SSCCxCaja` |
| **Despacho, guías y transporte** | `FrmGenGiasExternas`, `frmGuiaGenerada`, `frmGuiaGeneradaEmail`, `frmCGuiasTotales`, `frmRelacionaGuiaToPicking`, `FrmLiquidacionEnvioPicking`, `frmCTarifasTransportexTransportador`, `frmSimuladorCalculoServicio`, `frmCCalculoVolumen` | `guias`, `transportador` |
| **Conteo de inventario** | `frmProgramarConteoDeInventarios` (2 560), `frmConteoDeInventarios`, `frmCConteosInventarioActivos`, `frmCBLectura`, `Frm_Movil_ConteoDeInventario` | conteo |
| **Indicadores y reportes** | `frmKPI_Logisticos`, `FrmIndicadoresProcesos`, `frmIndicadores`, `FrmEstadisticasZona`, `VisorEstadisticoZona`, `frmReportes`, `frmCConsultasAleatorias`, `frmEjecutaPrmAleatorio` | consultas, KPIs |
| **Administración** | `ControlDeCambios`, `TransactionLog`, `FrmDinamicasPorFormulario`, `frmCompartirEnlace`, `EnviarCorreo`, `EMail` | `DinamicasFormulario` |
| **Móvil (PWA)** | `frm_Movil_PickingxEanDeCaja`, `frm_Movil_RecargaDeCaja`, `frm_Movil_AlmacenaUbicacionesFijas`, `Frm_Movil_ConteoDeInventario` | picking, recarga, ubicaciones, conteo |
| **Integraciones** | Servientrega (`GeneracionGuias.asmx`), Aldía Logística (tracking), FTP, SMTP, Twitter, eCommerce | — |

## 4. El problema central: los stored procedures

El código C# de escritorio contiene solo las llamadas a los SP; la lógica real vive en SQL Server. Los scripts de la base
`CO_DLL_BASE` (carpeta `SCRITS BASE`, generados el 4/10/2022) **sí traen ese código**:

| Archivo | Contenido |
|---|---|
| `tablas.sql` | 873 tablas (544 PK, 243 FK) |
| `sp.sql` | 4 863 SP (~468 000 líneas) |
| `funciones.sql` | 863 funciones |
| `vistas.sql` | 395 vistas |
| `tablas_type.sql` | tipos de tabla (table-valued parameters) |

La base es un ERP completo; el WMS usa solo una parte: **371 SP distintos llamados desde el escritorio, 340 con código disponible
(~37 500 líneas), y ~100 tablas núcleo**. Los 31 restantes se listan en `docs/mapa-sps.md` y hay que pedirlos. Lista de tablas
en `docs/tablas-wms.md`. Los scripts están en UTF-16 y no incluyen datos ni índices no agrupados relevantes (verificar).

Pasar a PostgreSQL obliga a:

1. **Completar** lo que falta: los 31 SP ausentes, las funciones/vistas que usen los 340 SP (cierre de dependencias) y confirmar
   que el script es el vigente (es de 2022).
2. **Clasificar** cada SP: lectura simple (`SELECT`) → consulta Prisma/SQL; escritura con reglas → servicio TypeScript en
   transacción; lógica pesada (aduana, planeación, liquidación) → función PL/pgSQL **o** servicio TS.
   Regla: la lógica de negocio va en TypeScript (`src/lib/<modulo>/`), con pruebas; PL/pgSQL solo si hay un motivo de rendimiento.
3. **Documentar** en `docs/mapa-sps.md`: SP → tabla(s) que toca → módulo web → estado. Es el tablero de avance.
4. **Probar contra el legado**: `scripts/legado/comparar-resultados.ts` ejecuta el mismo caso en el SQL Server viejo y en el
   Postgres nuevo y compara resultados (cantidades de picking, reservas, liquidación de envío). Es la red de seguridad.

Mapeo de tipos: `uniqueidentifier→uuid`, `datetime→timestamptz`, `bit→boolean`, `nvarchar→text`, `money→numeric(18,4)`,
`IDENTITY→GENERATED ALWAYS AS IDENTITY`, nombres a `snake_case` minúscula.

## 5. Migración de datos

- Herramienta: `pgloader` o script `tsx` propio sobre `mssql` → `pg`, por tablas, con conteos y sumas de control.
- Ensayo completo repetible (`scripts/db/importar-sqlserver/`), idempotente, que se corre varias veces antes del corte.
- Se migran maestros y saldos vigentes; el histórico transaccional antiguo se evalúa con el cliente (archivar vs migrar).
- Corte: congelar escritorio → importación final → validar saldos de inventario por EAN/lote/ubicación → abrir web.

## 6. Fases

| Fase | Contenido | Resultado verificable |
|---|---|---|
| **0. Descubrimiento** (1–2 sem) | Extraer DDL y SP; inventariar pantallas realmente usadas (log de uso o entrevistas); decidir variantes duplicadas de aduana; confirmar hardware real (PLC, impresoras, lectores) | `mapa-pantallas.md`, `mapa-sps.md`, esquema SQL Server completo |
| **1. Base técnica y multi-cliente** (3 sem) | Repo Next 16 + Prisma 7 sobre el PostgreSQL 14 local, CI, lint, Dockerfile, `/api/salud`, esquema `00_config`; `wms_control`, resolución de cliente, `dbDelCliente()`, `cliente:crear`, `db:migrar:todos`, prueba de aislamiento | Dos clientes de prueba con datos separados en la misma app |
| **2. Seguridad** (2 sem) | Usuarios, perfiles, permisos por módulo, login, bloqueo, auditoría, menú lateral | Login + permisos + `auditoria_cambio` |
| **3. Motor de listados y catálogos** (2 sem) | `Listado`, `Definicion`, exportación Excel/PDF, motor de catálogos, archivos en S3 | Un catálogo completo de punta a punta |
| **4. Maestros y ubicaciones** (3–4 sem) | Artículos, bodegas, zonas, mapas, ubicaciones, cajas, proveedores, transportadores, tarifas, ciudades, etc. | Todos los `frmC*` / `FrmM*` cubiertos |
| **5. Inventario y lotes** (3 sem) | Lotes, entradas, saldos por ubicación, estados de calidad, vigencias, registro sanitario, ajustes | Saldos que cuadran con el legado |
| **6. Pedidos, planeación y picking** (5–6 sem) | Importación de pedidos (Excel), pedidos dinámicos, planeación, simulador, picking consolidado | Casos de `comparar-resultados` iguales |
| **7. Prepacking, pallets y SSCC** (4–5 sem) | Generación de cajas, prepacking pedidos/órdenes, pallets, SSCC, etiquetas PDF | Etiquetas imprimibles y escaneables |
| **8. Aduana y despacho** (5–6 sem) | Aduana de salida y de recepción (una sola versión), muelles, guías, liquidación de envío, transportadores, integración Servientrega/Aldía | Despacho completo de un pedido real |
| **9. Móvil PWA y agente local** (3–4 sem) | `/movil`: conteo, picking por EAN, recarga de caja, ubicaciones fijas; agente local para PLC e impresoras | Operario completa un picking en el terminal |
| **10. Conteo, KPIs y reportes** (3 sem) | Programar/ejecutar conteos, indicadores, estadísticas por zona, consultas aleatorias, reportes PDF/Excel | Reportes equivalentes a los de Crystal |
| **11. API externa y e-commerce** (2 sem) | Rutas REST + OpenAPI que sustituyen los `.asmx`; token por cliente | Clientes del servicio SOAP migrados |
| **12. Datos, pruebas paralelas y corte** (4 sem) | Importación completa, operación en paralelo, capacitación, plan de rollback | Go-live |

Total orientativo: **~9–12 meses para una persona, ~5–7 con dos o tres**. Las fases 4–8 se pueden repartir en paralelo
una vez terminada la fase 3. Prioridad si hay que recortar: 2 → 3 → 4 → 5 → 9 (móvil) → 6 → 7 → 8.

## 7. Hardware e integraciones

- **PLC Unitronics** (`FrmAduanaPLC`): servicio Node/.NET local en la bodega con el driver de Unitronics; la web lo llama por
  HTTPS/WebSocket autenticado. Alternativa: eliminar la dependencia si el PLC ya no se usa (confirmar en fase 0).
- **Impresión de etiquetas**: PDF desde el servidor; impresión directa por el diálogo del navegador o por el agente local
  (ZPL a impresoras de red si son Zebra — confirmar modelo).
- **Lector de códigos**: la mayoría emula teclado (reemplaza `GetAsyncKeyState`); hook `useLectorCodigo` en la web. Cámara con
  `BarcodeDetector` como alternativa en móvil.
- **Servientrega / Aldía / FTP / SMTP**: clientes en `src/lib/integraciones/`, credenciales en variables de entorno.
- **Twitter** (`MiTwitter`): descartar salvo que el cliente lo use.

## 8. Seguridad (acción inmediata)

- `FactoryNet.CopernicoERPPrepackingIS/web.config` contiene **usuarios y contraseñas de SQL Server en texto plano** (incluido `sa`
  y un servidor en la nube). Rotarlas ya, aunque la migración tarde.
- En el sistema nuevo: secretos solo por variables de entorno / Secrets Manager, usuario de BD de aplicación sin `db_owner`
  (`app` vs `migrador`, como en TEYMA), TLS obligatorio, auditoría de cambios.

## 9. Riesgos principales

1. **Lógica oculta en SP** que no está en el repositorio → mitigación: fase 0 + comparador de resultados.
2. **Formularios de 2 000–5 700 líneas** con reglas mezcladas con UI → dividir por casos de uso y escribir pruebas antes de portar.
3. **Controles propietarios sin fuentes** (`Controles 3.0`, `FactoryNet.*`, `SGVApis.dll`) → documentar su comportamiento observándolos en
   ejecución; pedir las fuentes al proveedor.
4. **Alcance inflado por duplicados** (`_Old`, `_NEW`, `_OLD`, variantes `_EXPO`/`New`) → decidir en fase 0 cuál es la vigente.
5. **Operación continua de bodega** → convivencia escritorio + web con corte por módulo o por bodega, no un big-bang.
6. **Dependencia de hardware** no probada → prueba de concepto de PLC e impresoras en fase 1, no en la 9.

## 10. Definición de «terminado» por módulo

- Pantalla web equivalente con los mismos permisos y validaciones.
- Cada SP del módulo marcado «migrado» en `mapa-sps.md`.
- Prueba comparativa contra el legado con datos reales anonimizados.
- Exportación Excel/PDF funcionando, auditoría de cambios registrada.
- Aceptado por un usuario de bodega.

## 11. Estado de avance

- **Base técnica y multi-cliente (fase 1): hecha.** Next.js 16, Prisma 7, PostgreSQL por cliente, login, permisos, auditoría,
  scripts `cliente:*` y `db:migrar:todos`. Aislamiento verificado con `npm run probar:aislamiento`.
- **Esquema del núcleo WMS: convertido.** 89 tablas y 39 claves foráneas generadas desde `tablas.sql` con
  `scripts/legado/convertir_tablas.py` (`npm run legado:tablas`), migración `20261119140000_esquema_legado_nucleo`.
  El detalle de lo no convertido (columnas calculadas, defaults, claves sustitutas, identidades) está en `docs/mapeo-tablas.md`.
- **Pendiente del esquema:** índices no únicos (el DDL no los trae; se deducen de los SP), columnas calculadas, y revisar la
  clasificación por módulo (`96_erp` y `30_maestros` son cajones). Las tablas se llaman como en el legado (minúscula) para
  que portar cada SP sea casi mecánico; se renombran cuando el módulo se rediseñe.
- **Siguiente:** convertir los SP por módulo (empezar por maestros/inventario), con `docs/mapa-sps.md` como tablero.

### 11.1 Diseño y organización (referencia: teyma-nuevo)

La interfaz sigue la de `teyma-nuevo`, sin su logo: tema (tokens en `globals.css`, fuente Plus Jakarta Sans), menú lateral por **áreas** desplegables (Operación, Inventario, Maestros, Análisis y, al pie, Configuración) con modo contraído, barra superior con ubicación, inicio con una tarjeta por módulo, módulos con pestañas, y un **motor de listados** común (`lib/listados.ts` + `components/listado/`): búsqueda, filtros, orden, columnas elegibles y paginación por URL. Cada módulo nuevo se declara en `lib/nucleo/modulos.ts` (permisos) y `lib/menu.ts` (área, ícono, descripción). La marca es solo texto en `components/marca.tsx`. Pendiente respecto a la referencia: exportar a Excel/PDF desde los listados, formularios de ficha con secciones y comentarios desde pantalla.

### 11.2 Primer módulo real: Artículos (Maestros)

`/articulos` (artículos por código de barras, `t_detalle_referencia`) y `/articulos/referencias` (`t_ins_referencias`): listado con búsqueda, filtro, orden y columnas; alta, edición, baja con aviso; validación en servidor; protección si hay dependientes; todo con auditoría. Infraestructura reutilizable para los demás maestros: `lib/formularios.ts` + `components/formulario-ficha.tsx` (formulario dirigido por una lista de campos) y el patrón de `app/(app)/articulos/{campos,acciones}.ts`. Hallazgo: unos 50 SP con código son CRUD generado por plantilla y no se portan (los cubre Prisma); ver `docs/mapa-sps.md`.

### 11.3 Motor de maestros y primeros cinco maestros

Un maestro se declara con un objeto (`lib/maestros/tipos.ts`: tabla, campos, columnas, búsqueda, filtros, validaciones) y el motor da listado, ficha, alta, edición, baja, auditoría y permisos (`components/maestro/`, `lib/maestros/nucleo.ts`, una sola ruta `app/(app)/[modulo]/[[...ruta]]`). Se registran en `lib/maestros/registro.ts`. Hechos: **Bodegas** (`t_ins_bodega`), **Ubicaciones** (ubicaciones fijas por artículo y existencias por ubicación, solo consulta), **Clientes y proveedores** (`t_clientes` y sedes `t_clientes_direcciones`, con numeración automática de sede), **Tipos de caja** (`tiposdecaja`) y **Transportadores** (con tarifas). Probado de punta a punta en el navegador (validaciones, duplicados, claves foráneas, dependientes, auditoría).

Hallazgos para el diseño: (1) [corregido en 11.4] el maestro de ubicaciones es `t_ins_coordenadas`, no `T_UBICACIONES` (solo una lista de nombres que ningún SP usa); (2) los proveedores se marcan en la tabla de sedes de clientes (`isactivoproveedor`); (3) `t_clientes_direcciones.item` no es identidad: el sistema anterior numera a mano; (4) la contraseña del servicio web de cada transportador (`t_transportador.contrasena`) no se muestra ni se edita: pendiente decidir dónde y cómo se guarda cifrada. Pendiente: zonas de bodega (no hay tabla maestra; `t_zonas` es de ventas), mapas de bodega (imágenes), y mover Artículos al motor de maestros.

### 11.4 Inventario y lotes

El stock del WMS son las **cajas** (`t_pic`): saldo = entradas − salidas (columna calculada en el original), con lote y ubicación; cada lote (`t_maestro_lote_pt`) tiene un historial de estados de calidad (`t_historia_status_calidad`: Cuarentena, Aprobado, Rechazado). Pantallas en `/inventario`: **Existencias** por artículo (cajas, lotes, saldo, reservado, disponible; filtro por bodega), **Cajas** con saldo (filtros de bodega, calidad y vencimiento) y **Lotes** con su **ficha**: datos, cambio de estado de calidad, historial y cajas. Consultas en `lib/inventario/consultas.ts` (SQL directo, parámetros y orden en lista cerrada); regla de calidad en `lib/inventario/calidad.ts`, portada de `usp_ActualizarStatusCalidadLote` (lote rechazado no cambia, exige cajas generadas, exige control de liberación, aprobado solo pasa a rechazado) y atómica. Corrección al maestro de Ubicaciones: ahora incluye `t_ins_coordenadas` (ubicaciones físicas) además de las fijas y las existencias por ubicación. Índices no únicos de inventario en `scripts/legado/indices.txt` (el conversor los emite y hay migración). Datos de ejemplo para el cliente de prueba: `npm run cliente:demo-inventario -- demo [limpiar]`.

Diferencias y pendientes: (1) el saldo ERP (`V_WMS_SaldoInv`, base `CO_DLL_ADAPTER`) y las vistas de artículos del ERP no existen aquí: se usa nuestro maestro de artículos y no se compara contra el ERP; (2) el historial guarda `id_usuario = 0` porque los usuarios nuevos son UUID: el responsable queda en la auditoría; (3) el original actualizaba el control de liberación aunque rechazara el cambio, aquí es todo o nada; (4) el original comparaba estados sin distinguir mayúsculas (SQL Server) y aquí también se normaliza; (5) no hay alta manual de lotes: llegan de la recepción (módulo Aduana/entradas); (6) falta el flujo de rechazo con motivo (`t_historia_status_rechazo`), ajustes de inventario, traslados y conteos (módulo Conteo).

### 11.5 Conteo de inventario

`/conteo`: listado de conteos (número, fecha, bodega, tipo, responsable, cajas, contadas, con diferencia, estado) y ficha con **resumen, captura de cantidades, reconteo, aplicar y eliminar**. Se **programa** por bodega con alcance opcional por artículo o por prefijo de ubicación: genera una línea por caja con saldo y ubicación, con el saldo actual como teórico. Se **capturan** las cantidades de a páginas de 100 (el teórico se refresca al contar, como en el original; la diferencia = contado − teórico). **Reconteo**: conteo nuevo con las cajas que dieron diferencia. **Aplicar**: el saldo de cada caja contada pasa a ser lo contado; si es mayor sube `entradas`, si es menor sube `salidas` (nunca salidas negativas) y cada diferencia queda en `t_pic_ajuste`; todo o nada, y no se puede aplicar dos veces. Servicio en `lib/conteo/servicio.ts`; pantallas en `app/(app)/conteo/`. Estados: conteo 0 abierto / 100 aplicado; línea 0 pendiente / 1 contada; tipo 1 conteo / 2 reconteo. Probado de punta a punta (programar, validar, capturar, reconteo, aplicar, exactitud del inventario, no reaplicar, aplicar sin cantidades, eliminar, auditoría).

Diferencias con el original: (1) no se porta el SQL dinámico que el original guardaba en `lenguajeSQL` para elegir cajas (riesgo de inyección): se reemplaza por filtros cerrados y el alcance queda como texto; (2) el original, al aplicar, dejaba en cero las cajas sin contar (`salidas = entradas − 0`): aquí no se tocan; (3) la versión de aplicar con `T_PIC_Ajuste` del original estaba desactivada (`RETURN`) y con el signo de la diferencia invertido; aquí se registra el ajuste con el signo correcto; (4) los valores de `tipoConteo` del sistema anterior no se conocen: 1 y 2 son una convención nueva a revisar al migrar datos.

Pendiente: orden de ajuste al ERP (`usp_GenerarAjusteFromWMS`, escribe en `T_materiales_por_orden`), conteo de cajas multiproducto (`T_Temporal_ConteoWMS_multiproducto`), asignar varios contadores por conteo (`ID_Empleado` por línea) y el conteo desde el terminal móvil. **Aviso sobre el conversor:** las tablas `t_temporal_conteowms` y `t_temporar_encabezado_conteowms` se habían excluido por error por llamarse "temporal"; se corrigió la regla. Quedan otras 11 excluidas por nombre que conviene revisar porque los SP las usan mucho (`tmpMvtoERP` 342 usos, `T_Temporal_ConteoWMS_multiproducto` 113, `T_WMS_Temporal_Asigna_Prepacking` 52): ver `docs/mapeo-tablas.md`.

### 11.6 Revisión de las tablas excluidas por nombre

El conversor excluía las tablas que parecían temporales o de prueba (`tmp…`, `t_temporal…`, `t_prueba`…). Se midió cómo las usan los SP y se rescataron las que guardan estado real: **`t_temp_paretto_rotacion`** (resultado persistente de la clasificación Pareto/ABC de rotación, que se borra y se reescribe), **`T_Temporal_ConteoWMS_multiproducto`** (conteo de cajas con varios productos) y **`T_WMS_Temporal_Asigna_Prepacking`** (asignación de cajas a pedidos en el prepacking: se inserta, actualiza y consulta). Migración `20261119200000_tablas_rescatadas`; el esquema pasa a 100 tablas y 43 claves foráneas. Al eliminar un conteo también se borran sus líneas multiproducto.

Siguen excluidas, con motivo: `pruebaa`, `t_prueba`, `t_ver` (depuración, columnas tipo «datos/fecha» y «di/valor»); `tmpEtiquetaSsccxcaja`, `tmpImpresionesDeStatusCalidad`, `tmpStatusCalidad`, `tmpTicketesxRangoCajas` (paso intermedio de la impresión de etiquetas: en la web la etiqueta se genera al pedirla, sin tabla intermedia); `tmpMvtoERP` (movimientos contables del ERP, 109 SP; corresponde a la integración contable, no al WMS). Reglas en el conversor: `EXCLUIR` y las excepciones; la lista de tablas rescatadas está en `scripts/legado/tablas-nucleo.txt`. Si más adelante un módulo necesita alguna excluida, se agrega a esa lista y se vuelve a correr `npm run legado:tablas`.

### 11.7 Pedidos (primer módulo de Operación)

`/pedidos`: listado (número, fecha, cliente, vence, líneas, unidades pedidas/entregadas/reservadas/pendientes, estado; filtros de estado, con pendiente y vencidos) y **ficha** con datos, líneas, estado y reserva. Tablas `t_narth_encabezado_pedido` y `t_narth_serie_pedido` (las `t_encabezadopedido`/`t_seriepedido` son de la fábrica de calzado original y no se usan en el WMS). **Crear** un pedido (sede de entrega → cliente, número consecutivo `PED-000001` si no se da uno) y **editar** su cabecera mientras esté en elaboración, en espera o sin estado. **Líneas**: agregar (artículo, bodega, cantidad, precio), editar cantidad y precio, quitar; no se repite artículo+bodega; no baja de lo ya entregado. **Estados** del original: 1 Congelado, 2 Liberar espera, 3 Despacho total, 4 Despacho parcial, 5 En espera, 6 En elaboración, 7 Aprobado. Transiciones manuales en `lib/pedidos/estados.ts`; los despachos (3 y 4) los fija el sistema. **Aprobar** exige líneas con cantidad y sede, y deja quién y cuándo aprobó; un aprobado con picking asignado no se devuelve. **Reservar existencias**: por línea, el menor entre lo pendiente y lo disponible (cajas ubicadas, de lotes Aprobados y vigentes, saldo menos reservas). **Eliminar** solo en elaboración, sin picking ni entregas. Servicio en `lib/pedidos/servicio.ts`; pantallas en `app/(app)/pedidos/`. Probado de punta a punta (35 comprobaciones). Datos de ejemplo: `npm run cliente:demo-pedidos -- demo [limpiar]`.

Diferencias y supuestos: (1) la función `ufn_T_Narth_Serie_Pedido_ObtenerExistencias` no está en los scripts entregados: la regla de «disponible» es mía (ver arriba) y hay que validarla con quien opera la bodega; (2) el original ponía como reserva *todas* las existencias del artículo, aquí se limita a lo pendiente; (3) `aprobacion_cartera` y `aprueba_picking` (cartera y prepacking) no se tocan todavía: pertenecen al flujo de cartera y de prepacking; (4) el original eliminaba pedidos desde el prepacking (`spU_EliminarPedidoAntesDePrepacking`): irá con ese módulo.

Pendiente en Pedidos: **importar pedidos** desde ERP/Excel (`FrmImportacionPedidosWMS`), pedidos de comercio electrónico (`spI_tc_sg_recibepedidoecommerce`), pedidos dinámicos (`FrmGenPedidosDinamicos`), pedidos pendientes de prepacking y el consolidado de picking (módulos Prepacking y Picking), impuestos por línea, bonificaciones y kits/seriales, y la cartera.

### 11.8 Picking (planeación)

`/picking`: **Pickings** (listado con número, fecha, pedido, cliente, bodega, pickeador, líneas, unidades y estado) y **Pedidos listos para picking** (aprobados sin picking, con cuánto de lo pendiente se puede cubrir hoy). Desde un pedido listo se abre **Generar picking** (lo cubrible por artículo y datos opcionales: pickeador, transportador, observaciones). **Regla de asignación** (portada de `ufn_tbl_t_pic_first_picking` y `usp_wms_GetDetallePrepack_Fast`): por cada línea se toman cajas pickeables del **lote que vence antes (FEFO)** y, a igual vencimiento, de la **ubicación que va primero en la ruta** (`t_ins_coordenadas.nro`); se **reservan** en `t_pic.reserva`, se guardan en `t_detalle_prepack` y el pedido apunta al picking (`idpicking`). Lo que no alcanza queda como **faltante** y se avisa. Una caja es pickeable si su ubicación está registrada en la bodega y no bloqueada, su calidad es Aprobado, tiene saldo libre y el lote está vigente (salvo `confirmacertif`≠0); la misma regla se usa en el «disponible» de Pedidos (`lib/picking/pickeables.ts`). **Ficha del picking**: resumen, ruta ordenada, faltantes y enlace al pedido. **Eliminar** un picking sin ejecutar: libera reservas, borra detalle y devuelve el pedido a «En espera». Estados del picking (`valida`): 3 listo para picking, 5 listo para aduana, 7 listo para factura, 1 facturado. Servicio en `lib/picking/servicio.ts`. Probado de punta a punta (30 comprobaciones: elegibilidad, FEFO, ruta, caja en cuarentena y vencida excluidas, reservas, faltantes, sin existencias, varias bodegas, anulación, auditoría). Datos de ejemplo: `npm run cliente:demo-pedidos -- demo` (artículo `DEMOP-003`).

Diferencias y pendientes: (1) un picking es de una sola bodega y un pedido tiene un solo picking (el original manejaba órdenes de despacho y varios pickings por pedido); (2) el original rellenaba lo que no alcanzaba con una ubicación «RECIBO»: aquí queda como faltante; (3) la lista de vigencias por producto (`utiliza_lista_vigencias`) y la ruta personalizada (`ufn_tbl_ruteo_personalizado`) no se portan; (4) falta la **ejecución** del picking (confirmar cada caja, SSCC, cajas contenedoras): corresponde a Prepacking, Pallets y SSCC y Terminal móvil; (5) planeación de olas (varios pedidos en un picking, `usp_ObtenerPedidosPickingConsolidado`), picking por BIN/EXPO/orden y reasignación de pickeador; (6) la cobertura mira existencias libres hoy: no descuenta lo que otros pedidos aprobados todavía no reservaron.

### 11.9 Prepacking (ejecución del picking)

`/prepacking`: **Por pickear** (pickings en estado 3) y **Pickeados** (estado 5, listos para la aduana), con su avance de líneas. La **ficha** (`/prepacking/[id]`) muestra la ruta en orden y, por cada línea pendiente, la caja pickeada (precargada con la asignada), la cantidad (precargada con la planeada) y la **caja de despacho**. Regla portada de `spI_T_SSCCxCaja_Customized2`: al confirmar una línea se **descuenta el saldo** de la caja (`salidas`), se **libera la reserva** de la línea, se deja el **registro SSCC** (`t_ssccxcaja`, con la ubicación de salida y la de origen) y la línea pasa a «pickeada» (`estadolinea` 3). Se puede pickear de **otra caja** que la asignada (debe ser pickeable y tener libre lo que se saca; la reserva de la asignada se libera) y **menos** de lo planeado (no más). Una caja que se vacía pierde su reserva y, si no es recargable, sale de su ubicación; una ubicación sin cajas queda con ocupación 0. Con todas las líneas pickeadas, el picking pasa a **Listo para aduana** (valida 5) y aparece un resumen de **cajas de despacho**. **Revertir** una línea (error del operario): devuelve el saldo, vuelve a reservar la caja asignada, borra el SSCC y devuelve el picking a «Listo para picking»; no se puede si ya hay cajas aduanadas. **Pickear todo como se planeó** confirma las pendientes de una vez. Servicio en `lib/prepacking/servicio.ts`. Probado de punta a punta (cuarentena y vencida no sirven de sustituta, validaciones, pickeo corto con caja sustituta, reservas, finalización, revertir, bloqueo por aduana, auditoría). Dato de prueba de aduana: `npm run cliente:aduana-demo -- demo <picking> poner|quitar`.

Diferencias y pendientes: (1) el original disparaba un resurtido automático (`usp_programaResurtidoExpress`) cuando una caja de picking se vaciaba: no se porta (módulo de reabastecimiento); (2) al revertir, si la caja asignada ya no tiene libre lo reservado, se rechaza con motivo; (3) el empleado que pickea no se guarda en `marca` (los usuarios nuevos son UUID); queda en la auditoría; (4) no hay lectura por código de barras ni terminal móvil: la confirmación es por teclado (el escáner escribe en el campo); (5) pendiente: **aduana** (verificación y empaque en `t_aduana_wms_pos` con tipo de caja y peso), **cajas contenedoras**, **pallets y SSCC** impresos, **etiquetas**, y cambiar la cantidad de una línea después de planeada (`spU_ActualizaCantidadRealPrepacking`).

**Corrección transversal de formularios.** Con `<form action={…}>` React 19 vacía los campos al terminar la acción, aunque falle: quien se equivoca perdía lo escrito (en el conteo, hasta 100 cantidades). Se creó `components/usar-envio.ts` (envío con `onSubmit`, sin reinicio) y se aplicó en conteo, pedidos (líneas), picking (generar), calidad de lotes y prepacking. Los formularios dirigidos por campos (`formulario-ficha.tsx`) ya conservaban lo escrito. Regla para el futuro: no usar `<form action>` con campos no controlados donde un error de validación no deba borrar lo escrito.

### 11.10 Aduana

`/aduana`: **Por aduanar** (pickings pickeados por completo, valida 5) y **Aduanados** (valida 7, listos para factura), con lo pickeado, lo empacado y las cajas. La **ficha** (`/aduana/[id]`) muestra, por artículo, lo pickeado, lo ya empacado y lo que falta, con un formulario para empacar (caja y cantidad), y debajo las **cajas armadas** con su tipo, su peso y sus renglones. Tabla `t_aduana_wms_pos`. **Reglas** (de `spI_T_Aduana_WMS_POS_xPedido`): el artículo debe haberse pickeado; nunca se empaca más de lo pickeado; una caja es de un solo tipo (los tipos salen de Maestros › Tipos de caja); peso del renglón = cantidad × peso del artículo. **Atajos**: «Empacar todo en una caja» (como `usp_EstableceAutoAduanagMDC2`) y «Empacar como se pickeó» (respeta las cajas de despacho indicadas al pickear y lo ya empacado, de forma determinista), además de **Quitar** un renglón y **Reiniciar aduana**. **Terminar** (de `usp_TerminarAduanaDePicking_AduanaNew`): exige que lo empacado de cada artículo iguale lo pickeado; deja `saldoaduana` = lo pickeado, `cantidadaduanada` en el SSCC, los lotes de cada renglón (como `ActualizaLoteTerminaAduana`) y pasa el picking a **Listo para factura** (valida 7); desde ahí la aduana es de solo lectura y Prepacking ya no permite revertir. Servicio en `lib/aduana/servicio.ts`. Probado de punta a punta (30 comprobaciones: validaciones, tipos, pesos, faltantes, quitar, atajos, reiniciar, terminar, solo lectura, 404, auditoría).

Diferencias y pendientes: (1) el original validaba contra el ERP (`TDA_WMS_DPK`, estado de transferencia) antes de quitar un renglón: no se porta; (2) el usuario de aduana (`idusuarioaduana`) no se guarda (los usuarios nuevos son UUID): queda en la auditoría; (3) el peso sale de `t_detalle_referencia.hrpeso` (el original usaba el peso de la vista de artículos del ERP); (4) pendiente: etiquetas de caja y SSCC impresos, pallets (`t_pallets`), cajas master (`idcajamaster`), aduana por pedido de varios pickings (`ufn_tbl_V_WMS_AduanaxPickingxPed`), y la ubicación de aduana/muelle (`spU_T_SERIEPEDIDO_ACTUALIZAR_ADUANA`).

**Corrección en el diálogo de confirmación** (`components/boton-confirmar.tsx`): cuando la acción terminaba bien sin redirigir, el diálogo se quedaba abierto; ahora se cierra.

### 11.11 Despacho y guías (cierre del flujo de Operación)

`/despacho`: **Por despachar** (pickings con la aduana terminada y sin guía) y **Guías** (con filtros de estado y transportador). **Despachar** un picking (`/despacho/despachar/[id]`) muestra lo que sale (destinatario, cajas, unidades, peso, valor de la mercancía) y pide el transportador (viene el del picking), y opcionalmente factura, valor declarado, flete y comentario. Al confirmar, en una sola transacción: se toma el **siguiente consecutivo de guía del transportador** (`t_transportador.num_guia` + 1, con la fila bloqueada), se crea la guía (`t_guias_generadas`) con los datos de la sede y del pedido, se **descuenta lo entregado del pedido** (`udsentreg` +, `reserva` −), el pedido pasa a **Despacho total** (todo entregado) o **Despacho parcial**, y el picking queda **Despachado** (valida 1). No se puede despachar dos veces el mismo picking. **Ficha de la guía** (imprimible: el menú no sale al imprimir): datos, contenido y cajas; **Marcar enviada** → **Marcar entregada**; **Anular** solo antes de enviar (devuelve lo entregado al pedido y deja el picking listo para despachar otra vez; el consecutivo no se reutiliza). Un pedido en **Despacho parcial** vuelve a «Pedidos listos para picking» por lo que falta. El remitente sale de la configuración del cliente (`configuracion`, clave `guia.remitente`: `{nit, nombre, ciudad, codCiudad, comentario}`) o, si no existe, del nombre de la empresa. Servicio en `lib/despacho/servicio.ts`. Con esto el flujo **pedido → picking → prepacking → aduana → despacho** queda completo. Probado de punta a punta (30 comprobaciones) y regresión de los módulos anteriores.

Diferencias y pendientes: (1) la **facturación contable** (`TA_Facturacion`, `usp_ContabilizaFactura`) es del ERP: aquí la factura es un dato; (2) el flete no se calcula con las tarifas (`t_ins_tarifasdetransporte`) porque la sede no trae códigos de ciudad: se escribe a mano; (3) integraciones con transportadores por servicio web (Servientrega, Aldía), planes de despacho y monitoreo (`usp_ObtenerTblPlanDespachos`, `usp_ObtenerDsMonitoreoDespachos`), avisos de despacho y la exportación de guías (`spI_SG_TC_ExportaGuiaGenerada`) quedan para después; (4) el original actualizaba también `t_pdto_terminado` (resumen de producto terminado), que aquí no se usa; (5) la guía anulada deja el consecutivo gastado (como el original).

### 11.12 Importar pedidos

`/pedidos/importar` (botón «Importar» en Pedidos): carga varios pedidos desde una planilla **.xlsx** o un **CSV** (con coma, punto y coma o tabulador; UTF-8 o Windows-1252). **Planilla modelo** descargable (`/pedidos/importar/modelo`). Una fila por línea; las filas con el mismo número de pedido forman un pedido. Columnas obligatorias: **Pedido, Código de barras, Bodega, Cantidad**; el cliente se indica con **NIT** (y **Sede** por nombre o número si tiene varias) o solo con el número de sede; opcionales: Fecha, Vence, Orden de compra, Precio, Observaciones. Se aceptan nombres de columna alternativos y sin tildes, columnas extra (se ignoran, con aviso), fechas AAAA-MM-DD o DD/MM/AAAA y números con coma o punto decimal (`1.234,5`, `1,234.5`, `2.500`). Máximo 5 MB y 5000 filas. **Dos pasos**: *Revisar* valida todo sin escribir nada (artículos, bodegas, clientes y sedes, cantidades, precios, fechas, repetidos, números ya existentes, filas contradictorias del mismo pedido) y muestra pedido por pedido qué está listo y qué tiene errores y por qué; *Importar* vuelve a validar y crea **cada pedido en su propia transacción** (los que tienen errores se omiten y se informan; un fallo no afecta a los demás). Los pedidos quedan **En elaboración**, o **Aprobados** si se marca «Dejar los pedidos aprobados» (con quién y cuándo). Todo queda en la auditoría. Servicio en `lib/pedidos/importacion.ts`. Probado de punta a punta (35 comprobaciones con un CSV de 14 filas y 9 tipos de error, y un Excel con columnas alternativas) y regresión de Pedidos y Picking.

Diferencias y pendientes: (1) el original cargaba un archivo de texto cuyas columnas definía una tabla de metadatos del cliente (`NombreColumna`, `IsNullable`, `IsRelacion`) y la cabecera y el detalle venían en bloques separados; aquí la planilla es fija y plana, más simple de preparar; (2) el pedido de comercio electrónico (`spI_TC_SG_RecibePedidoEcommerce`) y la lectura desde el ERP (`V_WMS_EPK`) no se portan: harían falta credenciales y el formato real de esos sistemas; (3) no se crean clientes, sedes ni artículos desde la planilla: deben existir (se cargan en Maestros); (4) no hay importación de un pedido existente para modificarlo: solo altas.

### 11.13 Usuarios de prueba

`npm run cliente:usuarios-prueba -- demo` deja en el cliente de prueba seis perfiles (Supervisor de bodega, Operario de picking, Operario de aduana y despacho, Comercial, Inventarios y Consulta) y ocho usuarios, dos de ellos para casos especiales de ingreso (inactivo y con cambio de contraseña pendiente), y escribe sus credenciales en `USUARIOS-DE-PRUEBA.md` (en `.gitignore`). Cada ejecución asigna contraseñas nuevas a esos usuarios; el administrador no se toca. Verificado en el navegador: cada usuario entra o es rechazado como se espera y sus permisos abren o cierran las pantallas y los botones que dice el archivo.

### 11.14 Importar maestros desde planilla

`/importar-maestros` (índice) y `/importar-maestros/[id]` (por maestro; también con un botón «Importar» en cada lista de maestros, artículos y referencias). Sirve para **bodegas, ubicaciones, ubicaciones fijas, clientes, sedes, tipos de caja, transportadores, tarifas, artículos y referencias**. Es **genérico**: reutiliza los campos y las reglas de cada maestro (las columnas de la planilla son los campos del formulario; se aplican las mismas validaciones de longitud, números, fechas, opciones y datos que deben existir, como el NIT de un cliente al importar sedes o la bodega al importar ubicaciones). Agregar un maestro nuevo al motor lo hace importable sin más código. **Planilla modelo** descargable por maestro (`.xlsx`, obligatorios con *); la pantalla documenta cada columna y su tipo. Acepta `.xlsx` y CSV, encabezados con o sin tildes y con `*` o `(opcional)`, números con coma o punto (`1.500.000,50`), fechas AAAA-MM-DD o DD/MM/AAAA, Sí/No para casillas, y opciones por código o por «código · nombre». Columnas extra se ignoran con aviso. **Dos pasos** como en pedidos: *Revisar* (sin escribir) cuenta cuántas filas se crearán, cuántas se actualizarán y cuáles tienen errores, y *Importar* guarda fila por fila (una con error no impide las demás). **Modo**: «solo crear» (lo que ya existe es error) o «crear y actualizar», donde **una celda vacía no cambia el dato existente**. Permisos: crear (y editar para actualizar) del módulo del maestro; el índice solo muestra lo que el perfil puede crear. Una entrada de auditoría por importación. Código en `lib/maestros/importacion.ts`. Probado de punta a punta (41 comprobaciones con CSV y Excel: errores de cada tipo, actualización parcial, reglas cruzadas y permisos). Utilidad de prueba: `npm run cliente:limpiar-importados -- demo`.

Pendiente: importar **proveedores/terceros con varias sedes en una sola planilla**, **precios y listas de precios**, **existencias iniciales por ubicación** (carga de inventario inicial: es un movimiento, no un maestro, y necesita su propio flujo con auditoría y ajustes) y la **migración masiva de datos del sistema anterior**, que se hará por scripts directos a la base (sección 5 del plan).

### 11.15 Carga de inventario inicial

`/inventario/carga-inicial` (pestaña «Carga inicial» de Inventario, solo para quien tiene `inventario.crear`). Registra las existencias de arranque desde una planilla `.xlsx` o CSV: **una fila por artículo, ubicación y lote**, con la cantidad por caja y el número de cajas (opcionales: vencimiento, fecha de ingreso, NIT del proveedor, estado de calidad y un número de caja específico). Crea lo que el sistema anterior creaba al recibir: el **lote** si no existe (con su vencimiento, o sin control de vencimiento si va vacío, y su primer estado de calidad, por omisión *Aprobado*), la **entrada de cada caja** (`t_entradas_ras`) y la **caja en el inventario** (`t_pic`), y un **ajuste por caja** (`t_pic_ajuste`) con el motivo «Carga de inventario inicial» y la **referencia de la carga**. Si el lote ya existe se usa tal cual (su vencimiento y estado no se cambian desde la carga; si la fila dice otra cosa, es error). **Reglas**: artículo inventariable, bodega y ubicación existentes, la ubicación debe ser de esa bodega y no estar bloqueada, cantidades y fechas válidas, lote coherente en todas sus filas, cajas y números de caja sin repetir ni chocar con las existentes; hasta 5000 filas y 20 000 cajas. **Todo o nada**: la pantalla revisa primero (cajas, unidades, artículos, lotes nuevos, ubicaciones y resumen por artículo) y solo deja cargar si no hay errores; la carga corre en una sola transacción. **La referencia no se puede repetir**, así no se duplica el inventario subiendo dos veces el mismo archivo. **Historial** de cargas y **Deshacer**: borra las cajas, sus ajustes y los lotes que la carga creó, solo si ninguna caja se movió ni se reservó ni se ajustó, y ninguna está en un picking, un SSCC o un conteo. Auditoría de la carga y de su reversión. Código en `lib/inventario/carga.ts`. Probado de punta a punta (49 comprobaciones: errores de cada tipo, lote nuevo y existente, caja con número específico, referencia repetida, bloqueo y reversión, permisos) y regresión de Inventario y Conteo.

Pendiente: un **ajuste de inventario** manual (sumar o restar a una caja con motivo), que es lo que corresponde cuando una carga ya no se puede deshacer; recepción por entradas (`T_Entradas_RAS` desde compras/ERP); y la migración masiva del sistema anterior por scripts (sección 5).

### 11.16 Ajuste manual de inventario

`/inventario/ajustes` (pestaña «Ajustes» de Inventario, para quien tiene `inventario.editar`): lista de **todos los ajustes** de cajas (`t_pic_ajuste`) con fecha, caja, artículo, lote, saldo antes, entrada o salida, saldo después, **origen** (Manual, Conteo, Carga inicial u Otro, deducido del motivo), motivo y documento; filtros por origen y sentido; búsqueda por caja, artículo, lote, motivo o documento. **Nuevo ajuste** (`/inventario/ajustes/nuevo`): se busca la caja por su número (si hay varias con ese número, se elige) y se ve su artículo, lote, ubicación, saldo, reservado y libre; se elige **fijar el saldo en**, **sumar** o **restar**, un **motivo** de la lista (faltante, sobrante, daño o avería, baja por vencimiento, error de registro u otro, que exige detalle), un detalle y un documento de soporte opcionales; una vista previa dice a cuánto pasa la caja. **Reglas**: el saldo no puede quedar por debajo de cero ni **por debajo de lo reservado** (primero hay que liberar o eliminar el picking), y no se registran ajustes sin diferencia. Si sube, aumentan las `entradas`; si baja, aumentan las `salidas` (nunca negativas); la caja que queda en cero pierde su reserva y, si no es recargable, deja su ubicación (que queda libre si no tiene más cajas). Todo en una transacción con la caja bloqueada. Auditoría con el saldo de antes y de después. Código en `lib/inventario/ajustes.ts`. Probado de punta a punta (31 comprobaciones: reglas, vista previa, los tres modos, caja en cero, existencias, filtros, auditoría y permisos) y regresión de Inventario, Conteo y Carga inicial.

Pendiente (resuelto en 11.20): ajustes en bloque, anulación y aprobación.

### 11.17 Indicadores y reportes

`/indicadores` (permiso `indicadores.ver`; los botones de Excel, con `indicadores.exportar`). Una sola pantalla con **filtro de rango de fechas y de bodega** (por omisión, los últimos 30 días; fechas mal escritas o invertidas se corrigen solas) y **12 reportes** en tres grupos, cada uno con su tabla, un gráfico de barras (CSS, sin librerías) y su botón «Excel»; además **«Exportar todo a Excel»** (un libro con una hoja por reporte). **Operación**: productividad de picking por pickeador (líneas, unidades y ritmo por hora) y por hora del día, productividad de aduana por día, despachos por día con cumplimiento (a tiempo contra la fecha de vencimiento del pedido; no cuenta guías anuladas), fill rate por pedido (líneas y unidades entregadas contra pedidas) y pedidos por estado. **Inventario**: antigüedad por tramos, vencimientos por mes (lo vencido y los próximos 12 meses; solo lotes que controlan vencimiento), con valor al costo, y ocupación por zona. **Calidad y ajustes**: lotes con existencias por estado de calidad, ajustes por origen y motivo, y exactitud de cada conteo. Los marcados «foto de hoy» muestran el estado actual y solo respetan la bodega. Cada reporte es una definición en `lib/indicadores/reportes.ts` (columnas + consulta), así que la pantalla y el Excel salen de la misma fuente; agregar un indicador es agregar una entrada. Si un reporte falla, solo ese muestra el error. Probado de punta a punta (con un pedido despachado de ejemplo: picking, aduana, despacho y fill rate con datos; filtros extremos, descargas individual y completa, y permisos con los perfiles Consulta y Comercial).

Pendiente: productividad **por empleado** en aduana y despacho (hoy no se guarda quién empacó: los usuarios nuevos son UUID y el campo heredado es numérico; se puede sacar de la auditoría si se necesita), productividad de montacargas (`usp_dskpiproductividadmontacarga`), rotación por artículo (ventas contra existencias) y gráficos de líneas en el tiempo.

### 11.18 Pallets, SSCC y etiquetas

`/pallets` (permiso `pallets`: ver, crear = agregar cajas, editar = sacar, ubicar, abrir/cerrar e imprimir con registro, eliminar). **Pallets** (`t_pallets`, una fila por pallet y caja): lista con cajas, unidades, ubicación, estado y búsqueda por pallet, caja, ubicación, artículo o lote. **Nuevo pallet** pide el número (se sugiere el siguiente) y la primera caja. En la ficha se **agregan cajas** por número, se **sacan**, se **ubica** el pallet, se **cierra/abre** y se **elimina** (solo abierto; las cajas no se tocan). Reglas del sistema anterior: la caja debe existir, estar ubicada y tener saldo; una caja está en un solo pallet (si está en otro, se dice en cuál); un pallet cerrado no admite ni pierde cajas; la primera caja fija la ubicación y **las demás se llevan a ella**; **ubicar el pallet** mueve todas sus cajas (y su bodega), lo cierra salvo en RECIBO, y rechaza ubicaciones inexistentes, bloqueadas u **ocupadas** (posición de almacenamiento con otro pallet). Cada movimiento queda en `tgg_t_reg_movimientosdecaja` (con el pallet) y en la auditoría; todo en transacción. **Etiquetas** (`/pallets/etiquetas`, 100 × 150 mm, una por hoja al imprimir, código Code 128 con `bwip-js`): de **pallet** (número, cajas, unidades, ubicación, contenido), de **caja de inventario** por rango de números (hasta 200), con la cuenta de impresiones (`t_entradas_ras.impresa`) y aviso de **reimpresión**, y de **cajas de despacho** de un picking (una por caja armada en la aduana: pedido, N de M, destinatario y dirección de la sede, contenido con lote y vencimiento, y **SSCC de 18 dígitos** con dígito de control GS1). Código en `lib/pallets/` y `lib/etiquetas/codigos.ts`. Probado de punta a punta (29 comprobaciones: reglas de pallets, movimiento de cajas, ubicar/abrir/sacar/eliminar, etiquetas, reimpresión, 404 y permisos) y con un picking despachado de ejemplo.

Pendiente: el SSCC no usa un **prefijo de empresa GS1 propio** (hoy: extensión 0 + picking + número de caja; se guarda `0` en `t_ssccxcaja.sscc`, como antes); impresión directa a impresoras ZPL (hecha en 11.27); unificar pallets (los pallets de despacho quedaron en 11.26); y la recepción con etiquetas por orden de compra.

### 11.19 Terminal móvil

`/movil` (permiso `movil.ver`; cada operación exige además el permiso del módulo que toca). Pantallas pensadas para el **lector de código de barras** y el celular: campos grandes con foco automático, **Enter** pasa al campo siguiente y en el último envía, y tras un envío correcto se vacían los campos (menos los que se conservan, como el pallet o la caja de despacho) y el foco vuelve al primero. La pantalla de inicio solo muestra lo que el perfil puede hacer. **Consultas rápidas**: un código y el sistema distingue ubicación, caja, artículo o pallet (también se puede elegir el tipo): caja con artículo, lote, vencimiento, saldo, reservado, calidad, ubicación y pallet; ubicación con sus cajas; artículo con sus ubicaciones y lotes por vencimiento; pallet con su contenido. **Ubicar caja** (`usp_reubicarcaja`): caja y ubicación de destino; valida que exista, no esté bloqueada ni ocupada (posición de almacenamiento), saca la caja de su pallet, actualiza la ocupación de origen y destino y deja el movimiento en el registro de cajas y en la auditoría. **Pallets**: agregar cajas y ubicar el pallet, con las mismas reglas del escritorio. **Picking**: lista de pickings pendientes y, por picking, la **siguiente línea por ruta** (ubicación, artículo, lote y cantidad) para leer la caja, confirmar la cantidad y la caja de despacho; al terminar, el picking pasa a la aduana. **Conteo**: conteos abiertos y, por conteo, la siguiente caja por ubicación; se lee la caja (cualquiera del conteo) y se escribe lo contado. **Ajuste de caja**: se escribe el saldo real y un motivo. Los perfiles de prueba Operario de picking, Operario de aduana y despacho e Inventarios ahora incluyen `movil.ver` (se regeneraron los usuarios de prueba: **las contraseñas de `USUARIOS-DE-PRUEBA.md` cambiaron**). Código en `lib/movil/servicio.ts` y `app/(app)/movil/`. Probado en vista de celular (390 px) de punta a punta: 41 comprobaciones de consultas, ubicar, pallets, ajuste, conteo, picking y permisos por perfil.

Pendiente: del menú del lector original, **recepción y almacenamiento dirigido**, **resurtido y slotting**, **recargas entre cajas**, **aduana por pedido** y **relación de guía** desde el lector, **multiproducto**, **seriales**, **entrega al cliente** y **tracking**; modo sin conexión; y cámara como lector (hoy sirve el lector físico o el teclado).

### 11.20 Ajustes: aprobación, anulación y en bloque

Tres capas sobre el ajuste manual (11.16), con un submenú en `/inventario/ajustes` (Ajustes · Por aprobar con insignia de pendientes · En bloque). **Aprobación** (`/inventario/ajustes/por-aprobar`): un **umbral** en unidades (configuración `ajustes.aprobacion`, cero = sin aprobación). Si la diferencia de un ajuste manual lo supera y quien ajusta **no puede aprobar**, el ajuste no se aplica: queda como **solicitud pendiente** (tabla nueva `ajuste_solicitud`, migración `20261120120000`) con el saldo del momento. Aprobador = quien tiene el permiso **eliminar** de Inventario (no se agregó un permiso nuevo): aprueba (el ajuste se aplica contra el saldo de hoy y el motivo dice quién lo pidió y quién lo aprobó) o rechaza con una nota obligatoria; el solicitante ve el estado. Aplica igual al ajuste de la terminal móvil. Quien puede aprobar nunca pasa por aprobación. **Anulación** (ficha `/inventario/ajustes/[id]`, solo para aprobadores): solo ajustes manuales; se registra un **ajuste contrario** «Anulación del ajuste #N: razón» (razón obligatoria) y el original queda marcado «Anulado»; no se anula una anulación ni dos veces, y si el saldo actual ya no permite revertirlo (porque se pickeó o reservó) lo dice con el saldo real. Los de conteo y carga inicial no se anulan aquí. **En bloque** (`/inventario/ajustes/en-bloque`): planilla `.xlsx`/CSV con **Caja, Saldo real, Motivo** (más Detalle y Documento), hasta 2000 filas; se **revisa** (artículo, saldo antes, diferencia y errores por fila: caja inexistente o repetida, sin diferencia, motivo inválido, «Otro» sin detalle, por debajo de lo reservado, y diferencias sobre el umbral para quien no aprueba) y se **aplica todo o nada** con una referencia que queda en el motivo y el documento de cada ajuste. La lista de ajustes ahora enlaza a la ficha y muestra los orígenes Anulación y la etiqueta Anulado. Código en `lib/inventario/aprobacion.ts` (el ajuste se refactorizó en `ajustarCajaTx` para reutilizarlo dentro de una transacción). Probado de punta a punta (42 comprobaciones con los perfiles Administrador, Inventarios y Consulta, más la regresión de 30 del ajuste manual).

Pendiente: un permiso propio de «aprobar ajustes» en lugar de reutilizar eliminar, umbral por valor monetario o por artículo, aprobación para las planillas en bloque (hoy se rechazan las filas sobre el umbral), y notificar al solicitante.

### 11.21 Recepción y almacenamiento dirigido

**Recepción** (`/inventario/recepcion`, pestaña «Recepción» de Inventario, permiso `inventario.crear`): se registra un documento (orden de compra, remisión o factura), la bodega, el NIT del proveedor (opcional) y la **calidad de los lotes nuevos** (por omisión Cuarentena); cada línea lleva artículo, lote, vencimiento (vacío = sin control), número de cajas y cantidad por caja. Crea el **lote** si no existe (con su primer estado de calidad), y **una caja por rótulo** (`t_entradas_ras` + `t_pic`) en la **ubicación de recibo** de la bodega (la que se llama RECIBO o RECEPCION), con el movimiento «RECEPCION» en el registro de cajas. Reglas: documento de 3 a 40 caracteres, artículo existente e inventariable, lote obligatorio, cajas de 1 a 1000 (máximo 2000 por recepción y 50 líneas), cantidad mayor que cero, no se reciben lotes vencidos, un lote existente conserva su vencimiento y su calidad (un vencimiento distinto es error), bodega abierta y con ubicación de recibo no bloqueada. Todo o nada. Al terminar se enlazan las **etiquetas** de las cajas y el historial de **recepciones recientes** muestra cuántas cajas faltan por almacenar. **Almacenamiento dirigido** (`/inventario/almacenar`, permiso `inventario.editar`; y `/movil/almacenar` para el lector): lista las cajas con saldo que están en el recibo y sugiere dónde guardarlas, en este orden: la **ubicación fija del artículo** (maestro de ubicaciones fijas), una ubicación donde **ya está el mismo lote** y la **posición libre más cercana** por la ruta de la bodega (se excluyen recibo, despacho, averiados, ajuste, reclamos, novedad y ubicaciones bloqueadas). Se puede escribir otra ubicación (se acepta y el registro dice que no era la sugerida); no se admite otra ubicación de recibo ni almacenar una caja que ya salió del recibo. Mover la caja usa la misma regla de «Ubicar caja» (ubicación existente, no bloqueada ni ocupada, sale de su pallet, ocupación de origen y destino) con el movimiento «ALMACENA DIRIGIDO». Código en `lib/recepcion/servicio.ts`. Probado de punta a punta (31 comprobaciones de escritorio, lector y permisos).

Pendiente (la orden de compra quedó resuelta en 11.23): recibir por **pallet completo**, **recibo ciego** con diferencias contra lo esperado, recepción desde el lector, y almacenamiento de **cajas multiproducto**.

### 11.22 Resurtido

`/inventario/resurtido` (pestaña «Resurtido» de Inventario, permiso `inventario.editar`; submenú Tareas · Reglas) y `/movil/resurtido`. Mantiene abiertas las ubicaciones de picking. **Reglas** (tabla nueva `resurtido_regla`, migración `20261120180000`): para un artículo en una ubicación de picking, un **mínimo** y un **máximo** (crear exige `inventario.crear`, eliminar `inventario.eliminar` y cancela sus tareas pendientes; valida artículo, ubicación de esa bodega y máximo mayor que mínimo; una regla por artículo y ubicación). **Necesidades**: cuando lo **libre** de la ubicación (saldo menos reservado) **más lo que ya viene en tareas pendientes** llega al mínimo, falta (máximo − libre − en camino) y se proponen **cajas completas** del almacenamiento hasta cubrirlo. Las candidatas son cajas aprobadas, vigentes, **sin reservas**, de ubicaciones de almacenamiento (rotación 1) no bloqueadas y fuera de recibo, despacho, averiados, ajuste, reclamos y novedad, y sin otra tarea pendiente; se ordenan **FEFO** (vence antes primero) y por ruta. **Generar tareas** (`resurtido_tarea`, con caja, cantidad, origen y destino) es idempotente: no duplica lo que ya viene en camino ni reparte la misma caja entre dos reglas, y avisa si una regla no tiene cajas disponibles. Cada tarea se cumple en escritorio («Hecha») o con el **lector**: muestra de dónde tomar la caja y a dónde llevarla (en orden de ruta), pide leer la caja correcta y la ubicación de picking correcta, y **mueve la caja y cierra la tarea en una sola transacción** (si la caja ya no tiene saldo o quedó reservada, lo dice y se cancela la tarea). También se puede cancelar a mano. Movimiento «RESURTIDO» en el registro de cajas y auditoría de generación, cumplimiento, cancelación y reglas. La reubicación se refactorizó en `reubicarCajaTx` (`lib/movil/servicio.ts`) para reutilizarla dentro de la transacción de la tarea. Código en `lib/resurtido/servicio.ts`. Probado de punta a punta (29 comprobaciones: reglas, necesidades, FEFO, exclusiones, idempotencia, escritorio, lector y permisos) y regresión del lector (32 comprobaciones).

Pendiente: **recarga parcial entre cajas** (`spI_RecargaEntreCajas`, mover solo una cantidad a una caja recargable), resurtido **por pallet completo**, **disparo automático** al pickear (hoy se pulsa «Generar tareas»), mínimos y máximos por **días de cobertura**, el control del original de no mezclar en picking cajas con vencimiento anterior, y resurtido de picking **multiproducto**.

### 11.23 Órdenes de compra y recepción contra la orden

**Órdenes de compra** (`/inventario/ordenes`, pestaña de Inventario; ver = `inventario.ver`, crear/importar = `inventario.crear`, cerrar = `inventario.editar`, anular = `inventario.eliminar`). Usa las tablas del sistema anterior, `t_orden_compra` y `t_detalle_orden_compra`, así que los datos migrados encajan: la orden tiene proveedor (NIT de un tercero existente), fecha, observaciones y estado **Abierta → Parcial → Cerrada** (o **Anulada**); cada línea, un artículo (existente, inventariable y sin repetirse en la orden), la bodega de recibo, la cantidad pedida, lo recibido, lo pendiente y el precio. **Nueva orden** (formulario con líneas) e **Importar** desde planilla (`.xlsx`/CSV: Orden, NIT proveedor, Bodega, Fecha esperada, Código de barras, Cantidad, Precio, Observaciones; una fila por línea, las filas con el mismo número forman una orden; se revisa primero y cada orden se crea por separado; el número de la planilla queda en las observaciones y el sistema asigna el número de orden). Esta importación es la vía para traer las órdenes del ERP. La **ficha** muestra el avance por línea, las recepciones hechas (con el enlace a las etiquetas de esas cajas) y permite **cerrar con lo que falta** (razón obligatoria) o **anular** (razón obligatoria, solo si no recibió nada). **Recepción contra la orden** (`/inventario/recepcion?oc=N`, o «Recibir mercancía» en la ficha; la recepción libre sigue igual y lista las órdenes por recibir): el documento, el proveedor y la bodega salen de la orden y las líneas llegan prellenadas con lo pendiente; por cada línea se indican lote, vencimiento, cajas y cantidad por caja. Reglas, todo en la misma transacción que crea las cajas: el artículo debe estar en la orden, **no se recibe más de lo pendiente** (con una tolerancia opcional en porcentaje, configuración `recepcion.tolerancia`, hoy sin pantalla), una orden cerrada o anulada no admite recepciones y la bodega debe ser la de la orden; los lotes nuevos toman el NIT de la orden. La línea baja su pendiente, la orden pasa a Parcial y, al quedar todo recibido, a **Cerrada** con su fecha de cierre. Código en `lib/compras/ordenes.ts` y `lib/recepcion/servicio.ts`. Probado de punta a punta (40 comprobaciones: creación con errores, importación, recepción parcial y completa, exceso, artículo fuera de la orden, cierre, anulación y permisos) y la recepción libre.

Pendiente (editar y recibo ciego quedaron en 11.25): pantalla para la **tolerancia** de recepción, **precio y costo** al recibir (hoy el precio de la orden no pasa al artículo), recibir por **pallet** completo y **devoluciones** a proveedor (la recepción desde el lector quedó en 11.24).

### 11.24 Recibir desde el lector

`/movil/recepcion` (opción «Recibir», permiso `inventario.crear`): lista las órdenes de compra por recibir (con lo que falta) y, por orden, muestra lo **pendiente por artículo** y un formulario para el lector: código de barras del artículo, lote, vencimiento (opcional: vacío si no vence), número de cajas y cantidad por caja. Cada envío es una recepción completa contra la orden, con las mismas reglas del escritorio y en una transacción: el artículo debe estar en la orden, no se recibe más de lo pendiente, no se reciben lotes vencidos y cajas debe ser un entero; las cajas quedan en la ubicación de recibo con la calidad inicial (Cuarentena, o la de la configuración `recepcion.calidad_inicial`), y al terminar la última línea la orden se cierra y lo dice. Tras cada lectura se vacían los campos y la pantalla actualiza lo pendiente. Las cajas recibidas aparecen enseguida en «Almacenar». El campo de vencimiento hizo opcionales los campos del formulario de lector (`opcional` en `Escaner`). Probado en vista de celular (17 comprobaciones, incluidos los errores, la orden completa y los permisos).

Pendiente: imprimir las **etiquetas** de lo recibido desde el lector (hoy se imprimen desde el escritorio), recibir **sin orden** desde el lector, y leer el **lote y el vencimiento** de un código GS1-128 en vez de escribirlos.

### 11.25 Editar órdenes de compra y recibo ciego

**Editar una orden** (`/inventario/ordenes/[numero]/editar`, botón «Editar» de la ficha, permiso `inventario.editar`; solo órdenes Abiertas o Parciales): se cambian proveedor, bodega, fecha esperada, observaciones y las líneas (cantidades, precios, líneas nuevas o quitadas). **Lo ya recibido protege la orden**: no se quita una línea con recibo, no se baja su cantidad por debajo de lo recibido y, con recibo, no cambian el proveedor ni la bodega (los campos aparecen bloqueados). El estado se recalcula: si lo pedido queda igual a lo recibido, la orden se **cierra**; si hay recibo, queda Parcial; si no, Abierta. Código: `editarOrden` en `lib/compras/ordenes.ts`; el formulario de nueva orden se reutiliza. **Recibo ciego** (`/inventario/recepcion?oc=N&ciego=1`, botón «Recibo ciego» de la orden, permiso `inventario.crear`; pestaña «Recibos ciegos»): quien recibe **cuenta sin ver lo que se esperaba** (no aparecen cantidades de la orden) y registra lote, vencimiento, cajas y cantidad por caja de cada artículo; el conteo queda **por conciliar** (tablas nuevas `recibo_ciego` y `recibo_ciego_linea`, migración `20261120210000`) y **no crea inventario ni toca la orden**. En `/inventario/recibos/[id]` se concilia: por artículo, lo pedido, lo que faltaba, lo contado y la **diferencia** (faltante, exceso o «Cuadra»), con el aviso de los artículos que no están en la orden. Quien tiene el permiso **eliminar** de Inventario **autoriza** (con una nota obligatoria si hay diferencias; se crean las cajas en el recibo y se descuenta de la orden **aunque haya exceso**, que queda registrado, todo en una transacción) o **rechaza** (nota obligatoria, no pasa nada y hay que recontar). Un artículo que no está en la orden bloquea la autorización hasta editar la orden o rechazar. No se cuenta contra órdenes cerradas o anuladas. Código en `lib/compras/recibo-ciego.ts`; `recibir` ahora puede ejecutarse dentro de una transacción ajena y permitir exceso. De paso, en la recepción contra una orden, las líneas con solo el código prellenado ya no cuentan como líneas a recibir. Probado de punta a punta (33 comprobaciones: edición con y sin recibo, cierre por edición, conteo ciego, diferencias, exceso, rechazo, artículo fuera de la orden y permisos).

Pendiente: contar a ciegas desde el **lector**, comparar contra el **aviso de despacho** del proveedor, aprobación por **umbral de diferencia** (hoy autoriza cualquier aprobador), **recontar** una línea sin rechazar todo el conteo y editar el **precio** con historial.

### 11.26 Pallets de despacho

`/pallets/despacho` (pestaña «Pallets de despacho» de Pallets y SSCC; permisos del módulo `pallets`: crear = crear el pallet y agregar cajas, editar = sacar, cerrar y abrir, eliminar; despachar exige además `despacho.crear`). Agrupa las **cajas de despacho** que armó la aduana (`t_aduana_wms_pos`) para cargarlas juntas; en el sistema anterior se usaba `t_pallets` con un prefijo «F» y el número de picking, aquí hay tablas propias (`pallet_despacho` y `pallet_despacho_caja`, migración `20261120230000`) donde **una caja de un picking está en un solo pallet**. Flujo: **crear** el pallet (bodega) → **agregar** cajas por picking (todas las cajas libres del picking, o las que se indiquen como `1, 2, 3`; la pantalla lista los pickings listos para cargar de esa bodega, con la aduana terminada y sin despachar) → **cerrar** con alto, ancho, largo y peso (el peso vacío toma la suma de las cajas; abrir y cerrar de nuevo conserva las medidas) → **etiqueta SSCC del pallet** (100 × 150 mm: número, bodega, cajas, peso, medidas, clientes y pedidos que lleva, transportador y SSCC de 18 dígitos con extensión 1 y dígito de control) → **despachar** con transportador, remesa, placa y comentario. Reglas: un pallet abierto admite y pierde cajas, uno cerrado no; el picking debe ser de la bodega del pallet, estar listo para despachar y tener esas cajas; un pallet cerrado se puede abrir y uno no despachado se puede eliminar (las cajas quedan libres); hasta 300 cajas por pallet. **Al despachar el pallet se genera la guía de cada picking que quedó completo** (todas sus cajas están en pallets ya despachados) con el flujo normal de Despacho y guías (descuenta del pedido, consecutivo del transportador, estado del pedido), con el pallet, la remesa y la placa en el comentario; un **picking partido** entre varios pallets («Partido» en la ficha) recibe su guía cuando se despacha el último pallet que lleva sus cajas, y los que fallen quedan listados para generarlos desde Despacho. Código en `lib/pallets/despacho.ts`. Probado de punta a punta (26 comprobaciones con tres pickings aduanados reales, uno partido en dos pallets: reglas, medidas, etiqueta, despachos escalonados, guías y permisos).

Pendiente: (el lector ya está en 11.28) **unificar** pallets de despacho, **planilla de carga** (lista de empaque por pallet para el transportador), validar el **peso** contra la capacidad del vehículo y guía **única por pallet** (hoy es una por picking, como en el despacho normal).

### 11.27 Impresión directa de etiquetas (ZPL)

Las cuatro etiquetas de 100 × 150 mm (cajas de despacho con SSCC, cajas de inventario, pallets de inventario y pallets de despacho) se pueden mandar **directo a una impresora Zebra** (o compatible con ZPL) además de imprimirlas desde el navegador. Generador en `lib/etiquetas/zpl.ts` (funciones puras; 203 y 300 dpi; UTF-8 con `^CI28`, datos escapados con `^FH` para que `^`, `~` o `_` en un lote no rompan la etiqueta; Code 128 centrado; textos con ancho y líneas máximas para que nada se salga) y servicio en `lib/etiquetas/impresion.ts` (arma el ZPL por tipo, un solo trabajo para varias etiquetas, envío por **TCP al puerto 9100** con tiempo de espera de 5 s y mensajes claros: conexión rechazada, equipo no encontrado, no alcanzable).

**Impresoras** (`/pallets/impresoras`, pestaña «Impresoras»; tabla propia `impresora_etiquetas`: nombre, dirección, puerto, resolución, activa): registrar, activar/desactivar y eliminar requieren `pallets.eliminar`; **probar** (etiqueta de prueba) y **imprimir** requieren `pallets.editar`. El usuario solo elige de la lista; nunca escribe una dirección al imprimir (la dirección se valida: IP o nombre de equipo, sin esquema, sin 169.254.x.x). En cada etiqueta hay un selector de impresora (recuerda la última en ese equipo), **Imprimir directo** y **Descargar ZPL** (`/pallets/zpl?tipo=…`, permiso `pallets.ver`, para imprimir con otra herramienta). Las cajas de inventario impresas directo quedan marcadas como impresas (reimpresiones) igual que desde el navegador, y cada envío queda en la auditoría.

Probado contra una impresora simulada por TCP: etiqueta de prueba, dos etiquetas de despacho en un trabajo (acentos y `^` correctos), cajas de inventario a 300 dpi con marcado de reimpresión, pallet de despacho, error con la impresora apagada, referencias inválidas rechazadas.

Pendiente: no se ha probado en una impresora física (conviene ajustar márgenes y tamaños de letra con papel real); **ZPL guardado por plantilla** editable por el cliente (`tbltextoimprimezpl` del original); impresión desde el **lector**; cola de impresión con reintentos; impresión de etiquetas de ubicaciones; impresoras por usuario o por estación.

### 11.28 Pallets de despacho desde el lector

`/movil/despacho` (opción «Pallets de despacho» del terminal móvil, módulo `pallets`): se **abre un pallet** leyendo su etiqueta (SSCC de pallet, extensión 1) o escribiendo su número, se **crea uno nuevo** eligiendo la bodega (`pallets.crear`) y se ve la lista de pallets abiertos y cerrados. En `/movil/despacho/[id]`: **Cargar caja** (`pallets.crear`), **Sacar caja** y **Cerrar pallet** con peso opcional (`pallets.editar`; si no se da el peso se usa la suma del peso empacado y se conservan las medidas ya guardadas) y **Volver a abrir** un pallet cerrado. Resumen de cajas cargadas y avance por picking (cargadas / total).

La caja se lee por el **SSCC de su etiqueta** (`lib/etiquetas/codigos.ts`: `leerSsccCaja` y `leerSsccPallet`), que ya lleva el picking y el número de caja: acepta el código con «(00)», espacios o guiones y rechaza largo distinto de 18, dígito de control malo o extensión equivocada. Se reusan las reglas de `lib/pallets/despacho.ts` (picking listo para cargar, misma bodega, caja existente, no repetida en otro pallet, máximo 300 cajas). Despachar, imprimir la etiqueta y dar medidas siguen en el escritorio. Cada operación queda en la auditoría con origen «terminal móvil».

Probado en el navegador: crear pallet, cargar con y sin «(00)», caja repetida, dígito de control malo, caja inexistente, sacar, cerrar con peso, reabrir y abrir el pallet por su SSCC.

Pendiente: **despachar** desde el lector, leer la caja por número de picking y caja (no solo SSCC), validar que el pallet lleve **todas** las cajas de un picking antes de cerrar, sonido o vibración de confirmación, y cargar varios pallets a un mismo vehículo (planilla de carga).

