import type { ReactNode } from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Search, X } from "lucide-react";
import { Tarjeta, clasesBoton } from "@/components/ui";
import { requerirSesion, tienePermiso } from "@/lib/dal";
import {
  POR_PAGINA,
  armarPedido,
  cargarFiltros,
  columnasVisibles,
  formatear,
  hayFiltros,
  hrefListado,
  leerConsulta,
  nombreCookieColumnas,
  parametrosListado,
  type Busqueda,
  type Definicion,
} from "@/lib/listados";
import { AccionesFila, type EliminarFila } from "./acciones-fila";
import { ElegirColumnas, FormularioListado, SelectFiltro } from "./controles";

const numero = new Intl.NumberFormat("es-UY");

export async function Listado<F, O>({
  definicion: d,
  busqueda,
  acciones,
  eliminar,
}: {
  definicion: Definicion<F, O>;
  busqueda: Promise<Busqueda>;
  acciones?: ReactNode;
  eliminar?: (fila: F) => EliminarFila;
}) {
  const [ctx, params, filtros, almacen] = await Promise.all([requerirSesion(), busqueda, cargarFiltros(d.filtros), cookies()]);
  const consulta = leerConsulta(d, params, filtros);
  const columnas = columnasVisibles(d, almacen.get(nombreCookieColumnas(d.id))?.value);
  const porPagina = d.porPagina ?? POR_PAGINA;
  const { filas, total } = await d.cargar(armarPedido(d, consulta, (consulta.pagina - 1) * porPagina, porPagina));

  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const desde = total === 0 ? 0 : (consulta.pagina - 1) * porPagina + 1;
  const hasta = Math.min(total, consulta.pagina * porPagina);
  const filtrado = hayFiltros(consulta);
  const conAcciones = !!d.enlace || !!eliminar;
  const editable = !d.soloLectura && tienePermiso(ctx, d.modulo, "editar");

  const claveConsulta = parametrosListado(d, consulta).toString();
  const selects = filtros.map((f) => (
    <SelectFiltro
      key={f.id}
      id={f.id}
      etiqueta={f.etiqueta}
      valor={consulta.filtros[f.id] ?? ""}
      opciones={[{ valor: "", etiqueta: f.todos }, ...f.opciones]}
    />
  ));

  const activos = [
    ...(consulta.texto ? [{ clave: "q", texto: `Búsqueda: «${consulta.texto}»`, quitar: hrefListado(d, consulta, { texto: "", pagina: 1 }) }] : []),
    ...filtros
      .filter((f) => consulta.filtros[f.id])
      .map((f) => {
        const resto = { ...consulta.filtros };
        delete resto[f.id];
        const opcion = f.opciones.find((o) => o.valor === consulta.filtros[f.id]);
        return { clave: f.id, texto: `${f.etiqueta}: ${opcion?.etiqueta}`, quitar: hrefListado(d, consulta, { filtros: resto, pagina: 1 }) };
      }),
  ];

  return (
    // Sin recorte: los menús de Columnas y Exportar se despliegan por fuera de la tarjeta cuando hay pocas filas.
    <Tarjeta recortar={false}>
      {/* La clave rehace el formulario al cambiar la URL: sus campos no controlados quedarían con lo escrito antes. */}
      <FormularioListado key={claveConsulta} ruta={d.ruta} className="flex flex-col gap-3 border-b border-linea px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          {d.busqueda ? (
            <div className="relative min-w-[220px] max-w-[420px] flex-1">
              <label htmlFor={`buscar-${d.id}`} className="sr-only">
                {d.busqueda}
              </label>
              <Search className="pointer-events-none absolute top-[11.5px] left-3 size-[17px] text-gris-500" aria-hidden />
              <input
                id={`buscar-${d.id}`}
                type="search"
                name="q"
                defaultValue={consulta.texto}
                placeholder={d.busqueda}
                className="h-10 w-full rounded-[10px] border border-borde-campo bg-white pr-3 pl-[38px] text-sm placeholder:text-gris-500"
              />
            </div>
          ) : (
            selects
          )}
          {d.busqueda || filtros.length > 0 ? (
            <button type="submit" className={clasesBoton("secundario")}>
              Buscar
            </button>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
            <ElegirColumnas
              listado={d.id}
              columnas={d.columnas.map((c) => ({ id: c.id, titulo: c.titulo, fija: c.fija ?? false }))}
              visibles={columnas.map((c) => c.id)}
            />
            {acciones}
          </div>
        </div>
        {d.busqueda && filtros.length > 0 ? <div className="flex flex-wrap items-center gap-2">{selects}</div> : null}
        {consulta.orden.columna !== d.orden.columna || consulta.orden.dir !== d.orden.dir ? (
          <>
            <input type="hidden" name="orden" value={consulta.orden.columna} />
            <input type="hidden" name="dir" value={consulta.orden.dir} />
          </>
        ) : null}
      </FormularioListado>

      {activos.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-linea px-4 py-2.5">
          {activos.map((a) => (
            <Link
              key={a.clave}
              href={a.quitar}
              aria-label={`Quitar ${a.texto}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-marca-suave pr-2 pl-3 text-[13px] font-medium text-marca-texto hover:brightness-95"
            >
              {a.texto}
              <X className="size-3.5" strokeWidth={2.2} aria-hidden />
            </Link>
          ))}
          <Link href={hrefListado(d, consulta, { texto: "", filtros: {}, pagina: 1 })} className="px-1 text-[13px] font-medium text-gris-600 hover:text-tinta hover:underline">
            Limpiar filtros
          </Link>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead className="bg-[#fafaf8] text-xs text-gris-500">
            <tr>
              {columnas.map((c) => {
                const activa = consulta.orden.columna === c.id;
                const Icono = activa ? (consulta.orden.dir === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={activa ? (consulta.orden.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={`border-b border-linea px-4 py-2.5 font-medium whitespace-nowrap ${c.alinear === "derecha" ? "text-right" : ""}`}
                  >
                    {c.ordenar ? (
                      <Link
                        href={hrefListado(d, consulta, {
                          orden: { columna: c.id, dir: activa && consulta.orden.dir === "asc" ? "desc" : "asc" },
                          pagina: 1,
                        })}
                        scroll={false}
                        className={`group inline-flex items-center gap-1 hover:text-tinta ${activa ? "text-tinta" : ""}`}
                      >
                        {c.titulo}
                        <Icono
                          className={`size-3.5 ${activa ? "text-marca-texto" : "text-[#b4b4ba] group-hover:text-gris-500"}`}
                          strokeWidth={2}
                          aria-hidden
                        />
                      </Link>
                    ) : (
                      c.titulo
                    )}
                  </th>
                );
              })}
              {conAcciones ? (
                // Fija a la derecha: queda a mano aunque la tabla se desplace en pantallas angostas.
                <th scope="col" className="sticky right-0 w-px border-b border-linea bg-[#fafaf8] py-2.5 pr-3 pl-2 text-right font-medium whitespace-nowrap">
                  Acciones
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={d.claveFila(fila)} className="group hover:bg-[#fafaf8]">
                {columnas.map((c) => (
                  <td
                    key={c.id}
                    className={`border-b border-[#f1f1ee] px-4 py-3 ${c.alinear === "derecha" ? "text-right tabular-nums" : ""} ${c.formato && c.formato !== "texto" ? "whitespace-nowrap tabular-nums" : ""}`}
                  >
                    {c.celda ? c.celda(fila) : formatear(c.valor(fila), c.formato)}
                  </td>
                ))}
                {conAcciones ? (
                  <td className="sticky right-0 w-px border-b border-[#f1f1ee] bg-white py-1.5 pr-3 pl-2 whitespace-nowrap group-hover:bg-[#fafaf8]">
                    <AccionesFila
                      nombre={String(d.columnas[0].valor(fila) ?? "")}
                      elemento={d.elemento.singular}
                      href={d.enlace?.(fila)}
                      editable={editable}
                      eliminar={eliminar?.(fila)}
                    />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total === 0 ? (
        <p className="px-4 py-12 text-center text-gris-500">
          {filtrado ? `No hay ${d.elemento.plural} que coincidan con la búsqueda.` : `Todavía no hay ${d.elemento.plural}.`}
        </p>
      ) : filas.length === 0 ? (
        <p className="px-4 py-12 text-center text-gris-500">
          Esta página ya no existe.{" "}
          <Link href={hrefListado(d, consulta, { pagina: 1 })} className="font-medium">
            Volver a la primera
          </Link>
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-[13px] text-gris-500">
        <span className="tabular-nums">
          {total === 0
            ? `0 ${d.elemento.plural}`
            : `${numero.format(desde)}–${numero.format(hasta)} de ${numero.format(total)} ${total === 1 ? d.elemento.singular : d.elemento.plural}`}
        </span>
        {paginas > 1 ? (
          <nav aria-label="Paginación" className="flex items-center gap-2">
            <EnlacePagina href={consulta.pagina > 1 ? hrefListado(d, consulta, { pagina: consulta.pagina - 1 }) : null} etiqueta="Página anterior">
              <ChevronLeft className="size-4" aria-hidden />
            </EnlacePagina>
            <span className="tabular-nums">
              Página {numero.format(Math.min(consulta.pagina, paginas))} de {numero.format(paginas)}
            </span>
            <EnlacePagina href={consulta.pagina < paginas ? hrefListado(d, consulta, { pagina: consulta.pagina + 1 }) : null} etiqueta="Página siguiente">
              <ChevronRight className="size-4" aria-hidden />
            </EnlacePagina>
          </nav>
        ) : null}
      </div>
    </Tarjeta>
  );
}

function EnlacePagina({ href, etiqueta, children }: { href: string | null; etiqueta: string; children: ReactNode }) {
  const clases = "flex size-9 items-center justify-center rounded-[9px] border border-borde-campo";
  return href ? (
    <Link href={href} aria-label={etiqueta} title={etiqueta} className={`${clases} bg-white text-tinta hover:bg-hover`}>
      {children}
    </Link>
  ) : (
    <button type="button" disabled aria-label={etiqueta} className={`${clases} text-[#c4c4c9]`}>
      {children}
    </button>
  );
}
