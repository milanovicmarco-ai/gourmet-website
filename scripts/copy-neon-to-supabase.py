"""
Copia el catálogo base de Neon → Supabase (tablas catalog_brands,
catalog_families, catalog_products creadas por
supabase/migrations/20261107_catalog_core.sql).

- Neon solo se LEE. No se borra ni modifica nada allí.
- En Supabase hace upsert (insertar o actualizar por clave): se puede
  ejecutar varias veces sin duplicar.
- Al final compara recuentos y un hash de cada producto en ambos lados.

Uso (desde la raíz del repo):
  export DATABASE_URL="postgresql://...neon..."      # conexión a Neon
  python3 -I scripts/copy-neon-to-supabase.py         # lee .env para Supabase
"""

import datetime
import decimal
import hashlib
import json
import os
import sys
import urllib.request

import psycopg2
import psycopg2.extras


def load_env(path=".env"):
    env = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = load_env()
SB_URL = ENV["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
SB_KEY = ENV["SUPABASE_SERVICE_ROLE_KEY"]
NEON = os.environ.get("DATABASE_URL")
if not NEON:
    sys.exit("Falta DATABASE_URL (Neon).")


def to_json(v):
    if isinstance(v, decimal.Decimal):
        return float(v)
    if isinstance(v, (datetime.date, datetime.datetime)):
        return v.isoformat()
    return v


def rows(cur, sql):
    cur.execute(sql)
    return [{k: to_json(v) for k, v in r.items()} for r in cur.fetchall()]


def sb(method, path, body=None, prefer=None):
    headers = {"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}", "Content-Type": "application/json"}
    if prefer:
        headers["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{SB_URL}/rest/v1/{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            txt = r.read().decode()
            return json.loads(txt) if txt else None
    except urllib.error.HTTPError as e:
        sys.exit(f"Supabase {method} {path} → HTTP {e.code}: {e.read().decode()[:500]}")


def upsert(table, items, key, chunk=200):
    for i in range(0, len(items), chunk):
        sb("POST", f"{table}?on_conflict={key}", items[i : i + chunk], prefer="resolution=merge-duplicates,return=minimal")
    print(f"  {table}: {len(items)} filas copiadas")


def fetch_all(table, select="*", order="ref"):
    out, start = [], 0
    while True:
        page = sb("GET", f"{table}?select={select}&order={order}&offset={start}&limit=1000")
        out += page
        if len(page) < 1000:
            return out
        start += 1000


def fingerprint(p):
    """Hash estable de un producto (valores normalizados)."""
    norm = {}
    for k, v in sorted(p.items()):
        if isinstance(v, float):
            # Ruido de serialización en el decimal 16 (p. ej. 0.7535444504708289 vs …829).
            v = int(v) if v.is_integer() else round(v, 9)
        norm[k] = v
    return hashlib.sha1(json.dumps(norm, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def main():
    conn = psycopg2.connect(NEON)
    conn.set_session(readonly=True)  # garantía: Neon solo lectura
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    brands = rows(cur, "select * from brands order by slug")
    families = rows(cur, "select * from families order by slug")
    products = rows(cur, "select * from products order by ref")
    print(f"Neon: {len(brands)} marcas, {len(families)} familias, {len(products)} productos")

    print("Copiando a Supabase…")
    upsert("catalog_brands", brands, "slug")
    upsert("catalog_families", families, "slug")
    upsert("catalog_products", products, "ref")

    print("Verificando…")
    sb_products = fetch_all("catalog_products")
    sb_brands = fetch_all("catalog_brands", order="slug")
    sb_families = fetch_all("catalog_families", order="slug")
    neon_fp = {p["ref"]: fingerprint(p) for p in products}
    sb_fp = {p["ref"]: fingerprint(p) for p in sb_products}
    missing = sorted(set(neon_fp) - set(sb_fp))
    extra = sorted(set(sb_fp) - set(neon_fp))
    diff = sorted(r for r in neon_fp.keys() & sb_fp.keys() if neon_fp[r] != sb_fp[r])
    print(f"  marcas:    Neon {len(brands)}  / Supabase {len(sb_brands)}")
    print(f"  familias:  Neon {len(families)} / Supabase {len(sb_families)}")
    print(f"  productos: Neon {len(products)} / Supabase {len(sb_products)}")
    print(f"  productos que faltan en Supabase: {len(missing)} {missing[:10]}")
    print(f"  productos de más en Supabase:     {len(extra)} {extra[:10]}")
    print(f"  productos con datos distintos:    {len(diff)} {diff[:10]}")
    if diff:
        r = diff[0]
        a = next(p for p in products if p["ref"] == r)
        b = next(p for p in sb_products if p["ref"] == r)
        for k in sorted(a):
            if json.dumps(a[k], sort_keys=True) != json.dumps(b.get(k), sort_keys=True):
                print(f"    {r}.{k}: Neon={a[k]!r:.120} Supabase={b.get(k)!r:.120}")
    ok = not missing and not extra and not diff and len(sb_brands) == len(brands) and len(sb_families) == len(families)
    print("RESULTADO:", "OK, copia idéntica" if ok else "HAY DIFERENCIAS (revisar arriba)")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
