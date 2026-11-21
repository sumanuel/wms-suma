"use client";

import { Eye, RotateCcw, Save, Send } from "lucide-react";
import { useState, useTransition } from "react";
import { BotonConfirmar } from "@/components/boton-confirmar";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";
import { guardar, probar, restaurar, vista, type Estado } from "../acciones";

export function EditorPlantilla({ tipo, contenido, personalizada, defecto, impresoras, puedeEditar, puedeProbar }: { tipo: string; contenido: string; personalizada: boolean; defecto: string; impresoras: { id: number; nombre: string }[]; puedeEditar: boolean; puedeProbar: boolean }) {
  const [texto, setTexto] = useState(contenido);
  const [dpi, setDpi] = useState("203");
  const [impresora, setImpresora] = useState(impresoras[0] ? String(impresoras[0].id) : "");
  const [res, setRes] = useState<Estado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const cambiado = texto !== contenido;
  const ejecutar = (f: () => Promise<Estado>) => iniciar(async () => setRes(await f()));
  return (
    <div className="flex flex-col gap-3">
      <textarea
        aria-label="Plantilla ZPL" value={texto} onChange={(e) => setTexto(e.target.value)} readOnly={!puedeEditar} spellCheck={false} rows={26} wrap="off"
        className={`${claseControl} h-auto min-h-[28rem] w-full resize-y whitespace-pre font-mono text-[12.5px] leading-5`}
      />
      <div className="flex flex-wrap items-center gap-2">
        {puedeEditar ? (
          <>
            <button type="button" disabled={pendiente || !cambiado} className={clasesBoton("primario")} onClick={() => ejecutar(() => guardar(tipo, texto))}><Save className="size-4" aria-hidden />Guardar plantilla</button>
            <button type="button" disabled={pendiente || texto === defecto} className={clasesBoton("fantasma")} onClick={() => setTexto(defecto)}>Cargar la predeterminada en el editor</button>
            {personalizada ? (
              <BotonConfirmar etiqueta="Restaurar" titulo="Volver a la plantilla predeterminada" confirmar="Sí, restaurar" variante="peligro" icono={<RotateCcw className="size-4" aria-hidden />} accion={async () => { const r = await restaurar(tipo); if (!r.error) { setTexto(defecto); setRes(r); } return r; }}>
                Se borra la plantilla personalizada y las etiquetas vuelven al diseño del sistema.
              </BotonConfirmar>
            ) : null}
          </>
        ) : <p className="text-[13px] text-gris-500">Solo quien administra las impresoras puede cambiar la plantilla.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-linea pt-3">
        <select aria-label="Resolución de la vista" value={dpi} onChange={(e) => setDpi(e.target.value)} className={`${claseControl} h-9 w-auto pr-9`}><option value="203">203 dpi</option><option value="300">300 dpi</option></select>
        <button type="button" disabled={pendiente} className={clasesBoton("secundario")} onClick={() => ejecutar(() => vista(tipo, texto, Number(dpi)))}><Eye className="size-4" aria-hidden />Ver el ZPL con datos de ejemplo</button>
        {puedeProbar && impresoras.length > 0 ? (
          <>
            <select aria-label="Impresora de prueba" value={impresora} onChange={(e) => setImpresora(e.target.value)} className={`${claseControl} h-9 w-auto pr-9`}>{impresoras.map((i) => <option key={i.id} value={i.id}>{i.nombre}</option>)}</select>
            <button type="button" disabled={pendiente || !impresora} className={clasesBoton("secundario")} onClick={() => ejecutar(() => probar(tipo, texto, Number(impresora)))}><Send className="size-4" aria-hidden />Imprimir ejemplo</button>
          </>
        ) : null}
      </div>
      {cambiado && puedeEditar ? <p className="text-[13px] text-gris-500">Hay cambios sin guardar. «Ver» e «Imprimir ejemplo» usan lo que está escrito, esté o no guardado.</p> : null}
      {res?.error ? <Aviso tono="error">{res.error}</Aviso> : null}
      {res?.aviso ? <Aviso tono="exito">{res.aviso}</Aviso> : null}
      {res?.zpl ? <pre aria-label="ZPL resultante" className="max-h-96 overflow-auto rounded-[10px] border border-linea bg-hover p-3 font-mono text-[12px] leading-5">{res.zpl}</pre> : null}
    </div>
  );
}
