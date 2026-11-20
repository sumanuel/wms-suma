#!/usr/bin/env python3
"""Convierte el DDL T-SQL del WMS legado (CO_DLL_BASE) a esquema Prisma/PostgreSQL.

Uso:
  python scripts/legado/convertir_tablas.py <tablas.sql> <lista_tablas.txt> <carpeta_prisma_schema> <docs/mapeo-tablas.md>

- <tablas.sql>: script de SQL Server (UTF-16 o UTF-8).
- <lista_tablas.txt>: nombres de las tablas núcleo (una por línea, sin distinguir mayúsculas).
- Genera un archivo .prisma por módulo (prefijo 4x-9x) y un informe con todo lo que NO se pudo convertir.

Convenciones del esquema generado (ver docs/mapeo-tablas.md):
  * Tabla y columnas en minúscula sin acentos ni espacios; el nombre legado queda en el comentario /// Legado.
  * Los campos Prisma se llaman igual que la columna (snake_case): portar un SP es casi mecánico.
  * datetime -> timestamp(3) sin zona, igual que SQL Server. bit -> boolean. float -> double precision.
  * Sin PK: se usa la columna IDENTITY; si tampoco hay, se agrega una clave sustituta wms_id.
"""
import json
import os
import re
import sys
import unicodedata
from collections import defaultdict

if len(sys.argv) != 5:
    sys.exit(__doc__)
RUTA_SQL, RUTA_LISTA, DIR_SALIDA, RUTA_INFORME = sys.argv[1:5]

# Índices no únicos: el DDL original no los trae. Se deducen de las consultas de los SP y se listan en indices.txt
# (una línea por índice: tabla: col1, col2).
INDICES = {}
# Tipos forzados: columnas numeric(18,0) que en la práctica son enteros pequeños (identificadores). Se listan en tipos.txt
# (una línea por columna: tabla.columna: Int).
TIPOS_FORZADOS = {}
_ruta_tipos = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tipos.txt")
if os.path.exists(_ruta_tipos):
    for _l in open(_ruta_tipos, encoding="utf-8"):
        _l = _l.split("#")[0].strip()
        if ":" in _l:
            _k, _v = _l.split(":", 1)
            TIPOS_FORZADOS[_k.strip().lower()] = _v.strip()
_ruta_indices = os.path.join(os.path.dirname(os.path.abspath(__file__)), "indices.txt")
if os.path.exists(_ruta_indices):
    for _l in open(_ruta_indices, encoding="utf-8"):
        _l = _l.split("#")[0].strip()
        if ":" in _l:
            _t, _c = _l.split(":", 1)
            INDICES.setdefault(_t.strip().lower(), []).append([x.strip().lower() for x in _c.split(",")])

raw = open(RUTA_SQL, "rb").read()
texto = (raw.decode("utf-16") if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else raw.decode("utf-8-sig")).replace("\r", "")
nucleo = {l.strip().lower() for l in open(RUTA_LISTA, encoding="utf-8") if l.strip()}

EXCLUIR = re.compile(r"^(tmp|pruebaa?$|t_prueba$|t_ver$|bkp|temp_|t_temp_(?!paretto_rotacion$)|t_temporal(?!_conteowms(_multiproducto)?$)|t_temporar(?!_encabezado_conteowms$)|t_wms_temporal(?!_asigna_prepacking$))", re.I)

# Módulo -> archivo .prisma. Se evalúa en orden; la primera coincidencia gana.
MODULOS = [
    ("95_conteo", r"conteo"),
    ("80_aduana", r"aduana|recepcion|recibo_ciego|_ras$|^t_entradas_ras|traer_ras"),
    ("70_prepacking", r"prepack|pallet|ssccxcaja|caja|boxplan|tiposdecaja|logisticasxcaja|etiqueta|zpl|volumenesxean|valoresfijos"),
    ("90_despacho", r"guia|transportador|tarifasdetransporte|despacho|ciudad|dane|departamento"),
    ("60_pedidos", r"^t_pic|^tgg_t_pic|picking|pedido|orden|materiales_por_orden|ajustedereserva|programacion|procesos"),
    ("50_ubicaciones", r"ubicacion|coordenadas|mapas|bodega|zona"),
    ("40_inventario", r"paretto|lote|inventario|entradas|equivalencias|relacion_codbarras|status|historia|pdto_terminado|resumen|movimientos"),
    ("96_erp", r"facturac|plan_cuentas|trm|impuesto|lista_precio|panoramacontable|mvtoerp|orden_compra|detalle_orden"),
    ("30_maestros", r"."),
]
MODULOS = [(m, re.compile(p, re.I)) for m, p in MODULOS]


def sin_acentos(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c))


def sanear(nombre: str) -> str:
    s = re.sub(r"[^a-z0-9_]+", "_", sin_acentos(nombre).lower()).strip("_")
    s = re.sub(r"_+", "_", s)
    if not s or not s[0].isalpha():
        s = "c_" + s
    return s


def pascal(tabla: str) -> str:
    partes = [p for p in tabla.split("_") if p]
    if len(partes) > 1 and partes[0] in ("t", "ta"):
        partes = partes[1:]
    return "".join(p[:1].upper() + p[1:] for p in partes) or "Modelo"


# ---------- lectura de tablas ----------
informe = defaultdict(list)
tablas = {}  # clave: nombre legado en minúscula

for chunk in re.split(r"(?m)^GO$", texto):
    m = re.search(r"CREATE TABLE \[dbo\]\.\[([^\]]+)\]\(", chunk)
    if not m:
        continue
    legado = m.group(1)
    if legado.lower() not in nucleo:
        continue
    if EXCLUIR.search(legado):
        informe["excluidas"].append(legado)
        continue
    cuerpo = chunk[m.end():]
    cols, computadas = [], []
    for linea in cuerpo.split("\n"):
        if not linea.startswith("\t["):
            continue
        c = re.match(r"\t\[([^\]]+)\]\s+AS\s+(.*?),?$", linea)
        if c:
            computadas.append((c.group(1), c.group(2).strip()))
            continue
        c = re.match(r"\t\[([^\]]+)\]\s+\[([^\]]+)\](?:\(([^)]*)\))?(.*)$", linea)
        if not c:
            informe["lineas_no_reconocidas"].append(f"{legado}: {linea.strip()}")
            continue
        resto = c.group(4)
        cols.append(
            dict(
                legado=c.group(1),
                tipo=c.group(2).lower(),
                arg=c.group(3),
                identidad="IDENTITY" in resto,
                nulo="NOT NULL" not in resto,
            )
        )
    pk = re.search(r"CONSTRAINT \[[^\]]+\]\s+PRIMARY KEY\s+(?:CLUSTERED|NONCLUSTERED)?\s*\(([^)]*)\)", cuerpo)
    unicos = [re.findall(r"\[([^\]]+)\]", u) for u in re.findall(r"CONSTRAINT \[[^\]]+\]\s+UNIQUE\s+(?:CLUSTERED|NONCLUSTERED)?\s*\(([^)]*)\)", cuerpo)]
    tablas[legado.lower()] = dict(
        legado=legado,
        cols=cols,
        computadas=computadas,
        pk=re.findall(r"\[([^\]]+)\]", pk.group(1)) if pk else [],
        unicos=unicos,
        defaults={},
        fks=[],
    )

# defaults
for t, expr, col in re.findall(
    r"ALTER TABLE \[dbo\]\.\[([^\]]+)\]\s+ADD\s+CONSTRAINT \[[^\]]+\]\s+DEFAULT (\(.*\)) FOR \[([^\]]+)\]", texto
):
    if t.lower() in tablas:
        tablas[t.lower()]["defaults"][col.lower()] = expr

# claves foráneas
for hijo, nombre, cols_h, padre, cols_p in re.findall(
    r"ALTER TABLE \[dbo\]\.\[([^\]]+)\]\s+WITH \w+ ADD\s+CONSTRAINT \[([^\]]+)\] FOREIGN KEY\(([^)]*)\)\s*REFERENCES \[dbo\]\.\[([^\]]+)\]\s*\(([^)]*)\)",
    texto,
):
    if hijo.lower() in tablas:
        if padre.lower() in tablas:
            tablas[hijo.lower()]["fks"].append(
                (nombre, re.findall(r"\[([^\]]+)\]", cols_h), padre.lower(), re.findall(r"\[([^\]]+)\]", cols_p))
            )
        else:
            informe["fk_fuera_del_nucleo"].append(f"{hijo} -> {padre} ({nombre})")

# ---------- conversión de tipos ----------
def tipo_prisma(c):
    t, a = c["tipo"], c["arg"]
    if t in ("nvarchar", "varchar"):
        return ("String", "@db.Text" if a == "max" else f"@db.VarChar({a})")
    if t in ("nchar", "char"):
        return ("String", f"@db.Char({a})")
    if t in ("ntext", "text"):
        return ("String", "@db.Text")
    if t == "int":
        return ("Int", "")
    if t in ("smallint", "tinyint"):
        return ("Int", "@db.SmallInt")
    if t == "bigint":
        return ("BigInt", "")
    if t == "float":
        return ("Float", "")
    if t == "real":
        return ("Float", "@db.Real")
    if t in ("decimal", "numeric"):
        p, s = [x.strip() for x in (a or "18,0").split(",")] if a and "," in a else ((a or "18"), "0")
        return ("Decimal", f"@db.Decimal({p}, {s})")
    if t == "money":
        return ("Decimal", "@db.Decimal(19, 4)")
    if t == "bit":
        return ("Boolean", "")
    if t == "datetime":
        return ("DateTime", "@db.Timestamp(3)")
    if t == "datetime2":
        return ("DateTime", "@db.Timestamp(6)")
    if t == "date":
        return ("DateTime", "@db.Date")
    if t in ("varbinary", "image", "binary"):
        return ("Bytes", "")
    if t == "uniqueidentifier":
        return ("String", "@db.Uuid")
    if t == "sysname":
        return ("String", "@db.VarChar(128)")
    return None


def quitar_parentesis(e: str) -> str:
    e = e.strip()
    while e.startswith("(") and e.endswith(")"):
        nivel, ok = 0, True
        for i, ch in enumerate(e):
            nivel += (ch == "(") - (ch == ")")
            if nivel == 0 and i < len(e) - 1:
                ok = False
                break
        if not ok:
            break
        e = e[1:-1].strip()
    return e


def valor_defecto(expr: str, base: str):
    e = quitar_parentesis(expr)
    low = e.lower()
    if low in ("getdate()", "sysdatetime()", "current_timestamp") and base == "DateTime":
        return "@default(now())"
    if low == "newid()":
        return '@default(dbgenerated("gen_random_uuid()"))'
    mnum = re.fullmatch(r"-?\d+(\.\d+)?", e)
    if mnum:
        if base == "Boolean":
            return "@default(true)" if float(e) != 0 else "@default(false)"
        if base in ("Int", "BigInt"):
            return f"@default({int(float(e))})"
        if base in ("Float", "Decimal"):
            return f"@default({e})"
        if base == "String":
            return f"@default({json.dumps(e)})"
        return None
    ms = re.fullmatch(r"N?'(.*)'", e, re.S)
    if ms and base == "String":
        return "@default(" + json.dumps(ms.group(1).replace("''", "'"), ensure_ascii=False) + ")"
    return None


# ---------- nombres ----------
modelos = {}  # clave legado minúscula -> info
usados = {"Configuracion", "Perfil", "PerfilPermiso", "Usuario", "RegistroIngreso", "AuditoriaCambio"}
for k, t in tablas.items():
    tabla = sanear(t["legado"])
    nombre = pascal(tabla)
    while nombre in usados:
        nombre += "Legado"
    usados.add(nombre)
    modulo = next(m for m, rx in MODULOS if rx.search(tabla))
    modelos[k] = dict(t=t, tabla=tabla, nombre=nombre, modulo=modulo, campos=[], extra=[], sustituta=False)

# ---------- campos ----------
for k, mo in modelos.items():
    t = mo["t"]
    vistos = set()
    mapa_col = {}
    for c in t["cols"]:
        nombre = sanear(c["legado"])
        base_n, n = nombre, 2
        while nombre in vistos:
            nombre = f"{base_n}_{n}"
            n += 1
            informe["columnas_renombradas"].append(f"{t['legado']}.{c['legado']} -> {nombre} (colisión de mayúsculas)")
        vistos.add(nombre)
        mapa_col[c["legado"].lower()] = nombre
        tp = tipo_prisma(c)
        forzado = TIPOS_FORZADOS.get(f"{t['legado'].lower()}.{c['legado'].lower()}")
        if forzado and tp is not None:
            tp = (forzado, "")
            informe.setdefault("tipos_forzados", []).append(f"{t['legado']}.{c['legado']} -> {forzado}")
        if tp is None:
            informe["tipos_no_soportados"].append(f"{t['legado']}.{c['legado']} ({c['tipo']})")
            continue
        base, nativo = tp
        attrs = [nativo] if nativo else []
        if c["identidad"]:
            attrs.append("@default(autoincrement())")
            informe["identidades"].append(f"{t['legado']}.{c['legado']}")
        elif c["legado"].lower() in t["defaults"]:
            d = valor_defecto(t["defaults"][c["legado"].lower()], base)
            if d:
                attrs.append(d)
            else:
                informe["defaults_no_convertidos"].append(f"{t['legado']}.{c['legado']} = {t['defaults'][c['legado'].lower()]}")
        mo["campos"].append(dict(nombre=nombre, legado=c["legado"], base=base, nulo=c["nulo"] and not c["identidad"], attrs=attrs, identidad=c["identidad"]))
    mo["mapa_col"] = mapa_col
    nombres = [f["nombre"] for f in mo["campos"]]

    # clave primaria
    pk = [mapa_col[c.lower()] for c in t["pk"] if c.lower() in mapa_col]
    if not pk:
        ident = [f["nombre"] for f in mo["campos"] if f["identidad"]]
        if ident:
            pk = ident[:1]
            informe["pk_por_identidad"].append(t["legado"])
        else:
            mo["sustituta"] = True
            pk = ["wms_id"]
            informe["clave_sustituta"].append(t["legado"])
    mo["pk"] = pk
    for f in mo["campos"]:
        if f["nombre"] in pk:
            f["nulo"] = False
    for u in t["unicos"]:
        cu = [mapa_col[c.lower()] for c in u if c.lower() in mapa_col]
        if cu and set(cu) != set(pk):
            mo["extra"].append("@@unique([" + ", ".join(cu) + "])")
    for nombre_c, expr in t["computadas"]:
        informe["columnas_calculadas"].append(f"{t['legado']}.{nombre_c} = {expr}")

# ---------- relaciones ----------
def conjuntos_unicos(mo):
    s = [set(mo["pk"])]
    for e in mo["extra"]:
        m = re.match(r"@@unique\(\[(.*)\]\)", e)
        if m:
            s.append({x.strip() for x in m.group(1).split(",")})
    return s


def tipo_campo(mo, nombre):
    if nombre == "wms_id":
        return ("BigInt", "")
    for f in mo["campos"]:
        if f["nombre"] == nombre:
            return (f["base"], next((a for a in f["attrs"] if a.startswith("@db.")), ""))
    return None


relaciones = []
vistas_fk = set()
for k, mo in modelos.items():
    for nombre_fk, ch, padre_k, cp in mo["t"]["fks"]:
        padre = modelos[padre_k]
        hijos = [mo["mapa_col"].get(c.lower()) for c in ch]
        padres = [padre["mapa_col"].get(c.lower()) for c in cp]
        if None in hijos or None in padres:
            informe["fk_omitidas"].append(f"{mo['t']['legado']} {nombre_fk}: columna inexistente")
            continue
        if set(padres) not in conjuntos_unicos(padre):
            informe["fk_omitidas"].append(f"{mo['t']['legado']} {nombre_fk}: el padre {padre['t']['legado']} no tiene PK/UNIQUE sobre {cp}")
            continue
        if any(tipo_campo(mo, h) != tipo_campo(padre, p) for h, p in zip(hijos, padres)):
            informe["fk_omitidas"].append(
                f"{mo['t']['legado']} {nombre_fk}: tipos distintos entre hijo y padre (Prisma los exige iguales)"
            )
            continue
        firma = (k, tuple(hijos), padre_k, tuple(padres))
        if firma in vistas_fk:
            informe["fk_duplicadas"].append(f"{mo['t']['legado']} {nombre_fk}: igual a otra FK ya incluida (mismas columnas y padre)")
            continue
        vistas_fk.add(firma)
        relaciones.append((k, sanear(nombre_fk)[:50], hijos, padre_k, padres, nombre_fk))

contador = defaultdict(int)
for k, nrel, hijos, padre_k, padres, nombre_fk in relaciones:
    mo, padre = modelos[k], modelos[padre_k]
    contador[k] += 1
    opcional = any(f["nulo"] for f in mo["campos"] if f["nombre"] in hijos)
    nombre_bd = sanear(nombre_fk)[:63]
    rel = f'@relation("{nrel}", fields: [{", ".join(hijos)}], references: [{", ".join(padres)}], onDelete: NoAction, onUpdate: NoAction, map: "{nombre_bd}")'
    mo["campos"].append(dict(nombre=f"rel_{padre['tabla']}_{contador[k]}"[:60], rel=True, linea=f'{padre["nombre"]}{"?" if opcional else ""} {rel}'))
    padre["campos"].append(dict(nombre=f"hijos_{mo['tabla']}_{contador[k]}"[:60], rel=True, linea=f'{mo["nombre"]}[] @relation("{nrel}")'))

# ---------- salida ----------
por_archivo = defaultdict(list)
for mo in modelos.values():
    por_archivo[mo["modulo"]].append(mo)

import os

os.makedirs(DIR_SALIDA, exist_ok=True)
CABECERA = (
    "// GENERADO por scripts/legado/convertir_tablas.py desde el DDL de CO_DLL_BASE. No editar a mano: edite el conversor\n"
    "// o muévase a un modelo propio cuando el módulo se rediseñe. Los campos se llaman como la columna (snake_case).\n\n"
)
for modulo, lista in sorted(por_archivo.items()):
    out = [CABECERA]
    for mo in sorted(lista, key=lambda m: m["nombre"]):
        out.append(f"/// Legado: [dbo].[{mo['t']['legado']}]" + (" · clave sustituta wms_id" if mo["sustituta"] else ""))
        out.append(f"model {mo['nombre']} {{")
        if mo["sustituta"]:
            out.append("  wms_id BigInt @id @default(autoincrement())")
        ancho = max([len(f["nombre"]) for f in mo["campos"]] + [8])
        simples_pk = len(mo["pk"]) == 1 and not mo["sustituta"]
        for f in mo["campos"]:
            if f.get("rel"):
                out.append(f"  {f['nombre'].ljust(ancho)} {f['linea']}")
                continue
            attrs = list(f["attrs"])
            if simples_pk and f["nombre"] == mo["pk"][0]:
                attrs.insert(0, "@id")
            out.append(f"  {f['nombre'].ljust(ancho)} {f['base']}{'?' if f['nulo'] else ''} {' '.join(attrs)}".rstrip())
        if len(mo["pk"]) > 1:
            out.append(f"\n  @@id([{', '.join(mo['pk'])}])")
        for e in mo["extra"]:
            out.append(f"  {e}")
        for cols in INDICES.get(mo["tabla"], []):
            nombre_ix = ("ix_" + mo["tabla"] + "_" + "_".join(cols))[:63]
            out.append(f'  @@index([{", ".join(cols)}], map: "{nombre_ix}")')
        out.append(f'  @@map("{mo["tabla"]}")')
        out.append("}\n")
    with open(os.path.join(DIR_SALIDA, f"{modulo}.prisma"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(out))

with open(RUTA_INFORME, "w", encoding="utf-8", newline="\n") as fh:
    w = fh.write
    w("# Mapeo del esquema legado (generado)\n\n")
    w(f"Tablas convertidas: **{len(modelos)}** · relaciones: **{len(relaciones)}**. Generado por `scripts/legado/convertir_tablas.py`.\n\n")
    w("## Tablas por archivo de esquema\n\n| Archivo | Modelo | Tabla nueva | Tabla legada |\n|---|---|---|---|\n")
    for modulo, lista in sorted(por_archivo.items()):
        for mo in sorted(lista, key=lambda m: m["nombre"]):
            w(f"| {modulo}.prisma | {mo['nombre']} | {mo['tabla']} | {mo['t']['legado']} |\n")
    titulos = {
        "excluidas": "Tablas excluidas (temporales o de prueba)",
        "clave_sustituta": "Tablas sin PK ni IDENTITY: se agregó la clave `wms_id` (al migrar datos se numera sola)",
        "pk_por_identidad": "Tablas sin PK: se usó la columna IDENTITY como clave",
        "identidades": "Columnas IDENTITY (al migrar datos hay que ajustar la secuencia con setval)",
        "columnas_calculadas": "Columnas calculadas NO convertidas (reconstruir como vista, GENERATED o en código)",
        "defaults_no_convertidos": "Valores por defecto NO convertidos (expresiones T-SQL)",
        "tipos_no_soportados": "Columnas con tipo no soportado (omitidas)",
        "columnas_renombradas": "Columnas renombradas por colisión",
        "fk_omitidas": "Claves foráneas omitidas",
        "fk_duplicadas": "Claves foráneas duplicadas en el legado (se conserva una)",
        "fk_fuera_del_nucleo": "Claves foráneas hacia tablas fuera del núcleo (omitidas)",
        "lineas_no_reconocidas": "Líneas del DDL no reconocidas",
    }
    for clave, titulo in titulos.items():
        items = informe.get(clave, [])
        if items:
            w(f"\n## {titulo} ({len(items)})\n\n")
            for i in items:
                w(f"- {i}\n")

print(f"{len(modelos)} modelos, {len(relaciones)} relaciones, archivos: {sorted(por_archivo)}")
for clave in ("excluidas", "clave_sustituta", "pk_por_identidad", "columnas_calculadas", "defaults_no_convertidos", "tipos_no_soportados", "fk_omitidas"):
    print(f"  {clave}: {len(informe.get(clave, []))}")
