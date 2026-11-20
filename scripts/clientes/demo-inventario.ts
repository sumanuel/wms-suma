import "dotenv/config";
import { Client } from "pg";
import { clientePorSlug, poolControl, urlConexion } from "../../src/lib/nucleo/control";

// npm run cliente:demo-inventario -- <codigo> [limpiar]
// Carga (o quita) datos de ejemplo de inventario en la base de un cliente de PRUEBA: bodega, artículos, ubicaciones,
// lotes con distintos estados y cajas con saldo. Sirve para ver y probar las pantallas; no es para clientes reales.

const PREFIJO = "DEMO-";

async function main() {
  const [slug, accion] = process.argv.slice(2);
  if (!slug) throw new Error("Uso: npm run cliente:demo-inventario -- <codigo> [limpiar]");
  const c = await clientePorSlug(slug);
  if (!c) throw new Error(`No existe el cliente "${slug}".`);
  const db = new Client({ connectionString: urlConexion(c, "migrador") });
  await db.connect();
  const q = (sql: string, p: unknown[] = []) => db.query(sql, p);
  try {
    await q("BEGIN");
    // Siempre se limpia lo anterior: el script se puede repetir.
    await q("DELETE FROM t_temporal_conteowms_multiproducto WHERE idconteo IN (SELECT idconteo FROM t_temporar_encabezado_conteowms WHERE bodega = 'DEMO')");
    await q("DELETE FROM t_temporal_conteowms WHERE prodean LIKE $1", [`${PREFIJO}%`]);
    await q("DELETE FROM t_temporar_encabezado_conteowms WHERE bodega = 'DEMO'");
    await q("DELETE FROM t_pic_ajuste WHERE loteproveedor LIKE $1", [`${PREFIJO}%`]);
    await q("DELETE FROM t_pic WHERE lote LIKE $1", [`${PREFIJO}%`]);
    await q("DELETE FROM t_historia_status_calidad WHERE lote LIKE $1", [`${PREFIJO}%`]);
    await q("DELETE FROM t_entradas_ras WHERE lote_orden LIKE $1", [`${PREFIJO}%`]);
    await q("DELETE FROM t_maestro_lote_pt WHERE loteproveedor LIKE $1", [`${PREFIJO}%`]);
    await q("DELETE FROM t_ins_coordenadas WHERE ubicacion LIKE $1", [`${PREFIJO}%`]);
    await q("DELETE FROM t_detalle_referencia WHERE productoean LIKE $1", [`${PREFIJO}%`]);
    await q("DELETE FROM t_ins_referencias WHERE codigoreferencia = 'DEMO'");
    await q("DELETE FROM t_ins_bodega WHERE bodega = 'DEMO'");
    if (accion === "limpiar") {
      await q("COMMIT");
      console.log("Datos de ejemplo de inventario eliminados.");
      return;
    }

    await q("INSERT INTO t_ins_bodega (bodega, descripcion, ubicacionf_c, prcierre) VALUES ('DEMO', 'Bodega de demostración', 'Bogotá', false)");
    await q("INSERT INTO t_ins_referencias (codigoreferencia, nombreref, linea) VALUES ('DEMO', 'Línea de demostración', 'Demo')");
    const articulos = [
      [`${PREFIJO}7701`, "Acetaminofén 500 mg x 100", "CAJA"],
      [`${PREFIJO}7702`, "Ibuprofeno 400 mg x 50", "CAJA"],
    ];
    for (const [ean, desc, um] of articulos) {
      await q("INSERT INTO t_detalle_referencia (productoean, descripcion, um1, codigoreferencia, inventariable, estado) VALUES ($1,$2,$3,'DEMO',1,0)", [ean, desc, um]);
    }
    for (const [i, u] of ["01-01", "01-02", "02-01"].entries()) {
      await q(
        `INSERT INTO t_ins_coordenadas (ubicacion, fila_piso, columna_piso, piso, posicion_x, posicion_z, bodegac, prioridadrotacion, zonapiso)
         VALUES ($1,'A',$2,'1','1','1','DEMO','ALTA','Z1')`,
        [`${PREFIJO}${u}`, String(i + 1)],
      );
    }
    const lotes: { lote: string; ean: string; vence: number; estado: string | null; cajas: [number, number, string][] }[] = [
      { lote: `${PREFIJO}L001`, ean: `${PREFIJO}7701`, vence: 20, estado: "Cuarentena", cajas: [[900001, 100, "01-01"], [900002, 100, "01-01"], [900003, 60, "01-02"]] },
      { lote: `${PREFIJO}L002`, ean: `${PREFIJO}7701`, vence: -10, estado: "Aprobado", cajas: [[900004, 80, "01-02"]] },
      { lote: `${PREFIJO}L003`, ean: `${PREFIJO}7702`, vence: 300, estado: "Rechazado", cajas: [[900005, 50, "02-01"]] },
      { lote: `${PREFIJO}L004`, ean: `${PREFIJO}7702`, vence: 400, estado: null, cajas: [] },
      { lote: `${PREFIJO}L005`, ean: `${PREFIJO}7702`, vence: 500, estado: "Cuarentena", cajas: [[900006, 40, "02-01"]] },
    ];
    for (const l of lotes) {
      await q(
        `INSERT INTO t_maestro_lote_pt (loteproveedor, nitprov, codean, fechaingresa, fechavence, confirmacertif, pedproveedor)
         VALUES ($1,'900111222',$2, now() - interval '5 days', now() + ($3 || ' days')::interval, 0, $4)`,
        [l.lote, l.ean, String(l.vence), `PED-${l.lote.slice(-4)}`],
      );
      if (l.estado) {
        await q("INSERT INTO t_historia_status_calidad (lote, productoean, fecha_registro, estado, id_usuario, saldo) VALUES ($1,$2,now(),$3,0,0)", [l.lote, l.ean, l.estado]);
      }
      for (const [caja, cant, ubic] of l.cajas) {
        await q(
          `INSERT INTO t_entradas_ras (cajano, producto, lote_orden, describteetiqueta, operadorras, des_articulo, brecibe, tipocaja)
           VALUES ($1,$2,$3,'Etiqueta demo',$4,$5,'DEMO','C-M')`,
          [caja, l.ean, l.lote, l.estado, l.ean.endsWith("7701") ? articulos[0][1] : articulos[1][1]],
        );
        await q(
          `INSERT INTO t_pic (cod_producto, bodepicking, cajap, lote, ubicacion, entradas, salidas, reserva) VALUES ($1,'DEMO',$2,$3,$4,$5,0,0)`,
          [l.ean, caja, l.lote, `${PREFIJO}${ubic}`, cant],
        );
      }
    }
    await q("UPDATE t_pic SET reserva = 20 WHERE cajap = 900001");
    await q("COMMIT");
    console.log("Datos de ejemplo de inventario cargados (bodega DEMO, 2 artículos, 5 lotes, 6 cajas).");
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
