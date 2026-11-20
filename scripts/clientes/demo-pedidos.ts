import "dotenv/config";
import { Client } from "pg";
import { clientePorSlug, poolControl, urlConexion } from "../../src/lib/nucleo/control";

// npm run cliente:demo-pedidos -- <codigo> [limpiar]
// Datos de ejemplo para probar Pedidos en un cliente de PRUEBA: un cliente con dos sedes, una bodega, un artículo con
// existencias en lotes aprobado y en cuarentena, y dos pedidos ya avanzados (uno con picking, otro despachado).

const P = "DEMOP";

async function main() {
  const [slug, accion] = process.argv.slice(2);
  if (!slug) throw new Error("Uso: npm run cliente:demo-pedidos -- <codigo> [limpiar]");
  const c = await clientePorSlug(slug);
  if (!c) throw new Error(`No existe el cliente "${slug}".`);
  const db = new Client({ connectionString: urlConexion(c, "migrador") });
  await db.connect();
  const q = (sql: string, p: unknown[] = []) => db.query(sql, p);
  try {
    await q("BEGIN");
    const pickings = "SELECT idmovimiento FROM t_encabezado_prepack WHERE bodegapicking = $1 OR nitprepack = $2";
    await q(`DELETE FROM t_guias_generadas WHERE prepackingid IN (${pickings})`, [P, `${P}-1`]);
    await q(`DELETE FROM t_aduana_wms_pos WHERE numpicking IN (${pickings})`, [P, `${P}-1`]);
    await q(`DELETE FROM t_ssccxcaja WHERE idprepack IN (${pickings})`, [P, `${P}-1`]);
    await q("DELETE FROM t_detalle_prepack WHERE product LIKE $1", [`${P}%`]);
    await q("DELETE FROM t_encabezado_prepack WHERE bodegapicking = $1 OR nitprepack = $2", [P, `${P}-1`]);
    await q("DELETE FROM t_narth_serie_pedido WHERE numpedido LIKE $1 OR ref LIKE $2", [`${P}%`, `${P}%`]);
    await q("DELETE FROM t_narth_encabezado_pedido WHERE npedido LIKE $1 OR cliente = $2", [`${P}%`, `${P}-1`]);
    await q("DELETE FROM t_pic WHERE lote LIKE $1", [`${P}%`]);
    await q("DELETE FROM t_historia_status_calidad WHERE lote LIKE $1", [`${P}%`]);
    await q("DELETE FROM t_entradas_ras WHERE lote_orden LIKE $1", [`${P}%`]);
    await q("DELETE FROM t_maestro_lote_pt WHERE loteproveedor LIKE $1", [`${P}%`]);
    await q("DELETE FROM t_ins_coordenadas WHERE ubicacion LIKE $1", [`${P}%`]);
    await q("DELETE FROM t_detalle_referencia WHERE productoean LIKE $1", [`${P}%`]);
    await q("DELETE FROM t_clientes_direcciones WHERE nit = $1", [`${P}-1`]);
    await q("DELETE FROM t_clientes WHERE nit = $1", [`${P}-1`]);
    await q("DELETE FROM t_ins_bodega WHERE bodega = $1", [P]);
    if (accion === "limpiar") {
      await q("COMMIT");
      console.log("Datos de ejemplo de pedidos eliminados.");
      return;
    }
    await q("INSERT INTO t_clientes (nit, nombrecliente, ciudad, activo) VALUES ($1,'Droguería Demo S.A.S.','Bogotá',1)", [`${P}-1`]);
    await q("INSERT INTO t_clientes_direcciones (item, nit, nombrecliente, direccion, ciudad, activo) VALUES (990001,$1,'Sede Centro','Cra 7 # 12-34','Bogotá',1), (990002,$1,'Sede Norte','Calle 100 # 15-20','Bogotá',1)", [`${P}-1`]);
    await q("INSERT INTO t_ins_bodega (bodega, descripcion, prcierre) VALUES ($1,'Bodega de pedidos demo',false)", [P]);
    await q("INSERT INTO t_detalle_referencia (productoean, descripcion, um1, inventariable, estado) VALUES ($1,'Acetaminofén 500 mg x 100','CAJA',1,0), ($2,'Ibuprofeno 400 mg x 50','CAJA',1,0), ($3,'Loratadina 10 mg x 30','CAJA',1,0)", [`${P}-001`, `${P}-002`, `${P}-003`]);
    await q("UPDATE t_detalle_referencia SET hrpeso = 0.5 WHERE productoean = $1", [`${P}-003`]);
    await q("INSERT INTO t_ins_coordenadas (ubicacion, fila_piso, columna_piso, piso, posicion_x, posicion_z, bodegac, prioridadrotacion, zonapiso, nro) VALUES ($1,'A','1','1','1','1',$3,'ALTA','Z1',10), ($2,'B','1','1','1','1',$3,'ALTA','Z2',5)", [`${P}-A1`, `${P}-B1`, P]);
    // Artículo DEMOP-003, para probar el picking: dos lotes aprobados con distinto vencimiento (FEFO), uno en cuarentena y uno vencido.
    // Con igual vencimiento, la ruta manda: B1 (nro 5) va antes que A1 (nro 10).
    const lotes3: [string, string, number, [number, number, string][]][] = [
      [`${P}-P1`, "Aprobado", 30, [[920001, 40, "B1"]]],
      [`${P}-P2`, "Aprobado", 200, [[920002, 50, "A1"], [920003, 30, "B1"]]],
      [`${P}-P3`, "Cuarentena", 200, [[920004, 100, "A1"]]],
      [`${P}-P4`, "Aprobado", -10, [[920005, 60, "A1"]]],
    ];
    for (const [lote, est, dias, cajas] of lotes3) {
      await q("INSERT INTO t_maestro_lote_pt (loteproveedor, nitprov, codean, fechaingresa, fechavence, confirmacertif) VALUES ($1,'900111222',$2, now() - interval '60 days', now() + ($3 || ' days')::interval, 0)", [lote, `${P}-003`, String(dias)]);
      await q("INSERT INTO t_historia_status_calidad (lote, productoean, fecha_registro, estado, id_usuario, saldo) VALUES ($1,$2,now(),$3,0,0)", [lote, `${P}-003`, est]);
      for (const [caja, cant, u] of cajas) {
        await q("INSERT INTO t_entradas_ras (cajano, producto, lote_orden, describteetiqueta, operadorras, brecibe) VALUES ($1,$2,$3,'Etiqueta demo',$4,$5)", [caja, `${P}-003`, lote, est, P]);
        await q("INSERT INTO t_pic (cod_producto, bodepicking, cajap, lote, ubicacion, entradas, salidas, reserva) VALUES ($1,$2,$3,$4,$5,$6,0,0)", [`${P}-003`, P, caja, lote, `${P}-${u}`, cant]);
      }
    }
    const lotes: [string, string, number, number[][]][] = [
      [`${P}-L1`, "Aprobado", 200, [[910001, 120], [910002, 50]]],
      [`${P}-L2`, "Cuarentena", 200, [[910003, 100]]],
    ];
    for (const [lote, est, dias, cajas] of lotes) {
      await q("INSERT INTO t_maestro_lote_pt (loteproveedor, nitprov, codean, fechaingresa, fechavence, confirmacertif) VALUES ($1,'900111222',$2, now() - interval '3 days', now() + ($3 || ' days')::interval, 0)", [lote, `${P}-001`, String(dias)]);
      await q("INSERT INTO t_historia_status_calidad (lote, productoean, fecha_registro, estado, id_usuario, saldo) VALUES ($1,$2,now(),$3,0,0)", [lote, `${P}-001`, est]);
      for (const [caja, cant] of cajas) {
        await q("INSERT INTO t_entradas_ras (cajano, producto, lote_orden, describteetiqueta, operadorras, brecibe) VALUES ($1,$2,$3,'Etiqueta demo',$4,$5)", [caja, `${P}-001`, lote, est, P]);
        await q("INSERT INTO t_pic (cod_producto, bodepicking, cajap, lote, ubicacion, entradas, salidas, reserva) VALUES ($1,$2,$3,$4,$5,$6,0,0)", [`${P}-001`, P, caja, lote, `${P}-A1`, cant]);
      }
    }
    // Pedidos ya avanzados, para probar las reglas de estado.
    await q("INSERT INTO t_narth_encabezado_pedido (autonped, npedido, cliente, nitvble, fechapedido, fechavence, busca_aprobacion, idpicking, registradopor) VALUES (990001,$1,$3,990001, now(), now() + interval '10 days', 7, 55, 'Sistema'), (990002,$2,$3,990002, now(), now() - interval '5 days', 3, 0, 'Sistema')", [`${P}-CON-PICKING`, `${P}-DESPACHADO`, `${P}-1`]);
    await q("INSERT INTO t_narth_serie_pedido (numpedido, ref, bodega, pares, udsentreg, reserva, precio_unitario, ordenpdn) VALUES ($1,$3,$4,10,0,10,2500,0), ($2,$3,$4,20,20,0,2500,0)", [`${P}-CON-PICKING`, `${P}-DESPACHADO`, `${P}-001`, P]);
    await q("COMMIT");
    console.log("Datos de ejemplo de pedidos cargados (cliente DEMOP-1 con 2 sedes, bodega DEMOP, artículos DEMOP-001/002, 170 disponibles y 100 en cuarentena, 2 pedidos de ejemplo).");
  } catch (e) {
    await q("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    await db.end();
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => poolControl().end());
