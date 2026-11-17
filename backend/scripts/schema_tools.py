"""
Mantiene el SQL del repositorio y el diagrama iguales a la base de datos desplegada (solo lectura).

Uso (desde backend/, con el .env que apunta a la BD):
    python scripts/schema_tools.py check   Compara la BD con database/schema_vincula_completo.sql.
                                           Termina con código 1 si hay diferencias (sirve en CI).
    python scripts/schema_tools.py dbml    Genera docs/diagrama_bd.dbml desde el catálogo de la BD
                                           para pegarlo en https://dbdiagram.io (diagrama MER interactivo,
                                           exportable a PNG/PDF).

Compara tablas, columnas y valores de enums. No compara índices, defaults ni restricciones CHECK.
"""

import asyncio
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from sqlalchemy import text  # noqa: E402

from app.core import database as db  # noqa: E402

SCHEMA_SQL = os.path.join(ROOT, "database", "schema_vincula_completo.sql")
DBML_OUT = os.path.join(ROOT, "docs", "diagrama_bd.dbml")


def parse_sql(path: str):
    """Tablas (con columnas) y enums declarados en el SQL, incluidos ALTER ... ADD COLUMN/VALUE."""
    sql = re.sub(r"--[^\n]*", "", open(path, encoding="utf-8").read())
    tablas = {}
    for m in re.finditer(r"CREATE TABLE(?: IF NOT EXISTS)?\s+(\w+)\s*\((.*?)\n\);", sql, re.S):
        cols = set()
        for line in m.group(2).split("\n"):
            line = line.strip().rstrip(",")
            if line and not re.match(r"(PRIMARY|UNIQUE|CONSTRAINT|FOREIGN|CHECK|EXCLUDE)\b", line, re.I):
                cols.add(line.split()[0].strip('"'))
        tablas[m.group(1)] = cols
    for m in re.finditer(r"ALTER TABLE\s+(\w+)\s+ADD COLUMN(?: IF NOT EXISTS)?\s+(\w+)", sql, re.I):
        tablas.setdefault(m.group(1), set()).add(m.group(2))
    enums = {}
    for m in re.finditer(r"CREATE TYPE\s+(\w+)\s+AS ENUM\s*\((.*?)\);", sql, re.S):
        enums[m.group(1)] = set(re.findall(r"'([^']*)'", m.group(2)))
    for m in re.finditer(r"ALTER TYPE\s+(\w+)\s+ADD VALUE(?: IF NOT EXISTS)?\s+'([^']*)'", sql, re.I):
        enums.setdefault(m.group(1), set()).add(m.group(2))
    return tablas, enums


async def read_catalog(session):
    """Tablas, columnas, claves y enums de la BD, tal como existen hoy."""
    q = lambda sql: session.execute(text(sql))  # noqa: E731
    cols = {}
    for t, c, tipo, notnull in (await q("""
        SELECT c.relname, a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull
        FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
        WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
        ORDER BY c.relname, a.attnum""")).fetchall():
        cols.setdefault(t, []).append((c, tipo, notnull))
    pk = {}
    uq = set()
    for tipo, t, ncols, c in (await q("""
        SELECT k.contype::text, c.relname, array_length(k.conkey, 1), a.attname
        FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid
        JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(k.conkey)
        WHERE c.relnamespace = 'public'::regnamespace AND k.contype IN ('p', 'u')""")).fetchall():
        if tipo == "p":
            pk.setdefault(t, set()).add(c)
        elif ncols == 1:
            uq.add((t, c))
    fks = (await q("""
        SELECT c.relname, rc.relname,
               array(SELECT a.attname FROM unnest(k.conkey) WITH ORDINALITY u(n, i)
                     JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = u.n ORDER BY u.i),
               array(SELECT a.attname FROM unnest(k.confkey) WITH ORDINALITY u(n, i)
                     JOIN pg_attribute a ON a.attrelid = k.confrelid AND a.attnum = u.n ORDER BY u.i)
        FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid JOIN pg_class rc ON rc.oid = k.confrelid
        WHERE k.contype = 'f' AND c.relnamespace = 'public'::regnamespace ORDER BY c.relname, k.conname""")).fetchall()
    enums = {}
    for n, v in (await q("""
        SELECT t.typname, e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE t.typnamespace = 'public'::regnamespace ORDER BY t.typname, e.enumsortorder""")).fetchall():
        enums.setdefault(n, []).append(v)
    return cols, pk, uq, fks, enums


async def check() -> int:
    t_sql, e_sql = parse_sql(SCHEMA_SQL)
    async with db.AsyncSessionLocal() as s:
        cols, _, _, fks, e_db = await read_catalog(s)
    t_db = {t: {c for c, _, _ in v} for t, v in cols.items()}
    problemas = []
    for t in sorted(set(t_db) - set(t_sql)):
        problemas.append(f"Tabla en la BD que falta en el SQL: {t}")
    for t in sorted(set(t_sql) - set(t_db)):
        problemas.append(f"Tabla en el SQL que no existe en la BD (migración sin aplicar): {t}")
    for t in sorted(set(t_db) & set(t_sql)):
        if t_db[t] - t_sql[t]:
            problemas.append(f"{t}: columnas en la BD que faltan en el SQL: {sorted(t_db[t] - t_sql[t])}")
        if t_sql[t] - t_db[t]:
            problemas.append(f"{t}: columnas en el SQL que no existen en la BD: {sorted(t_sql[t] - t_db[t])}")
    for n in sorted(set(e_db) | set(e_sql)):
        if set(e_db.get(n, [])) != e_sql.get(n, set()):
            problemas.append(f"Enum {n}: BD={e_db.get(n)} SQL={sorted(e_sql.get(n, []))}")
    print(f"BD: {len(t_db)} tablas, {len(e_db)} enums, {len(fks)} claves foráneas | SQL: {len(t_sql)} tablas, {len(e_sql)} enums")
    if problemas:
        print("\nHAY DIFERENCIAS entre la BD desplegada y database/schema_vincula_completo.sql:")
        print("\n".join(f"  - {p}" for p in problemas))
        return 1
    print("OK: el SQL del repositorio coincide con la base de datos desplegada.")
    return 0


def dbml_type(tipo: str, enums) -> str:
    tipo = (tipo.replace("character varying", "varchar").replace("timestamp with time zone", "timestamptz")
            .replace("timestamp without time zone", "timestamp").replace("double precision", "float"))
    return tipo if tipo in enums or re.fullmatch(r"[\w\[\]\(\),]+", tipo) else f'"{tipo}"'


async def dbml() -> int:
    async with db.AsyncSessionLocal() as s:
        cols, pk, uq, fks, enums = await read_catalog(s)
    out = ["// Generado por backend/scripts/schema_tools.py desde la base de datos desplegada. No editar a mano.",
           "// Pégalo en https://dbdiagram.io para ver el diagrama MER y exportarlo a PNG o PDF.", ""]
    for n, vals in enums.items():
        out += [f"Enum {n} {{"] + [f'  "{v}"' for v in vals] + ["}", ""]
    for t, columnas in cols.items():
        out.append(f"Table {t} {{")
        for c, tipo, notnull in columnas:
            attrs = (["pk"] if c in pk.get(t, ()) else []) + (["unique"] if (t, c) in uq else []) + ([] if notnull or c in pk.get(t, ()) else ["null"])
            out.append(f"  {c} {dbml_type(tipo, enums)}" + (f" [{', '.join(attrs)}]" if attrs else ""))
        out += ["}", ""]
    for t, rt, c, rc in fks:
        izq, der = (c[0], rc[0]) if len(c) == 1 else (f"({', '.join(c)})", f"({', '.join(rc)})")
        out.append(f"Ref: {t}.{izq} > {rt}.{der}")
    with open(DBML_OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out) + "\n")
    print(f"Escrito {os.path.relpath(DBML_OUT, ROOT)}: {len(cols)} tablas, {len(enums)} enums, {len(fks)} relaciones")
    return 0


def main() -> int:
    comando = sys.argv[1] if len(sys.argv) > 1 else ""
    if comando not in ("check", "dbml"):
        print(__doc__)
        return 2
    db.init_engine()
    db.engine.echo = False
    return asyncio.run(check() if comando == "check" else dbml())


if __name__ == "__main__":
    sys.exit(main())
