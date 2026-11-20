"use client";

import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { useEnvio } from "@/components/usar-envio";
import { nuevaRegla, type Estado } from "../acciones";

export function FormularioRegla({ bodegas }: { bodegas: { valor: string; etiqueta: string }[] }) {
  const { estado, pendiente, enviar } = useEnvio<Estado>(nuevaRegla, {}, { limpiarSiExito: true });
  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="flex flex-col gap-1.5"><label htmlFor="bodega" className="text-[13px] font-medium">Bodega</label>
          <select id="bodega" name="bodega" required defaultValue="" className={`${claseControl} pr-9`}><option value="" disabled>Elegir…</option>{bodegas.map((b) => <option key={b.valor} value={b.valor}>{b.etiqueta}</option>)}</select></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="ean" className="text-[13px] font-medium">Código de barras</label><input id="ean" name="ean" required maxLength={50} className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="ubicacion" className="text-[13px] font-medium">Ubicación de picking</label><input id="ubicacion" name="ubicacion" required maxLength={20} className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="minimo" className="text-[13px] font-medium">Mínimo</label><input id="minimo" name="minimo" required inputMode="decimal" className={claseControl} /></div>
        <div className="flex flex-col gap-1.5"><label htmlFor="maximo" className="text-[13px] font-medium">Máximo</label><input id="maximo" name="maximo" required inputMode="decimal" className={claseControl} /></div>
      </div>
      {estado.error ? <Aviso tono="error">{estado.error}</Aviso> : null}
      {estado.aviso ? <Aviso tono="exito">{estado.aviso}</Aviso> : null}
      <div><button type="submit" disabled={pendiente} className={clasesBoton("primario")}>{pendiente ? "Guardando…" : "Crear regla"}</button></div>
    </form>
  );
}
