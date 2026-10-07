"""Endpoints de consulta del catálogo + alta/edición de productos.

Lectura: pública (sin auth).
Escritura (POST/PUT/DELETE/upload imagen): requiere `Authorization: Bearer <ADMIN_API_KEY>`
vía dependency `require_admin_api_key`.
"""
from __future__ import annotations

import hashlib
import logging
import re
from datetime import date
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
from sqlalchemy import func, select, text as sa_text
from sqlalchemy.orm import Session, load_only, noload

from slugify import slugify

from app.agent.embeddings import embed_text, product_text_repr
from app.agent.tools import buscar_producto
from app.api.deps import require_admin_api_key
from app.api.scoring import compute_optimization_score
from app.config import get_settings
from app.db.models import Brand, Catalog, Embedding, Family, Order, OrderLine, Product
from app.db.session import get_db
from app.services import image_quality


def _make_slug(name: str, ref: str) -> str:
    """Genera slug `{slugify(name)}-{ref}`. Garantiza unicidad sin colisiones."""
    base = slugify(name or "producto", max_length=180)
    return f"{base}-{ref}"


def _normalize_families(values: list[str] | None) -> list[str]:
    """uppercase + strip + dedupe preservando orden. None/[] → []."""
    if not values:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for v in values:
        if not isinstance(v, str):
            continue
        f = v.strip().upper()
        if f and f not in seen:
            seen.add(f)
            out.append(f)
    return out


def _normalize_catalog_slugs(values: list[str] | None) -> list[str]:
    """lowercase + strip + dedupe preservando orden. None/[] → []."""
    if not values:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for v in values:
        if not isinstance(v, str):
            continue
        s = v.strip().lower()
        if s and s not in seen:
            seen.add(s)
            out.append(s)
    return out


def _resolve_catalogs(db: Session, slugs: list[str]) -> list[Catalog]:
    """Convierte slugs (string) a entidades Catalog. 404 si alguno no existe.

    Marco manda `catalogs=['horeca','retail-premium']`; resolvemos a las
    entidades para asignar vía relationship. Si quieres tolerar slugs
    desconocidos sin romper, llama a esto fuera de este helper.
    """
    if not slugs:
        return []
    rows = db.scalars(select(Catalog).where(Catalog.slug.in_(slugs))).all()
    found = {c.slug for c in rows}
    missing = [s for s in slugs if s not in found]
    if missing:
        raise HTTPException(
            404,
            f"Catálogo(s) inexistente(s): {missing}. Crea el catálogo primero "
            "con POST /catalog/catalogs.",
        )
    return list(rows)


def _resolve_families(family: str | None, families: list[str] | None) -> tuple[str, list[str]]:
    """Reconcilia `family` (single, compat) y `families` (multi).

    Reglas:
    - Si viene `families`: usar normalizada; family = families[0].
    - Si solo viene `family`: families = [family].
    - Si vienen ambos: prevalece `families` (más expresivo); family se sincroniza a [0].

    Lanza HTTP 400 si tras normalizar el resultado quedaría vacío.
    """
    norm = _normalize_families(families)
    if norm:
        return norm[0], norm
    if family and family.strip():
        f = family.strip().upper()
        return f, [f]
    raise HTTPException(400, "Hay que mandar `family` o `families` (no pueden estar ambos vacíos).")

router = APIRouter(tags=["catalog"], prefix="/catalog")

# Campos editoriales que cambian la representación textual del producto y, por tanto,
# requieren regenerar el embedding cuando se modifican. Cualquier otro PUT NO regenera.
_EMBEDDING_TRIGGER_FIELDS = {
    "name", "family", "subfamily", "brand", "origen",
    "descripcion_corta", "description_rich", "alergenos", "ingredientes",
    "tags", "pairings",
    "sin_gluten", "sin_lactosa", "vegetariano", "refrigerado",
}


# Mapeo familia → prefijo de ref (mismo patrón que el seed)
FAMILY_PREFIX = {
    "QUESOS": "QUE",
    "DESPENSA": "DES",
    "EMBUTIDOS": "EMB",
    "CONSERVAS": "CON",
    "BODEGA": "BOD",
    "PANADERIA": "PAN",
}


class ProductCreate(BaseModel):
    """Schema de alta. `ref` opcional (si no se da, se autogenera con _next_product_ref).

    El admin de Marco usa los campos de schema completo (slug, seo_*, status, flavor)
    además de los editoriales. Si no se manda `slug`, se genera automáticamente.
    """
    ref: str | None = Field(default=None, max_length=32, description="Si se omite, se autogenera por familia.")
    name: str = Field(..., min_length=2, max_length=200)
    # Familia principal (compat). Si solo viene `family` y NO `families`, families=[family].
    # Si viene `families`, family se sincroniza a families[0].
    family: str = Field(..., description="QUESOS, DESPENSA, EMBUTIDOS, CONSERVAS, BODEGA, PANADERIA, etc.")
    families: list[str] | None = Field(
        default=None,
        description="Multi-familia (ej. ['QUESOS', 'DOP']). Si se omite, se infiere de `family`.",
    )
    subfamily: str | None = None
    brand: str | None = None
    supplier: str | None = None

    unit_base: str = Field(default="UD", description="KG, UD, L, BOTELLA, etc.")
    base_price_eur: float = Field(default=0, ge=0)
    iva_pct: float = Field(default=10.0, ge=0, le=21)

    stock_actual: int = 0
    stock_minimo: int = 0
    units_per_box: int | None = None

    descripcion_corta: str | None = None
    description_rich: str | None = None
    ingredientes: str | None = None
    alergenos: str | None = None
    info_nutricional: dict | None = None
    origen: str | None = None
    flavor: str | None = None

    sin_gluten: bool = False
    sin_lactosa: bool = False
    vegetariano: bool = False
    refrigerado: bool = False
    venta_a_granel: bool = False
    peso_variable: bool = False

    formato_opciones: list[dict] | None = None  # [{label, peso_kg, precio_eur}]
    tags: list[str] | None = None
    pairings: list[str] | None = None

    # Campos compat admin Marco
    slug: str | None = None  # autogenerado si se omite
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=500)
    status: str = Field(default="published", pattern="^(draft|published|archived)$")

    # Catálogos a los que se asigna en el alta. Lista de slugs (lowercase).
    # Cada slug debe existir como Catalog (si no, 404). Vacío/None → sin asignar.
    catalogs: list[str] | None = Field(
        default=None,
        description="Slugs de catálogos a los que pertenece (ej. ['horeca','retail-premium']).",
    )


def _next_product_ref(db: Session, family: str) -> str:
    """Genera la siguiente ref con el patrón {PREFIX}-XXXX para la familia."""
    prefix = FAMILY_PREFIX.get(family.upper())
    if not prefix:
        raise HTTPException(
            status_code=400,
            detail=f"Familia desconocida. Permitidas: {sorted(FAMILY_PREFIX.keys())}",
        )
    rows = db.scalars(select(Product.ref).where(Product.ref.like(f"{prefix}-%"))).all()
    max_n = 0
    for ref in rows:
        m = re.match(rf"^{prefix}-(\d+)$", ref or "")
        if m:
            n = int(m.group(1))
            if n > max_n:
                max_n = n
    return f"{prefix}-{max_n + 1:04d}"


@router.post(
    "/products",
    status_code=201,
    dependencies=[Depends(require_admin_api_key)],
)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Da de alta un producto en el catálogo. Acepta `ref` explícita (si Aurellano usa
    un sistema propio de códigos como en COLMADO/LSDC) o autogenera por familia.

    Calcula slug y optimization_score automáticamente. Genera embedding inicial.
    """
    family, families_norm = _resolve_families(payload.family, payload.families)

    # Validar FK brand/family antes del insert para devolver 400 (no 500 opaco).
    # Convención: string vacío "" == None (campo sin valor).
    if payload.brand and payload.brand.strip():
        brand_slug = payload.brand.strip().lower()
        if not db.scalar(select(Brand).where(Brand.slug == brand_slug)):
            raise HTTPException(
                400,
                f"La marca '{brand_slug}' no existe. "
                "Créala primero con POST /catalog/brands o elige una existente.",
            )
        payload.brand = brand_slug
    else:
        payload.brand = None
    if family and not db.scalar(select(Family).where(Family.slug == family)):
        raise HTTPException(
            400,
            f"La familia '{family}' no existe. "
            "Créala primero con POST /catalog/families o elige una existente.",
        )
    for fslug in families_norm:
        if not db.scalar(select(Family).where(Family.slug == fslug)):
            raise HTTPException(
                400,
                f"La familia '{fslug}' no existe. "
                "Créala primero con POST /catalog/families.",
            )

    if payload.ref:
        ref_clean = payload.ref.strip()
        existing = db.scalar(select(Product).where(Product.ref == ref_clean))
        if existing:
            raise HTTPException(409, f"Ya existe un producto con ref {ref_clean}")
        new_ref = ref_clean
    else:
        new_ref = _next_product_ref(db, family)

    slug = payload.slug.strip() if payload.slug else _make_slug(payload.name, new_ref)

    p = Product(
        ref=new_ref,
        name=payload.name.strip(),
        brand=payload.brand,
        family=family,
        families=families_norm,
        subfamily=payload.subfamily,
        supplier=payload.supplier,
        unit_base=(payload.unit_base or "UD").upper().strip(),
        base_price_eur=Decimal(str(payload.base_price_eur)),
        iva_pct=Decimal(str(payload.iva_pct)),
        stock_actual=payload.stock_actual,
        stock_minimo=payload.stock_minimo,
        units_per_box=payload.units_per_box,
        active=(payload.status != "archived"),
        status=payload.status,
        descripcion_corta=payload.descripcion_corta,
        description_rich=payload.description_rich,
        ingredientes=payload.ingredientes,
        origen=payload.origen,
        flavor=payload.flavor,
        alergenos=payload.alergenos,
        info_nutricional=payload.info_nutricional,
        sin_gluten=payload.sin_gluten,
        sin_lactosa=payload.sin_lactosa,
        vegetariano=payload.vegetariano,
        refrigerado=payload.refrigerado,
        venta_a_granel=payload.venta_a_granel,
        peso_variable=payload.peso_variable,
        formato_opciones=payload.formato_opciones or None,
        tags=payload.tags or [],
        pairings=payload.pairings or [],
        slug=slug,
        seo_title=payload.seo_title,
        seo_description=payload.seo_description,
        fecha_alta=date.today(),
    )
    # Score inicial (sin image_url todavía, se actualizará tras subir foto)
    p.optimization_score = compute_optimization_score(payload.model_dump())

    # Asignación inicial de catálogos (si Marco lo mandó en el alta)
    catalog_slugs = _normalize_catalog_slugs(payload.catalogs)
    if catalog_slugs:
        p.catalogs = _resolve_catalogs(db, catalog_slugs)

    db.add(p)
    db.flush()

    # Generar embedding para que el agente pueda encontrarlo semánticamente
    try:
        text = product_text_repr(
            {
                "name": p.name, "ref": p.ref, "family": p.family,
                "subfamily": p.subfamily, "brand": p.brand, "origen": p.origen,
                "descripcion_corta": p.descripcion_corta, "alergenos": p.alergenos,
                "sin_gluten": p.sin_gluten, "sin_lactosa": p.sin_lactosa,
                "vegetariano": p.vegetariano, "refrigerado": p.refrigerado,
            }
        )
        db.add(
            Embedding(
                entity_type="product",
                entity_id=p.ref,
                text_repr=text,
                vector=embed_text(text),
            )
        )
    except Exception:  # noqa: BLE001
        # Si OpenAI falla, el producto se crea igual; el embedding se puede regenerar offline.
        pass

    db.commit()
    db.refresh(p)
    return _product_to_public_dict(p)


def _product_to_list_dict(p: Product, score: float | None = None) -> dict[str, Any]:
    """Versión ligera para listados (`?view=list`): solo lo que pinta una tarjeta
    y lo que usan los filtros del escaparate."""
    out: dict[str, Any] = {
        "ref": p.ref,
        "slug": p.slug,
        "name": p.name,
        "family": p.family,
        "families": list(p.families or []),
        "brand": p.brand,
        "active": p.active,
        "status": p.status,
        "image_url": (p.gallery[0] if p.gallery else p.image_url),
        "descripcion_corta": p.descripcion_corta,
        "sin_gluten": p.sin_gluten,
        "sin_lactosa": p.sin_lactosa,
        "vegetariano": p.vegetariano,
    }
    if score is not None:
        out["score"] = round(score, 3)
    return out


def _product_to_public_dict(p: Product, score: float | None = None) -> dict[str, Any]:
    """Serializa un producto para consumo HTTP (portal operario + escaparate público).

    Incluye TODOS los campos editoriales (image_url, description_rich, tags, pairings,
    alergenos, ingredientes, info_nutricional, atributos dietéticos) que el frontend
    Next.js de Aurellano necesita renderizar. Compárese con `_product_to_dict` en
    agent/tools.py, que devuelve un payload comprimido para el LLM.
    """
    out: dict[str, Any] = {
        "ref": p.ref,
        "slug": p.slug,
        "name": p.name,
        # `family` se mantiene como string (gallery[0] equivalente: families[0]).
        # `families` es la lista completa (puede tener 1 o N).
        "family": p.family,
        "families": list(p.families or []),
        "subfamily": p.subfamily,
        # `brand` se mantiene como string (slug) para compat. `brand_obj` es
        # el objeto rico {slug, name, logo_url, origin} cuando el FK apunta a
        # una row de `brands` (bloque 4 wishlist Marco). null si el producto
        # no tiene marca asignada o si la marca fue borrada físicamente.
        "brand": p.brand,
        "brand_obj": (
            {
                "slug": p.brand_obj.slug,
                "name": p.brand_obj.name,
                "logo_url": p.brand_obj.logo_url,
                "origin": p.brand_obj.origin,
            }
            if p.brand_obj
            else None
        ),
        "supplier": p.supplier,
        "origen": p.origen,
        "flavor": p.flavor,
        "unit_base": p.unit_base,
        "base_price_eur": float(p.base_price_eur or 0),
        "iva_pct": float(p.iva_pct or 0),
        "stock_actual": float(p.stock_actual or 0),
        "stock_minimo": p.stock_minimo,
        "units_per_box": p.units_per_box,
        "active": p.active,
        "status": p.status,
        # Compat: image_url = gallery[0] (sincronizada server-side tras cada mutación).
        # Marco puede seguir leyendo image_url igual que antes; los nuevos clientes
        # leen `gallery` para mostrar el carrusel completo.
        "image_url": (p.gallery[0] if p.gallery else p.image_url),
        "gallery": list(p.gallery or []),
        # Calidad visual de gallery[0]. NULL si nunca se calculó (producto sin
        # foto o pre-backfill). `has_enriched_image` = score>0.70 + triple-gate.
        "image_quality_score": p.image_quality_score,
        "has_enriched_image": p.has_enriched_image,
        "descripcion_corta": p.descripcion_corta,
        "description_rich": p.description_rich,
        "ingredientes": p.ingredientes,
        "alergenos": p.alergenos,
        "info_nutricional": p.info_nutricional,
        "formato_opciones": p.formato_opciones or [],
        "tags": p.tags or [],
        "pairings": p.pairings or [],
        "sin_gluten": p.sin_gluten,
        "sin_lactosa": p.sin_lactosa,
        "vegetariano": p.vegetariano,
        "refrigerado": p.refrigerado,
        "venta_a_granel": p.venta_a_granel,
        "peso_variable": p.peso_variable,
        "seo_title": p.seo_title,
        "seo_description": p.seo_description,
        "optimization_score": p.optimization_score,
        # Catálogos asignados (M:N). Lista de {slug, name} ordenada por sort_order.
        # Marco usa esto para mostrar chips/tags en la UI de admin y el escaparate
        # para `/catalogo?catalog=horeca`.
        "catalogs": sorted(
            [{"slug": c.slug, "name": c.name} for c in (p.catalogs or [])],
            key=lambda x: x["slug"],
        ),
        # Compatibilidad: el portal v2 actual lee `descripcion`
        "descripcion": p.descripcion_corta,
    }
    if score is not None:
        out["score"] = round(score, 3)
    return out


@router.get("/products")
def search_products(
    q: str = Query("", description="Texto libre de búsqueda"),
    family: str | None = Query(None, description="Familia opcional"),
    catalog: str | None = Query(None, description="Slug de catálogo (HORECA, retail-premium, ...)"),
    image_quality_filter: str | None = Query(
        None,
        alias="image_quality",
        description=(
            "Filtro por calidad visual de la foto principal. Valores: "
            "'enriched' (has_enriched_image=true, foto lifestyle/editorial), "
            "'plain' (foto sin enriched, normalmente packshot blanco), "
            "'none' (sin foto en gallery)."
        ),
        pattern="^(enriched|plain|none)$",
    ),
    view: str = Query(
        "full",
        pattern="^(full|list)$",
        description=(
            "'full' (default): producto completo. 'list': solo los campos que "
            "necesita un listado/tarjeta (sin description_rich, gallery, SEO…); "
            "~5x menos peso y sin cargar las columnas pesadas de la BD."
        ),
    ),
    limit: int = Query(10, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Listado/búsqueda de productos para portal operario y escaparate público.

    Si `q` está vacío, devuelve catálogo completo paginado.
    Si `q` tiene texto, delega en la tool `buscar_producto` (búsqueda híbrida
    exacta+fuzzy+vectorial) y luego hidrata cada resultado con todos los campos
    editoriales (image_url, description_rich, tags, pairings, alergenos, etc.).

    Filtros opcionales (combinables):
    - `?family=QUESOS` — productos donde families[] contiene 'QUESOS'.
    - `?catalog=horeca` — productos asignados al catálogo con slug 'horeca'.
      Si el catálogo no existe → 404.
    - `?image_quality=enriched|plain|none` — filtra por estado de la foto
      principal (gallery[0]). Calculado vía `app.services.image_quality` y
      mantenido en `Product.has_enriched_image` + `Product.image_quality_score`.
    """
    # Si filtramos por catálogo, restringimos al set de refs del catálogo.
    # Esto vale tanto para el path con `q` como para el listado paginado.
    catalog_refs: set[str] | None = None
    if catalog:
        cat = db.scalar(select(Catalog).where(Catalog.slug == catalog.strip().lower()))
        if not cat:
            raise HTTPException(404, f"Catálogo '{catalog}' no existe.")
        catalog_refs = {p.ref for p in cat.products}
        if not catalog_refs:
            return {"query": q, "results": []}

    if q.strip():
        # Búsqueda híbrida: devuelve refs + score
        search_result = buscar_producto(query=q, family=family, limit=limit)
        refs_in_order = [r["ref"] for r in search_result["results"]]
        scores_by_ref = {r["ref"]: r.get("score") for r in search_result["results"]}
        if catalog_refs is not None:
            refs_in_order = [r for r in refs_in_order if r in catalog_refs]
        if not refs_in_order:
            return {"query": q, "results": []}

        # Hidratar con todos los campos editoriales preservando el orden por score
        rows = db.scalars(select(Product).where(Product.ref.in_(refs_in_order))).all()
        if image_quality_filter:
            rows = _apply_image_quality_filter(rows, image_quality_filter)
        by_ref = {p.ref: p for p in rows}
        serialize = _product_to_list_dict if view == "list" else _product_to_public_dict
        hydrated = [
            serialize(by_ref[ref], score=scores_by_ref.get(ref))
            for ref in refs_in_order
            if ref in by_ref
        ]
        return {"query": q, "results": hydrated}

    # Listado paginado sin búsqueda
    stmt = select(Product).where(Product.active.is_(True))
    if family:
        # Multi-familia: incluye productos donde la family esté en `families[]`.
        # Más permisivo que `Product.family == X` (incluye productos donde X
        # NO es la principal pero sí está asignada como secundaria).
        stmt = stmt.where(Product.families.contains([family.upper().strip()]))
    if catalog_refs is not None:
        stmt = stmt.where(Product.ref.in_(catalog_refs))
    if image_quality_filter == "enriched":
        stmt = stmt.where(Product.has_enriched_image.is_(True))
    elif image_quality_filter == "plain":
        # "plain" = tiene gallery pero NO es enriched.
        stmt = stmt.where(
            Product.has_enriched_image.is_(False),
            func.cardinality(Product.gallery) > 0,
        )
    elif image_quality_filter == "none":
        stmt = stmt.where(func.cardinality(Product.gallery) == 0)
    stmt = stmt.order_by(Product.family.asc(), Product.name.asc()).offset(offset).limit(limit)
    if view == "list":
        # Solo las columnas de listado; sin cargar relaciones (brand_obj/catalogs).
        stmt = stmt.options(
            load_only(
                Product.ref, Product.slug, Product.name, Product.family,
                Product.families, Product.brand, Product.active, Product.status,
                Product.gallery, Product.image_url, Product.descripcion_corta,
                Product.sin_gluten, Product.sin_lactosa, Product.vegetariano,
            ),
            noload(Product.brand_obj),
            noload(Product.catalogs),
        )
    rows = db.scalars(stmt).all()
    serialize = _product_to_list_dict if view == "list" else _product_to_public_dict
    return {
        "query": "",
        "results": [serialize(p) for p in rows],
    }


def _apply_image_quality_filter(
    rows: list[Product], image_quality_filter: str
) -> list[Product]:
    """Filtro en memoria para el path con `q` (no podemos meterlo en el SQL
    porque el orden viene determinado por el ranking de búsqueda híbrida)."""
    if image_quality_filter == "enriched":
        return [p for p in rows if p.has_enriched_image]
    if image_quality_filter == "plain":
        return [p for p in rows if not p.has_enriched_image and (p.gallery or [])]
    if image_quality_filter == "none":
        return [p for p in rows if not (p.gallery or [])]
    return list(rows)


@router.get("/families")
def list_families(db: Session = Depends(get_db)) -> list[dict]:
    """Lista familias del catálogo con su contador de productos + entidad rica.

    Cuenta sobre `families[]` con `unnest`: un producto con `families=['QUESOS','DOP']`
    suma 1 en QUESOS y 1 en DOP. Resultado correcto para el dropdown de filtro.

    **Bloque 4 (LIVE 2026-05-09)**: si el slug existe en la tabla `families` (entidad
    rica con name/description/color/sort_order), se devuelven esos campos. Si solo
    aparece en algún `products.families[]` pero no como entidad, se devuelve un
    fallback con `name = humanize(slug)` y los demás campos a None.

    Ordenación: por `sort_order` ASC, luego por `name` ASC. Los slugs sin entidad
    quedan al final con sort_order=99999 (Marco puede crearlos desde el admin).
    """
    rows = db.execute(
        sa_text(
            "SELECT f, COUNT(*) AS n "
            "FROM (SELECT unnest(families) AS f FROM products WHERE active IS TRUE) sub "
            "GROUP BY f"
        )
    ).all()
    counts: dict[str, int] = {r[0]: int(r[1]) for r in rows if r[0]}

    # Cargar todas las entidades family de golpe para el join en memoria
    entities: dict[str, Family] = {
        f.slug: f
        for f in db.scalars(select(Family)).all()
    }

    # Unir keysets: cualquier slug que aparezca en products.families[] o como entidad
    all_slugs = set(counts.keys()) | set(entities.keys())

    out: list[dict] = []
    for slug in all_slugs:
        ent = entities.get(slug)
        out.append(
            {
                "slug": slug,
                # Compat: el campo histórico `family` sigue siendo el slug
                "family": slug,
                "name": ent.name if ent else slug.replace("_", " ").title(),
                "description": ent.description if ent else None,
                "parent_slug": ent.parent_slug if ent else None,
                "color": ent.color if ent else None,
                "sort_order": ent.sort_order if ent else 99999,
                "active": ent.active if ent else True,
                "count": counts.get(slug, 0),
                "is_entity": ent is not None,
            }
        )
    out.sort(key=lambda r: (r["sort_order"], r["name"]))
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Detalle / edición / borrado / upload imagen
# Usados por el admin del escaparate Next.js de Marco.
# ─────────────────────────────────────────────────────────────────────────────


def _regen_embedding(db: Session, p: Product) -> None:
    """Regenera el embedding de un producto. Idempotente: borra el previo y crea uno nuevo.

    Si OpenAI falla, NO levanta excepción (el producto se actualiza igual; el embedding
    se puede regenerar offline con el script de seed/migrate).
    """
    try:
        text = product_text_repr(
            {
                "name": p.name,
                "ref": p.ref,
                "family": p.family,
                "subfamily": p.subfamily,
                "brand": p.brand,
                "origen": p.origen,
                "descripcion_corta": p.descripcion_corta,
                "alergenos": p.alergenos,
                "sin_gluten": p.sin_gluten,
                "sin_lactosa": p.sin_lactosa,
                "vegetariano": p.vegetariano,
                "refrigerado": p.refrigerado,
            }
        )
        vector = embed_text(text)
    except Exception:  # noqa: BLE001
        return

    # Idempotencia: borra cualquier embedding previo de este producto
    db.execute(
        Embedding.__table__.delete().where(
            (Embedding.entity_type == "product") & (Embedding.entity_id == p.ref)
        )
    )
    db.add(
        Embedding(
            entity_type="product",
            entity_id=p.ref,
            text_repr=text,
            vector=vector,
        )
    )


@router.get("/products/catalogs-batch")
def get_product_catalogs_batch(
    refs: str = Query(..., description="Refs separadas por coma, ej. '17601,17602,17603'."),
    db: Session = Depends(get_db),
) -> dict[str, list[dict[str, str]]]:
    """Devuelve un mapa `{ref: [{slug, name}]}` para varios productos en una sola query.

    Resuelve el problema N+1 del listado del admin (antes hacía 50 GETs paralelos
    para hidratar el campo `catalogs` de cada fila). Una sola query SQL con JOIN
    cubre el batch completo.

    - Refs inexistentes simplemente no aparecen en el dict (no es un error).
    - Refs sin catálogos asignados aparecen con lista vacía `[]`.
    - Límite duro de 500 refs por petición para evitar abusos / URLs gigantes.

    DECLARADO ANTES DE `/products/{ref}` para que FastAPI no matchee
    "catalogs-batch" como un `ref`.
    """
    ref_list = [r.strip() for r in refs.split(",") if r.strip()]
    if not ref_list:
        return {}
    if len(ref_list) > 500:
        raise HTTPException(400, f"Demasiadas refs ({len(ref_list)}); máximo 500 por petición.")

    # Una query: products con catalogs cargados via selectin (ya activado en el modelo).
    # SQLAlchemy hace 2 queries reales (productos + catalogs vía secondary table) en lugar
    # de N — para 50 productos pasamos de 50 RTTs a 1 RTT total.
    rows = db.scalars(
        select(Product).where(Product.ref.in_(ref_list))
    ).unique().all()

    out: dict[str, list[dict[str, str]]] = {ref: [] for ref in ref_list}
    for p in rows:
        out[p.ref] = sorted(
            [{"slug": c.slug, "name": c.name} for c in (p.catalogs or [])],
            key=lambda x: x["slug"],
        )
    return out


@router.get("/products/{ref}")
def get_product(ref: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Detalle completo de un producto por ref. Usado por el admin de Marco para cargar
    el formulario de edición y por el escaparate público para la página de producto.
    """
    p = db.scalar(select(Product).where(Product.ref == ref))
    if not p:
        raise HTTPException(404, f"Producto {ref} no existe")
    return _product_to_public_dict(p)


class ProductUpdate(BaseModel):
    """Patch parcial. Cualquier campo `None` se IGNORA (no toca BD).

    Para "vaciar" un campo string opcional, mandar `""`. Para vaciar un array (tags,
    pairings) mandar `[]`. La `ref` NO se puede cambiar (es el primary key).

    El `slug` SÍ se puede cambiar manualmente, pero por defecto NO se regenera al
    cambiar `name` (mantener URL estable). Si quieres regenerarlo, mándalo explícito.
    """

    name: str | None = None
    family: str | None = None
    families: list[str] | None = None  # multi-valor; si se manda, family = families[0]
    subfamily: str | None = None
    brand: str | None = None
    supplier: str | None = None
    unit_base: str | None = None
    base_price_eur: float | None = Field(default=None, ge=0)
    iva_pct: float | None = Field(default=None, ge=0, le=21)
    stock_actual: int | None = None
    stock_minimo: int | None = None
    active: bool | None = None  # legacy (status='archived' lo pone false automáticamente)
    units_per_box: int | None = None
    descripcion_corta: str | None = None
    description_rich: str | None = None
    ingredientes: str | None = None
    alergenos: str | None = None
    info_nutricional: dict | None = None
    origen: str | None = None
    flavor: str | None = None
    sin_gluten: bool | None = None
    sin_lactosa: bool | None = None
    vegetariano: bool | None = None
    refrigerado: bool | None = None
    venta_a_granel: bool | None = None
    peso_variable: bool | None = None
    formato_opciones: list[dict] | None = None
    tags: list[str] | None = None
    pairings: list[str] | None = None
    # Campos compat admin Marco
    slug: str | None = None
    seo_title: str | None = Field(default=None, max_length=200)
    seo_description: str | None = Field(default=None, max_length=500)
    status: str | None = Field(default=None, pattern="^(draft|published|archived)$")

    # Reasignar set completo de catálogos. Si se manda (incluso `[]`), reemplaza
    # la asignación actual (vaciar = quitar de todos los catálogos). Si NO se
    # manda, no se toca. Para añadir/quitar individualmente usar los endpoints
    # `POST /products/{ref}/catalogs` y `DELETE /products/{ref}/catalogs/{slug}`.
    catalogs: list[str] | None = None


@router.put(
    "/products/{ref}",
    dependencies=[Depends(require_admin_api_key)],
)
def update_product(
    ref: str,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Editar producto (patch parcial). Re-embedding automático si cambian campos vectorizables.

    Devuelve el producto actualizado completo (mismo schema que GET).
    """
    p = db.scalar(select(Product).where(Product.ref == ref))
    if not p:
        raise HTTPException(404, f"Producto {ref} no existe")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(400, "Nada que actualizar (payload vacío).")

    # Reconciliación family ↔ families:
    # - Si viene `families`, gana (multi-valor) y family se sincroniza a families[0].
    # - Si viene solo `family`, se sincroniza families = [family] (compat).
    # - Si vienen ambos, gana `families` (mismo criterio que en POST).
    # - Si no viene ninguno, no se toca.
    if "families" in changes or "family" in changes:
        new_family, new_families = _resolve_families(
            changes.get("family") if "family" in changes else p.family,
            changes.get("families") if "families" in changes else None,
        )
        changes["family"] = new_family
        changes["families"] = new_families

    if "unit_base" in changes and changes["unit_base"]:
        changes["unit_base"] = changes["unit_base"].upper().strip()

    # Validar FK brand/family ANTES de hacer setattr — si no, la base devuelve un 500
    # opaco por ForeignKeyViolation. Mejor un 400 claro indicando que hay que crear
    # la entidad primero (POST /brands o POST /families).
    # Convención: string vacío "" == None (limpiar campo). Solo validamos si hay valor.
    if "brand" in changes:
        raw = changes["brand"]
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            changes["brand"] = None
        else:
            brand_slug = str(raw).strip().lower()
            changes["brand"] = brand_slug
            if not db.scalar(select(Brand).where(Brand.slug == brand_slug)):
                raise HTTPException(
                    400,
                    f"La marca '{brand_slug}' no existe en la tabla de marcas. "
                    "Créala primero con POST /catalog/brands o elige una existente.",
                )
    if "family" in changes:
        raw = changes["family"]
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            changes["family"] = None
        else:
            family_slug = str(raw).strip().upper()
            changes["family"] = family_slug
            if not db.scalar(select(Family).where(Family.slug == family_slug)):
                raise HTTPException(
                    400,
                    f"La familia '{family_slug}' no existe en la tabla de familias. "
                    "Créala primero con POST /catalog/families o elige una existente.",
                )
    if "families" in changes and changes["families"]:
        normalized = []
        for fslug in changes["families"]:
            if not fslug or not str(fslug).strip():
                continue
            fslug_norm = str(fslug).strip().upper()
            if not db.scalar(select(Family).where(Family.slug == fslug_norm)):
                raise HTTPException(
                    400,
                    f"La familia '{fslug_norm}' no existe. "
                    "Créala primero con POST /catalog/families.",
                )
            normalized.append(fslug_norm)
        changes["families"] = normalized

    # Reasignación de catálogos si viene `catalogs` en el payload.
    # Reemplaza el set completo (semánticamente PUT-like). Para mutaciones
    # incrementales hay endpoints dedicados (POST/DELETE /products/{ref}/catalogs).
    catalogs_in_payload = "catalogs" in changes
    new_catalogs_slugs: list[str] = []
    if catalogs_in_payload:
        new_catalogs_slugs = _normalize_catalog_slugs(changes.pop("catalogs"))

    # Aplicar cambios
    must_regen_embedding = bool(set(changes.keys()) & _EMBEDDING_TRIGGER_FIELDS)
    for field, value in changes.items():
        if field in {"base_price_eur", "iva_pct"} and value is not None:
            value = Decimal(str(value))
        setattr(p, field, value)

    if catalogs_in_payload:
        # Si la lista viene vacía, vaciamos la asignación. Si trae slugs, validamos que existan.
        p.catalogs = _resolve_catalogs(db, new_catalogs_slugs) if new_catalogs_slugs else []

    # Validación previa a publicar: si el status final será "published",
    # comprobar que están todos los campos obligatorios.
    # Nota: ya hemos aplicado los cambios con setattr arriba, así que `p` tiene el estado final.
    if p.status == "published":
        publish_missing: list[str] = []
        if not p.name or not p.name.strip():
            publish_missing.append("nombre")
        if not p.brand:
            publish_missing.append("marca")
        if not p.family:
            publish_missing.append("familia")
        if not p.descripcion_corta or not p.descripcion_corta.strip():
            publish_missing.append("descripción corta")
        if not p.description_rich or not p.description_rich.strip():
            publish_missing.append("descripción larga")
        if not p.image_url and not (p.gallery or []):
            publish_missing.append("imagen")
        alergenos_raw = p.alergenos if isinstance(p.alergenos, str) else ""
        if not alergenos_raw.strip():
            publish_missing.append("alérgenos")
        if publish_missing:
            db.rollback()
            raise HTTPException(
                400,
                "No se puede publicar. Faltan campos obligatorios: "
                + ", ".join(publish_missing),
            )

    # Sincronizar `active` ↔ `status` (status es el campo canónico, active es derivado)
    if "status" in changes:
        p.active = (p.status != "archived")
    elif "active" in changes:
        # Marco/legacy puede mandar solo `active`; sincronizamos status si entra en conflicto
        if p.active is False and p.status == "published":
            p.status = "archived"
        elif p.active is True and p.status == "archived":
            p.status = "published"

    p.fecha_modificacion = date.today()

    if must_regen_embedding:
        _regen_embedding(db, p)

    # Recalcular optimization_score con todos los campos actuales
    p.optimization_score = compute_optimization_score(_product_to_public_dict(p))

    db.commit()
    db.refresh(p)
    return _product_to_public_dict(p)


@router.get("/products/by-slug/{slug}")
def get_product_by_slug(slug: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Detalle por slug (URL amigable). Usado por el escaparate público en `/producto/[slug]`."""
    p = db.scalar(select(Product).where(Product.slug == slug))
    if not p:
        raise HTTPException(404, f"Producto con slug '{slug}' no existe")
    return _product_to_public_dict(p)


@router.delete(
    "/products/{ref}",
    dependencies=[Depends(require_admin_api_key)],
)
def delete_product(
    ref: str,
    hard: bool = Query(False, description="True = borrado físico (no recuperable)."),
    confirm_ref: str | None = Query(
        None,
        description="Para hard=true: debe coincidir EXACTAMENTE con `ref`. Anti-typo barrier.",
    ),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Borra producto. Por defecto SOFT DELETE (active=False) para preservar histórico de pedidos.

    Con `?hard=true&confirm_ref={ref}` intenta borrado físico:
      - 400 si `confirm_ref` no coincide con `ref` (segunda barrera anti-typo).
      - 409 si hay order_lines referenciando (FK constraint).
      - 200 si éxito (borra también su embedding).

    Recomendación para Marco: usa siempre soft-delete desde la UI. El hard sólo
    se debería usar para limpiar productos de prueba que nunca tuvieron pedidos.
    """
    p = db.scalar(select(Product).where(Product.ref == ref))
    if not p:
        raise HTTPException(404, f"Producto {ref} no existe")

    if not hard:
        if not p.active:
            return {"ref": ref, "status": "already_inactive"}
        p.active = False
        p.fecha_modificacion = date.today()
        db.commit()
        return {"ref": ref, "status": "soft_deleted (active=false)"}

    # Hard delete: barrera anti-typo
    if confirm_ref != ref:
        raise HTTPException(
            400,
            f"hard=true requiere confirm_ref={ref}. Recibido: {confirm_ref!r}. "
            "Esta barrera evita borrados por error (typo en la URL).",
        )

    refs_count = db.scalar(
        select(func.count(OrderLine.id)).where(OrderLine.product_ref == ref)
    )
    if refs_count and refs_count > 0:
        raise HTTPException(
            409,
            f"No se puede borrar {ref}: hay {refs_count} líneas de pedido referenciándolo. "
            "Usa el soft-delete (sin ?hard=true) para desactivar sin perder histórico.",
        )

    db.execute(
        Embedding.__table__.delete().where(
            (Embedding.entity_type == "product") & (Embedding.entity_id == ref)
        )
    )
    db.delete(p)
    db.commit()
    return {"ref": ref, "status": "hard_deleted"}


# ─────────────────────────────────────────────────────────────────────────────
# Galería de imágenes (bloque 1 del wishlist de Marco — api-wishlist.md).
#
# Diseño:
# - `Product.gallery TEXT[]` ordenada (la primera es la principal).
# - `Product.image_url` se mantiene sincronizado con `gallery[0]` tras cada
#   mutación, para no romper queries existentes ni el agente WhatsApp.
# - `public_id` Cloudinary: `aurellano/products/{ref}/{md5_8chars}` — idempotente
#   por hash del contenido (subir la misma imagen 2 veces no duplica en gallery).
# - Endpoints nuevos: POST plural, DELETE, PATCH order, PATCH primary.
# - Endpoint legacy singular `/image` se mantiene como alias (sustituye gallery[0]).
# ─────────────────────────────────────────────────────────────────────────────

_EAGER_TRANSFORM = [
    {"width": 600, "height": 600, "crop": "fill", "quality": "auto", "fetch_format": "auto"}
]
_ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/avif"}
_MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
_CLOUDINARY_PREFIX = "aurellano/products"


def _ensure_cloudinary_configured() -> Any:
    """Configura cloudinary lazy y devuelve el módulo `cloudinary` listo para usar.

    Lanza HTTP 503 si las env vars no están seteadas en el servidor.
    """
    settings = get_settings()
    if not (settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret):
        raise HTTPException(503, "Cloudinary no configurado en el servidor.")

    import cloudinary  # noqa: PLC0415  — import diferido para que el módulo cargue sin la dep
    import cloudinary.uploader  # noqa: PLC0415,F401

    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )
    return cloudinary


def _public_id_for(ref: str, content: bytes) -> str:
    """`aurellano/products/{ref}/{md5_8chars}` — único por contenido y producto.

    Hash MD5 (no usado para crypto, solo deduplicación) garantiza que subir la
    misma imagen no genere duplicados en la galería ni en Cloudinary.
    """
    digest = hashlib.md5(content, usedforsecurity=False).hexdigest()[:12]
    return f"{_CLOUDINARY_PREFIX}/{ref}/{digest}"


def _public_id_from_url(url: str) -> str | None:
    """Extrae `aurellano/products/{ref}/{hash}` de un URL Cloudinary.

    Ejemplo: `https://res.cloudinary.com/aurellano/image/upload/v.../aurellano/products/17601/abc123.png`
    → `aurellano/products/17601/abc123`
    """
    m = re.search(r"/(aurellano/products/[^./]+(?:/[^./]+)?)(?:\.[a-z0-9]+)?$", url, re.IGNORECASE)
    return m.group(1) if m else None


async def _read_upload(file: UploadFile) -> bytes:
    """Valida content-type/size y devuelve los bytes del UploadFile."""
    if file.content_type not in _ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            415,
            f"Content-Type no soportado: {file.content_type}. "
            f"Permitidos: {sorted(_ALLOWED_IMAGE_TYPES)}",
        )
    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Archivo vacío.")
    if len(contents) > _MAX_IMAGE_BYTES:
        raise HTTPException(
            413,
            f"Archivo demasiado grande ({len(contents)} bytes, máx {_MAX_IMAGE_BYTES}).",
        )
    return contents


def _upload_to_cloudinary(content: bytes, public_id: str, ref: str) -> str:
    """Sube `content` a Cloudinary con el `public_id` dado. Devuelve secure_url."""
    cloudinary = _ensure_cloudinary_configured()
    try:
        result = cloudinary.uploader.upload(
            content,
            public_id=public_id,
            overwrite=True,
            resource_type="image",
            eager=_EAGER_TRANSFORM,
            tags=["aurellano", "product", ref],
        )
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"Cloudinary falló: {e}") from e

    secure_url = result.get("secure_url")
    if not secure_url:
        raise HTTPException(502, "Cloudinary no devolvió secure_url.")
    return secure_url


def _destroy_in_cloudinary(public_id: str) -> None:
    """Borra un asset de Cloudinary. Best-effort: si falla, solo logueamos.

    Razón: si Neon ya no referencia el URL, dejarlo huérfano en Cloudinary es
    aceptable (Marco puede limpiar manualmente desde el dashboard si quiere).
    """
    try:
        cloudinary = _ensure_cloudinary_configured()
        cloudinary.uploader.destroy(public_id, invalidate=True)
    except HTTPException:
        # Si Cloudinary no está configurado, no podemos borrar — pero no rompemos.
        logger.warning("Cloudinary no configurado, no se puede borrar %s", public_id)
    except Exception as e:  # noqa: BLE001
        logger.warning("Cloudinary destroy fallo para %s: %s", public_id, e)


def _sync_image_url(p: Product) -> None:
    """`image_url = gallery[0] if gallery else None`. Llamar tras cada mutación."""
    p.image_url = p.gallery[0] if p.gallery else None


def _recompute_image_quality(p: Product, *, old_principal: str | None) -> None:
    """Recalcula `image_quality_score` y `has_enriched_image` SOLO si `gallery[0]` cambió.

    Si la principal sigue siendo la misma URL, no hace nada — la métrica
    cacheada sigue siendo válida. Si `gallery` quedó vacía, ambos campos
    se ponen a NULL/False. Si la descarga falla, los campos previos
    quedan intactos (mejor mantener algo viejo que perderlo).
    """
    new_principal = p.gallery[0] if p.gallery else None
    if new_principal == old_principal:
        return
    if new_principal is None:
        p.image_quality_score = None
        p.has_enriched_image = False
        return
    quality = image_quality.analyze_url(new_principal)
    if quality is None:
        # Descarga falló — no tocar los valores antiguos. El backfill recoge esto luego.
        return
    p.image_quality_score = quality.score
    p.has_enriched_image = quality.is_enriched


def _gallery_response(p: Product) -> dict[str, Any]:
    """Payload estándar tras mutar la galería."""
    return {
        "ref": p.ref,
        "image_url": p.image_url,
        "gallery": list(p.gallery or []),
        "optimization_score": p.optimization_score,
        "image_quality_score": p.image_quality_score,
        "has_enriched_image": p.has_enriched_image,
    }


def _recompute_score(p: Product) -> None:
    p.optimization_score = compute_optimization_score(_product_to_public_dict(p))


# ─── Endpoints galería ──────────────────────────────────────────────────────


@router.post(
    "/products/{ref}/images",
    status_code=201,
    dependencies=[Depends(require_admin_api_key)],
)
async def add_product_image(
    ref: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Añade una foto a la galería del producto (al final del array).

    Idempotente por contenido: si la misma imagen ya está en la galería
    (mismo MD5), no se duplica — devolvemos la URL existente y la galería actual.

    `multipart/form-data` con campo `file` (jpeg/png/webp/avif, ≤10 MB).
    """
    p = db.scalar(select(Product).where(Product.ref == ref))
    if not p:
        raise HTTPException(404, f"Producto {ref} no existe")

    contents = await _read_upload(file)
    public_id = _public_id_for(ref, contents)

    # Dedup: si esta imagen (mismo public_id) ya está en gallery, no la subimos ni añadimos.
    existing_in_gallery = next(
        (u for u in (p.gallery or []) if _public_id_from_url(u) == public_id),
        None,
    )
    if existing_in_gallery:
        return {**_gallery_response(p), "deduplicated": True}

    old_principal = p.gallery[0] if p.gallery else None
    secure_url = _upload_to_cloudinary(contents, public_id, ref)

    # Append al final del array (la principal sigue siendo gallery[0]).
    p.gallery = [*(p.gallery or []), secure_url]
    _sync_image_url(p)
    p.fecha_modificacion = date.today()
    # Si la gallery estaba vacía, esta foto se convierte en principal:
    # podemos calcular el score directamente desde los bytes ya en memoria
    # sin hacer una segunda descarga.
    if old_principal is None:
        try:
            quality = image_quality.analyze_image_bytes(contents)
            p.image_quality_score = quality.score
            p.has_enriched_image = quality.is_enriched
        except Exception:
            logger.warning("image_quality.analyze_image_bytes failed for ref=%s", ref)
    # else: principal no cambió, no tocamos los valores cacheados.
    _recompute_score(p)
    db.commit()
    db.refresh(p)
    return _gallery_response(p)


@router.delete(
    "/products/{ref}/images",
    dependencies=[Depends(require_admin_api_key)],
)
def remove_product_image(
    ref: str,
    url: str = Query(..., description="URL exacta de la imagen a quitar de la galería."),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Quita una imagen concreta de la galería + intenta borrarla de Cloudinary.

    Si la URL no está en la galería, devuelve 404 (no es ambiguo: el cliente
    debería haber leído gallery primero). Si era la principal, la nueva
    principal pasa a ser la siguiente del array.
    """
    p = db.scalar(select(Product).where(Product.ref == ref))
    if not p:
        raise HTTPException(404, f"Producto {ref} no existe")

    current = list(p.gallery or [])
    if url not in current:
        raise HTTPException(404, f"URL no presente en la galería de {ref}.")

    old_principal = current[0] if current else None
    p.gallery = [u for u in current if u != url]
    _sync_image_url(p)
    p.fecha_modificacion = date.today()
    _recompute_image_quality(p, old_principal=old_principal)
    _recompute_score(p)
    db.commit()

    # Cleanup Cloudinary (best-effort, no rompe la transacción)
    pid = _public_id_from_url(url)
    if pid:
        _destroy_in_cloudinary(pid)

    db.refresh(p)
    return _gallery_response(p)


class GalleryOrderPayload(BaseModel):
    order: list[str] = Field(..., min_length=1, description="Lista de URLs en el nuevo orden.")


@router.patch(
    "/products/{ref}/images/order",
    dependencies=[Depends(require_admin_api_key)],
)
def reorder_product_images(
    ref: str,
    payload: GalleryOrderPayload,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Reordena la galería. El `order` debe ser una permutación EXACTA de la galería actual
    (mismas URLs, ningún añadido ni omisión). Cualquier discrepancia → 400.
    """
    p = db.scalar(select(Product).where(Product.ref == ref))
    if not p:
        raise HTTPException(404, f"Producto {ref} no existe")

    current = list(p.gallery or [])
    if sorted(payload.order) != sorted(current):
        raise HTTPException(
            400,
            "El `order` debe contener exactamente las mismas URLs que la galería actual "
            "(sin añadidos ni omisiones). Usa POST/DELETE para mutar el set.",
        )

    old_principal = current[0] if current else None
    p.gallery = list(payload.order)
    _sync_image_url(p)
    p.fecha_modificacion = date.today()
    _recompute_image_quality(p, old_principal=old_principal)
    db.commit()
    db.refresh(p)
    return _gallery_response(p)


class GalleryPrimaryPayload(BaseModel):
    primary: str = Field(..., description="URL que pasa a ser la principal (gallery[0]).")


@router.patch(
    "/products/{ref}/images/primary",
    dependencies=[Depends(require_admin_api_key)],
)
def set_primary_image(
    ref: str,
    payload: GalleryPrimaryPayload,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Marca una URL como principal moviéndola al índice 0. Mantiene el orden relativo del resto."""
    p = db.scalar(select(Product).where(Product.ref == ref))
    if not p:
        raise HTTPException(404, f"Producto {ref} no existe")

    current = list(p.gallery or [])
    if payload.primary not in current:
        raise HTTPException(404, f"URL no presente en la galería de {ref}.")

    old_principal = current[0] if current else None
    rest = [u for u in current if u != payload.primary]
    p.gallery = [payload.primary, *rest]
    _sync_image_url(p)
    p.fecha_modificacion = date.today()
    _recompute_image_quality(p, old_principal=old_principal)
    db.commit()
    db.refresh(p)
    return _gallery_response(p)


# ─── Alias compat singular ──────────────────────────────────────────────────


@router.post(
    "/products/{ref}/image",
    dependencies=[Depends(require_admin_api_key)],
)
async def upload_product_image(
    ref: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """**Legacy / compat**: sustituye `gallery[0]` (la principal) sin tocar las demás.

    Si la galería está vacía, equivale a un `POST /images`. Mantenido para no romper
    integraciones que ya usaban este endpoint con el contrato antiguo.

    Para empezar a gestionar galería completa, usa los endpoints nuevos:
    - `POST /products/{ref}/images` (añadir)
    - `DELETE /products/{ref}/images?url=...` (quitar)
    - `PATCH /products/{ref}/images/order` (reordenar)
    - `PATCH /products/{ref}/images/primary` (marcar principal)
    """
    p = db.scalar(select(Product).where(Product.ref == ref))
    if not p:
        raise HTTPException(404, f"Producto {ref} no existe")

    contents = await _read_upload(file)
    public_id = _public_id_for(ref, contents)
    secure_url = _upload_to_cloudinary(contents, public_id, ref)

    # Sustituye gallery[0]. Si era la misma imagen (mismo URL), idempotente.
    current = list(p.gallery or [])
    if current and current[0] == secure_url:
        # Misma imagen, no hay nada que cambiar
        pass
    elif current:
        # Borra la antigua principal de Cloudinary (best-effort) si era exclusiva.
        old_pid = _public_id_from_url(current[0])
        if old_pid and old_pid != public_id:
            _destroy_in_cloudinary(old_pid)
        current[0] = secure_url
        p.gallery = current
    else:
        p.gallery = [secure_url]

    _sync_image_url(p)
    p.fecha_modificacion = date.today()
    _recompute_score(p)
    db.commit()
    db.refresh(p)

    # Schema de respuesta legacy + nuevos campos para clientes que ya leen gallery
    return {
        "ref": ref,
        "image_url": secure_url,
        "public_id": public_id,
        "gallery": list(p.gallery),
        "optimization_score": p.optimization_score,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Catálogos como entidad (bloque 3 del wishlist de Marco — api-wishlist.md).
#
# Diseño:
# - `catalogs` (uuid pk, slug unique, name, description, color, sort_order, active)
#   y `product_catalogs` (pivote N:M, PK compuesta, ON DELETE CASCADE).
# - Marco crea catálogos desde `/admin/settings/catalogs` y los asigna a
#   productos desde el form de edición (multi-select). El escaparate público
#   filtra `/catalogo?catalog=horeca`.
# - GET listado público (sin auth). Mutaciones requieren ADMIN_API_KEY.
# - El payload de respuesta incluye `product_count` (no se cachea, se calcula
#   por lazy-loaded relationship — barato porque hay <20 catálogos).
# ─────────────────────────────────────────────────────────────────────────────


def _catalog_to_dict(c: Catalog, *, include_count: bool = True) -> dict[str, Any]:
    """Serializa un catálogo. `include_count=True` añade `product_count`
    (cuenta de productos asignados, calculada vía relationship)."""
    out: dict[str, Any] = {
        "id": str(c.id),
        "slug": c.slug,
        "name": c.name,
        "description": c.description,
        "color": c.color,
        "sort_order": c.sort_order,
        "active": c.active,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }
    if include_count:
        out["product_count"] = len(c.products or [])
    return out


class CatalogCreate(BaseModel):
    """Schema de alta de un catálogo. `slug` se normaliza a lowercase + sin espacios.

    Validación: slug solo permite ascii lowercase + dígitos + guión. Sin guiones
    al principio/final, sin guiones consecutivos. Si Marco manda 'HORECA gourmet',
    se transforma a 'horeca-gourmet' automáticamente.
    """

    slug: str = Field(..., min_length=2, max_length=80)
    name: str = Field(..., min_length=2, max_length=200)
    description: str | None = None
    color: str | None = Field(default=None, max_length=20)  # hex con #, ej "#FF6B35"
    sort_order: int = 0
    active: bool = True


class CatalogUpdate(BaseModel):
    """Patch parcial. Cualquier campo `None` se IGNORA. El `slug` SÍ se puede cambiar
    (Marco puede renombrar de `horeca` a `horeca-bcn` si se monta un nuevo catálogo).
    """

    slug: str | None = Field(default=None, min_length=2, max_length=80)
    name: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    color: str | None = Field(default=None, max_length=20)
    sort_order: int | None = None
    active: bool | None = None


def _normalize_slug(s: str) -> str:
    """Normaliza un slug a lowercase + sólo [a-z0-9-]. Usa python-slugify para no
    inventar reglas. Marco puede mandar `'HORECA Gourmet'` y obtenemos `'horeca-gourmet'`.
    """
    return slugify(s, lowercase=True, max_length=80)


# ─── Listado / detalle ──────────────────────────────────────────────────────


@router.get("/catalogs")
def list_catalogs(
    include_inactive: bool = Query(False, description="True para incluir catálogos archivados."),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Lista todos los catálogos con `product_count`. Ordenado por `sort_order` ASC, name ASC.

    Por defecto solo activos. Marco usa `?include_inactive=true` para mostrar
    los archivados en una sección plegada del admin.
    """
    stmt = select(Catalog)
    if not include_inactive:
        stmt = stmt.where(Catalog.active.is_(True))
    stmt = stmt.order_by(Catalog.sort_order.asc(), Catalog.name.asc())
    rows = db.scalars(stmt).all()
    return [_catalog_to_dict(c) for c in rows]


@router.get("/catalogs/{slug}")
def get_catalog(slug: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Detalle por slug. Devuelve el catálogo + product_count."""
    c = db.scalar(select(Catalog).where(Catalog.slug == slug.strip().lower()))
    if not c:
        raise HTTPException(404, f"Catálogo '{slug}' no existe.")
    return _catalog_to_dict(c)


# ─── Mutaciones (auth) ──────────────────────────────────────────────────────


@router.post(
    "/catalogs",
    status_code=201,
    dependencies=[Depends(require_admin_api_key)],
)
def create_catalog(payload: CatalogCreate, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Crea un catálogo. El `slug` se normaliza (lowercase, sin espacios).
    Si ya existe → 409.
    """
    slug_norm = _normalize_slug(payload.slug)
    if not slug_norm:
        raise HTTPException(400, f"Slug inválido tras normalizar: {payload.slug!r}")

    existing = db.scalar(select(Catalog).where(Catalog.slug == slug_norm))
    if existing:
        raise HTTPException(409, f"Ya existe un catálogo con slug '{slug_norm}'")

    c = Catalog(
        slug=slug_norm,
        name=payload.name.strip(),
        description=payload.description,
        color=payload.color,
        sort_order=payload.sort_order,
        active=payload.active,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _catalog_to_dict(c)


@router.put(
    "/catalogs/{slug}",
    dependencies=[Depends(require_admin_api_key)],
)
def update_catalog(
    slug: str,
    payload: CatalogUpdate,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Edita un catálogo. Si se cambia el `slug`, se valida que no colisione
    con otro existente (409) y que la nueva forma sea válida tras normalizar.

    Nota: cambiar el slug puede romper URLs públicas que apunten a `/catalogo?catalog=old-slug`
    o landings/PDFs cacheados — Marco debería evitarlo salvo necesidad real.
    """
    c = db.scalar(select(Catalog).where(Catalog.slug == slug.strip().lower()))
    if not c:
        raise HTTPException(404, f"Catálogo '{slug}' no existe.")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        raise HTTPException(400, "Nada que actualizar (payload vacío).")

    if "slug" in changes and changes["slug"]:
        new_slug = _normalize_slug(changes["slug"])
        if not new_slug:
            raise HTTPException(400, f"Slug inválido tras normalizar: {changes['slug']!r}")
        if new_slug != c.slug:
            collision = db.scalar(
                select(Catalog).where(Catalog.slug == new_slug, Catalog.id != c.id)
            )
            if collision:
                raise HTTPException(409, f"Ya existe un catálogo con slug '{new_slug}'")
        changes["slug"] = new_slug

    for field, value in changes.items():
        setattr(c, field, value)

    db.commit()
    db.refresh(c)
    return _catalog_to_dict(c)


@router.delete(
    "/catalogs/{slug}",
    dependencies=[Depends(require_admin_api_key)],
)
def delete_catalog(
    slug: str,
    hard: bool = Query(False, description="True = borrado físico (libera el slug)."),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Borra un catálogo. Por defecto SOFT (active=False), preserva la pivote.

    Con `?hard=true`: borra físicamente. Las asignaciones en `product_catalogs`
    se eliminan automáticamente por `ON DELETE CASCADE`. Marco solo debería
    usar hard cuando quiera liberar el slug para reasignarlo.
    """
    c = db.scalar(select(Catalog).where(Catalog.slug == slug.strip().lower()))
    if not c:
        raise HTTPException(404, f"Catálogo '{slug}' no existe.")

    if not hard:
        if not c.active:
            return {"slug": slug, "status": "already_inactive"}
        c.active = False
        db.commit()
        return {"slug": slug, "status": "soft_deleted (active=false)"}

    db.delete(c)  # CASCADE en product_catalogs limpia las asignaciones
    db.commit()
    return {"slug": slug, "status": "hard_deleted"}


# ─── Asignación producto ↔ catálogos ────────────────────────────────────────


class CatalogAssignPayload(BaseModel):
    catalogs: list[str] = Field(
        ..., min_length=1, description="Slugs a añadir (no reemplaza, añade)."
    )


@router.post(
    "/products/{ref}/catalogs",
    dependencies=[Depends(require_admin_api_key)],
)
def assign_product_catalogs(
    ref: str,
    payload: CatalogAssignPayload,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Añade el producto a uno o varios catálogos. Idempotente: re-asignar a
    un catálogo donde ya está no falla (la PK compuesta evita el duplicado y
    el ORM ignora el insert).

    Para REEMPLAZAR el set completo, usa `PUT /products/{ref}` con `catalogs=[...]`.
    """
    p = db.scalar(select(Product).where(Product.ref == ref))
    if not p:
        raise HTTPException(404, f"Producto {ref} no existe")

    slugs = _normalize_catalog_slugs(payload.catalogs)
    if not slugs:
        raise HTTPException(400, "Lista de catálogos vacía tras normalizar.")

    new_catalogs = _resolve_catalogs(db, slugs)

    # Add-only (no reemplaza): merge con set actual usando PK como dedupe
    current_ids = {c.id for c in (p.catalogs or [])}
    for c in new_catalogs:
        if c.id not in current_ids:
            p.catalogs.append(c)

    p.fecha_modificacion = date.today()
    db.commit()
    db.refresh(p)
    return {
        "ref": ref,
        "catalogs": sorted(
            [{"slug": c.slug, "name": c.name} for c in (p.catalogs or [])],
            key=lambda x: x["slug"],
        ),
    }


@router.delete(
    "/products/{ref}/catalogs/{slug}",
    dependencies=[Depends(require_admin_api_key)],
)
def remove_product_catalog(
    ref: str,
    slug: str,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Quita el producto de UN catálogo concreto. 404 si el producto no existe
    o si nunca estaba asignado al catálogo (ambos = 404 con mensaje distinto).
    """
    p = db.scalar(select(Product).where(Product.ref == ref))
    if not p:
        raise HTTPException(404, f"Producto {ref} no existe")

    target = next((c for c in (p.catalogs or []) if c.slug == slug.strip().lower()), None)
    if not target:
        raise HTTPException(
            404,
            f"El producto {ref} no estaba asignado al catálogo '{slug}'.",
        )

    p.catalogs.remove(target)
    p.fecha_modificacion = date.today()
    db.commit()
    db.refresh(p)
    return {
        "ref": ref,
        "removed": slug,
        "catalogs": sorted(
            [{"slug": c.slug, "name": c.name} for c in (p.catalogs or [])],
            key=lambda x: x["slug"],
        ),
    }


# ═════════════════════════════════════════════════════════════════════════════
# BLOQUE 4 wishlist Marco — brands y families como entidades ricas
# ═════════════════════════════════════════════════════════════════════════════
#
# `brands`: tabla nueva. Backfill automático desde DISTINCT product.brand en
# la migration 20260509. `Product.brand` ahora es FK → brands.slug. CRUD
# (GET/POST/PUT/DELETE) con soft delete por defecto.
#
# `families`: tabla nueva. Backfill desde DISTINCT unnest(products.families).
# Slug es PK directa (sin UUID) — alineado con bloque 2 (families[] es la
# fuente de verdad de qué slugs existen). DELETE rechaza con 409 si hay
# productos con esa familia en su array (Marco no rompe nada sin querer).
# `GET /catalog/families` (más arriba) ya devuelve la entidad rica si está creada.
# ═════════════════════════════════════════════════════════════════════════════


def _brand_to_dict(b: Brand, *, include_count: bool = True, db: Session | None = None) -> dict[str, Any]:
    """Serializa Brand para HTTP. Incluye `product_count` si include_count=True."""
    out: dict[str, Any] = {
        "id": str(b.id),
        "slug": b.slug,
        "name": b.name,
        "story": b.story,
        "origin": b.origin,
        "website": b.website,
        "logo_url": b.logo_url,
        "sort_order": b.sort_order,
        "active": b.active,
        "created_at": b.created_at.isoformat() if b.created_at else None,
        "updated_at": b.updated_at.isoformat() if b.updated_at else None,
    }
    if include_count and db is not None:
        n = db.scalar(
            select(func.count(Product.ref)).where(Product.brand == b.slug)
        )
        out["product_count"] = int(n or 0)
    return out


def _family_to_dict(f: Family, *, include_count: bool = True, db: Session | None = None) -> dict[str, Any]:
    """Serializa Family para HTTP. Incluye `product_count` con `families @> ARRAY[slug]`."""
    out: dict[str, Any] = {
        "slug": f.slug,
        "name": f.name,
        "description": f.description,
        "parent_slug": f.parent_slug,
        "color": f.color,
        "sort_order": f.sort_order,
        "active": f.active,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "updated_at": f.updated_at.isoformat() if f.updated_at else None,
    }
    if include_count and db is not None:
        n = db.scalar(
            sa_text(
                "SELECT COUNT(*) FROM products WHERE families @> ARRAY[:slug]::text[]"
            ),
            {"slug": f.slug},
        )
        out["product_count"] = int(n or 0)
    return out


# ─── Schemas ──────────────────────────────────────────────────────────────────


class BrandCreate(BaseModel):
    slug: str | None = Field(None, description="Slug; si no se pasa, slugify(name)")
    name: str = Field(..., min_length=1, max_length=200)
    story: str | None = None
    origin: str | None = Field(None, max_length=120)
    website: str | None = Field(None, max_length=255)
    logo_url: str | None = Field(None, max_length=500)
    sort_order: int = 0
    active: bool = True


class BrandUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    story: str | None = None
    origin: str | None = Field(None, max_length=120)
    website: str | None = Field(None, max_length=255)
    logo_url: str | None = Field(None, max_length=500)
    sort_order: int | None = None
    active: bool | None = None


class FamilyCreate(BaseModel):
    slug: str = Field(..., min_length=1, max_length=80, description="MAYÚSCULAS, ej. QUESOS_DE_OVEJA")
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None
    parent_slug: str | None = Field(None, max_length=80)
    color: str | None = Field(None, max_length=20)
    sort_order: int = 0
    active: bool = True


class FamilyUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    parent_slug: str | None = Field(None, max_length=80)
    color: str | None = Field(None, max_length=20)
    sort_order: int | None = None
    active: bool | None = None


# ─── Brands CRUD ──────────────────────────────────────────────────────────────


@router.get("/brands")
def list_brands(
    include_inactive: bool = Query(False, description="True = incluir soft-deleted"),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    """Lista marcas. Por defecto solo activas. Ordenadas por sort_order, name."""
    stmt = select(Brand).order_by(Brand.sort_order, Brand.name)
    if not include_inactive:
        stmt = stmt.where(Brand.active.is_(True))
    rows = db.scalars(stmt).all()
    return [_brand_to_dict(b, include_count=True, db=db) for b in rows]


@router.get("/brands/{slug}")
def get_brand(slug: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    b = db.scalar(select(Brand).where(Brand.slug == slug.strip().lower()))
    if not b:
        raise HTTPException(404, f"Marca '{slug}' no existe.")
    return _brand_to_dict(b, include_count=True, db=db)


@router.post(
    "/brands",
    dependencies=[Depends(require_admin_api_key)],
    status_code=201,
)
def create_brand(payload: BrandCreate, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Crea una marca. Slug auto-generado desde name si no se pasa.

    409 si el slug ya existe (active=true o false). Marco puede 'reactivar'
    una marca soft-deleted con PUT /brands/{slug} body={active: true}.
    """
    slug = (payload.slug or slugify(payload.name)).strip().lower()
    if not slug:
        raise HTTPException(400, "Slug vacío tras normalizar.")

    existing = db.scalar(select(Brand).where(Brand.slug == slug))
    if existing:
        raise HTTPException(409, f"Ya existe una marca con slug '{slug}'.")

    b = Brand(
        slug=slug,
        name=payload.name.strip(),
        story=payload.story,
        origin=payload.origin,
        website=payload.website,
        logo_url=payload.logo_url,
        sort_order=payload.sort_order,
        active=payload.active,
    )
    db.add(b)
    db.commit()
    db.refresh(b)
    return _brand_to_dict(b, include_count=True, db=db)


@router.put(
    "/brands/{slug}",
    dependencies=[Depends(require_admin_api_key)],
)
def update_brand(
    slug: str,
    payload: BrandUpdate,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Patch parcial. Solo se aplican campos NO-None del payload.

    El `slug` es inmutable: para 'renombrar' un slug hay que crear uno nuevo
    y mover los productos manualmente (`UPDATE products SET brand = …`).
    """
    b = db.scalar(select(Brand).where(Brand.slug == slug.strip().lower()))
    if not b:
        raise HTTPException(404, f"Marca '{slug}' no existe.")

    data = payload.model_dump(exclude_none=True)
    for field, value in data.items():
        setattr(b, field, value)
    db.commit()
    db.refresh(b)
    return _brand_to_dict(b, include_count=True, db=db)


@router.delete(
    "/brands/{slug}",
    dependencies=[Depends(require_admin_api_key)],
)
def delete_brand(
    slug: str,
    hard: bool = Query(False, description="True = borrado físico (FK SET NULL en productos)"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Borra una marca. Por defecto SOFT (active=False).

    Con `?hard=true`: borra físicamente. La FK `products.brand` con
    `ON DELETE SET NULL` deja los productos sin marca asignada (no rompe).
    Marco solo debería usar hard cuando la marca fue creada por error.
    """
    b = db.scalar(select(Brand).where(Brand.slug == slug.strip().lower()))
    if not b:
        raise HTTPException(404, f"Marca '{slug}' no existe.")

    if not hard:
        if not b.active:
            return {"slug": slug, "status": "already_inactive"}
        b.active = False
        db.commit()
        return {"slug": slug, "status": "soft_deleted (active=false)"}

    db.delete(b)  # FK SET NULL en products limpia el campo brand
    db.commit()
    return {"slug": slug, "status": "hard_deleted"}


# ─── Families CRUD ────────────────────────────────────────────────────────────


@router.post(
    "/families",
    dependencies=[Depends(require_admin_api_key)],
    status_code=201,
)
def create_family(payload: FamilyCreate, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Crea (o promueve) una familia a entidad rica.

    El slug debe coincidir con los que se usan en `products.families[]` (MAYÚSCULAS,
    underscore para multipalabra). Idempotente con 409: si ya existe, devuelve 409.

    Si Marco quiere 'promover' un slug que solo existe en `products.families[]`
    (no como entidad), llama POST con ese mismo slug y aquí lo creamos.
    """
    slug = payload.slug.strip().upper()
    if not slug:
        raise HTTPException(400, "Slug vacío.")

    existing = db.scalar(select(Family).where(Family.slug == slug))
    if existing:
        raise HTTPException(409, f"Ya existe una familia con slug '{slug}'.")

    if payload.parent_slug:
        parent_slug_norm = payload.parent_slug.strip().upper()
        parent = db.scalar(select(Family).where(Family.slug == parent_slug_norm))
        if not parent:
            raise HTTPException(400, f"parent_slug '{parent_slug_norm}' no existe como entidad.")
    else:
        parent_slug_norm = None

    f = Family(
        slug=slug,
        name=payload.name.strip(),
        description=payload.description,
        parent_slug=parent_slug_norm,
        color=payload.color,
        sort_order=payload.sort_order,
        active=payload.active,
    )
    db.add(f)
    db.commit()
    db.refresh(f)
    return _family_to_dict(f, include_count=True, db=db)


@router.put(
    "/families/{slug}",
    dependencies=[Depends(require_admin_api_key)],
)
def update_family(
    slug: str,
    payload: FamilyUpdate,
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Patch parcial. El `slug` es inmutable (idéntica razón que en brands).

    Si se pasa `parent_slug`, debe existir como entidad o se devuelve 400.
    Para quitar el parent, pasa `parent_slug: ""` o reescribe el endpoint
    como un PATCH explícito (a futuro). Hoy: pasa `parent_slug: null` no
    funciona porque exclude_none lo descarta — workaround: usa SQL directo.
    """
    f = db.scalar(select(Family).where(Family.slug == slug.strip().upper()))
    if not f:
        raise HTTPException(404, f"Familia '{slug}' no existe.")

    data = payload.model_dump(exclude_none=True)

    if "parent_slug" in data and data["parent_slug"]:
        parent_slug_norm = data["parent_slug"].strip().upper()
        if parent_slug_norm == f.slug:
            raise HTTPException(400, "Una familia no puede ser su propio parent.")
        parent = db.scalar(select(Family).where(Family.slug == parent_slug_norm))
        if not parent:
            raise HTTPException(400, f"parent_slug '{parent_slug_norm}' no existe.")
        data["parent_slug"] = parent_slug_norm

    for field, value in data.items():
        setattr(f, field, value)
    db.commit()
    db.refresh(f)
    return _family_to_dict(f, include_count=True, db=db)


@router.delete(
    "/families/{slug}",
    dependencies=[Depends(require_admin_api_key)],
)
def delete_family(
    slug: str,
    hard: bool = Query(False, description="True = borrado físico (requiere 0 productos asignados)"),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Borra una familia. Por defecto SOFT (active=False).

    Bloque 4 spec: "DELETE fail si hay productos asignados". Esto aplica al
    HARD delete: 409 si hay al menos un producto con esta familia en su array.
    Soft delete (active=false) siempre se permite — el slug sigue existiendo
    en `products.families[]` y aparece en el dropdown como entidad inactiva.
    """
    slug_norm = slug.strip().upper()
    f = db.scalar(select(Family).where(Family.slug == slug_norm))
    if not f:
        raise HTTPException(404, f"Familia '{slug_norm}' no existe.")

    if not hard:
        if not f.active:
            return {"slug": slug_norm, "status": "already_inactive"}
        f.active = False
        db.commit()
        return {"slug": slug_norm, "status": "soft_deleted (active=false)"}

    # Hard delete: 409 si hay productos con esta familia
    n = db.scalar(
        sa_text(
            "SELECT COUNT(*) FROM products WHERE families @> ARRAY[:slug]::text[]"
        ),
        {"slug": slug_norm},
    )
    if (n or 0) > 0:
        raise HTTPException(
            409,
            f"No se puede borrar la familia '{slug_norm}': "
            f"{int(n)} productos la tienen asignada. Quita la familia de los "
            f"productos primero o usa soft delete (sin ?hard=true).",
        )

    # También 409 si hay families hijas que dependen de este parent
    children = db.scalar(
        select(func.count(Family.slug)).where(Family.parent_slug == slug_norm)
    )
    if (children or 0) > 0:
        raise HTTPException(
            409,
            f"No se puede borrar la familia '{slug_norm}': "
            f"{int(children)} familias hijas la tienen como parent. Reasigna "
            f"el parent de las hijas primero (PUT /families/{{child}} parent_slug=...).",
        )

    db.delete(f)
    db.commit()
    return {"slug": slug_norm, "status": "hard_deleted"}
