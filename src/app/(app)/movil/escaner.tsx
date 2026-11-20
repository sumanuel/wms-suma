"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Aviso, claseControl, clasesBoton } from "@/components/ui";

export type CampoEscaner = { name: string; etiqueta: string; inputMode?: "numeric" | "decimal" | "text"; defaultValue?: string; conservar?: boolean; opciones?: string[]; ayuda?: string; opcional?: boolean };

// Formulario para lector de códigos: el lector escribe y manda Enter. Enter en un campo pasa al siguiente y en el último envía.
// Tras un envío correcto se vacían los campos (menos los marcados «conservar») y el foco vuelve al primero que quedó vacío.
export function Escaner({ campos, accion, boton, refrescar = true }: { campos: CampoEscaner[]; accion: (previo: { error?: string; aviso?: string }, form: FormData) => Promise<{ error?: string; aviso?: string }>; boton: string; refrescar?: boolean }) {
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(campos.map((c) => [c.name, c.defaultValue ?? c.opciones?.[0] ?? ""])));
  const [resultado, setResultado] = useState<{ error?: string; aviso?: string }>({});
  const [pendiente, iniciar] = useTransition();
  const refs = useRef<Record<string, HTMLInputElement | HTMLSelectElement | null>>({});
  const router = useRouter();

  function enviar(e?: React.SyntheticEvent) {
    e?.preventDefault();
    const form = new FormData();
    for (const c of campos) form.set(c.name, valores[c.name] ?? "");
    iniciar(async () => {
      const r = await accion({}, form);
      setResultado(r);
      if (!r.error) {
        const nuevos = { ...valores };
        for (const c of campos) if (!c.conservar) nuevos[c.name] = c.defaultValue ?? c.opciones?.[0] ?? "";
        setValores(nuevos);
        const primero = campos.find((c) => !c.conservar);
        setTimeout(() => refs.current[(primero ?? campos[0]).name]?.focus(), 0);
        if (refrescar) router.refresh();
      }
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      {campos.map((c, i) => (
        <div key={c.name} className="flex flex-col gap-1">
          <label htmlFor={`m-${c.name}`} className="text-sm font-medium">{c.etiqueta}</label>
          {c.opciones ? (
            <select id={`m-${c.name}`} name={c.name} value={valores[c.name]} onChange={(e) => setValores({ ...valores, [c.name]: e.target.value })} ref={(el) => { refs.current[c.name] = el; }} className={`${claseControl} h-12 pr-9 text-base`}>
              {c.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              id={`m-${c.name}`} name={c.name} inputMode={c.inputMode ?? "text"} autoComplete="off" autoCapitalize="characters" enterKeyHint={i === campos.length - 1 ? "done" : "next"}
              autoFocus={i === 0} required={!c.opcional} value={valores[c.name]} onChange={(e) => setValores({ ...valores, [c.name]: e.target.value })} ref={(el) => { refs.current[c.name] = el; }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                const sig = campos.slice(i + 1).find((x) => !x.opciones);
                if (i < campos.length - 1 && sig && !(valores[sig.name] && sig.conservar)) refs.current[sig.name]?.focus();
                else enviar();
              }}
              className={`${claseControl} h-12 text-lg`}
            />
          )}
          {c.ayuda ? <p className="text-xs text-gris-500">{c.ayuda}</p> : null}
        </div>
      ))}
      <button type="submit" disabled={pendiente} className={clasesBoton("primario", "h-12 text-base")}>{pendiente ? "Enviando…" : boton}</button>
      <div aria-live="polite">
        {resultado.error ? <Aviso tono="error">{resultado.error}</Aviso> : null}
        {resultado.aviso ? <Aviso tono="exito">{resultado.aviso}</Aviso> : null}
      </div>
    </form>
  );
}
