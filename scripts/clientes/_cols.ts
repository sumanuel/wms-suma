import "dotenv/config";
import { Client } from "pg";
import { clientePorSlug, urlConexion } from "../../src/lib/nucleo/control";
async function main() {
  const c = await clientePorSlug("demo");
  const db = new Client({ connectionString: urlConexion(c!, "migrador") });
  await db.connect();
  for (const t of ["t_ssccxcaja","t_encabezado_prepack","t_aduana_wms_pos","t_guias_generadas","t_narth_encabezado_pedido","t_narth_serie_pedido","t_clientes","t_pic","t_maestro_lote_pt","t_detalle_referencia","t_ins_coordenadas","t_entradas_ras","t_pic_ajuste","t_temporar_encabezado_conteowms","t_temporal_conteowms"]) {
    const r = await db.query("select column_name from information_schema.columns where table_name=$1 order by ordinal_position",[t]);
    console.log(t+": "+r.rows.map(x=>x.column_name).join(","));
  }
  await db.end();
}
main();
