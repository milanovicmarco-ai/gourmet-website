-- Aurellano · Catálogo base en Supabase (sustituye a Neon + la API de la VPS).
--
-- Hasta ahora la ficha base de cada producto (nombre, precio, descripción,
-- fotos…) vivía en Neon y se leía/escribía a través de la API FastAPI de la
-- VPS de Hostinger. Estas tablas son una copia 1:1 de las de Neon para que la
-- web y el admin trabajen directamente con Supabase, donde ya están las
-- traducciones, catálogos y metadatos.
--
-- Nombres con prefijo `catalog_` para no chocar con las tablas antiguas
-- `products` / `brands` / `categories` de la v1 del PIM (sin uso).
--
-- Seguro de ejecutar más de una vez (if not exists / drop policy if exists).
-- NO toca ninguna tabla existente.

create extension if not exists unaccent with schema extensions;

-- ── Marcas ─────────────────────────────────────────────────────────────────
create table if not exists public.catalog_brands (
  id          uuid primary key default gen_random_uuid(),
  slug        varchar(80)  not null unique,
  name        varchar(200) not null,
  story       text,
  origin      varchar(120),
  website     varchar(255),
  logo_url    varchar(500),
  sort_order  integer      not null default 0,
  active      boolean      not null default true,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

-- ── Familias ───────────────────────────────────────────────────────────────
create table if not exists public.catalog_families (
  slug        varchar(80)  primary key,
  name        varchar(200) not null,
  description text,
  parent_slug varchar(80)  references public.catalog_families(slug) on delete set null,
  color       varchar(20),
  sort_order  integer      not null default 0,
  active      boolean      not null default true,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

-- ── Productos ──────────────────────────────────────────────────────────────
create table if not exists public.catalog_products (
  ref                 varchar(32)   primary key,
  name                varchar(200)  not null,
  brand               varchar(100)  references public.catalog_brands(slug) on delete set null,
  family              varchar(50)   not null,
  subfamily           varchar(80),
  supplier            varchar(120),
  unit_base           varchar(10)   not null default 'UD',
  base_price_eur      numeric(10,2) not null default 0,
  iva_pct             numeric(5,2)  not null default 10,
  stock_actual        integer       not null default 0,
  stock_minimo        integer       not null default 0,
  active              boolean       not null default true,
  product_type        varchar(50),
  commercial_category varchar(80),
  sin_gluten          boolean       not null default false,
  sin_lactosa         boolean       not null default false,
  vegetariano         boolean       not null default false,
  refrigerado         boolean       not null default false,
  venta_a_granel      boolean       not null default false,
  peso_variable       boolean       not null default false,
  formato_opciones    jsonb,
  descripcion_corta   text,
  ingredientes        text,
  alergenos           text,
  info_nutricional    jsonb,
  origen              varchar(100),
  image_url           varchar(500),
  tags                jsonb,
  pairings            jsonb,
  description_rich    text,
  fecha_alta          date,
  fecha_modificacion  date,
  units_per_box       integer,
  slug                varchar(220)  unique,
  seo_title           varchar(200),
  seo_description     varchar(500),
  flavor              text,
  status              varchar(20)   not null default 'published',
  optimization_score  integer,
  gallery             text[]        not null default '{}',
  families            text[]        not null default '{}',
  image_quality_score double precision,
  has_enriched_image  boolean       not null default false
);

create index if not exists catalog_products_active_idx   on public.catalog_products (active);
create index if not exists catalog_products_family_idx   on public.catalog_products (family);
create index if not exists catalog_products_families_gin on public.catalog_products using gin (families);
create index if not exists catalog_products_brand_idx    on public.catalog_products (brand);

-- ── Acceso (mismo patrón que product_meta / catalogs) ──────────────────────
-- Lectura pública (es el catálogo de la web); escritura solo usuarios con
-- sesión del admin.
alter table public.catalog_brands   enable row level security;
alter table public.catalog_families enable row level security;
alter table public.catalog_products enable row level security;

drop policy if exists "Catalog brands viewable by everyone" on public.catalog_brands;
create policy "Catalog brands viewable by everyone"
  on public.catalog_brands for select using (true);
drop policy if exists "Authenticated manage catalog brands" on public.catalog_brands;
create policy "Authenticated manage catalog brands"
  on public.catalog_brands for all to authenticated using (true) with check (true);

drop policy if exists "Catalog families viewable by everyone" on public.catalog_families;
create policy "Catalog families viewable by everyone"
  on public.catalog_families for select using (true);
drop policy if exists "Authenticated manage catalog families" on public.catalog_families;
create policy "Authenticated manage catalog families"
  on public.catalog_families for all to authenticated using (true) with check (true);

drop policy if exists "Catalog products viewable by everyone" on public.catalog_products;
create policy "Catalog products viewable by everyone"
  on public.catalog_products for select using (true);
drop policy if exists "Authenticated manage catalog products" on public.catalog_products;
create policy "Authenticated manage catalog products"
  on public.catalog_products for all to authenticated using (true) with check (true);

-- ── Funciones de apoyo ─────────────────────────────────────────────────────

-- Nº de productos ACTIVOS por familia (cuenta sobre families[], como la API).
create or replace function public.catalog_family_counts()
returns table (slug text, n bigint)
language sql stable
set search_path = public
as $$
  select f, count(*)
  from (select unnest(families) as f from public.catalog_products where active) s
  where f is not null and f <> ''
  group by f
$$;

-- Nº de productos por marca (todos, como la API).
create or replace function public.catalog_brand_counts()
returns table (slug text, n bigint)
language sql stable
set search_path = public
as $$
  select brand, count(*) from public.catalog_products
  where brand is not null group by brand
$$;

-- Búsqueda de texto para el admin: sin acentos ni mayúsculas, todas las
-- palabras deben aparecer. Ref exacta primero, luego nombre que empieza por
-- la búsqueda, luego el resto.
create or replace function public.catalog_search(q text, fam text default null, lim integer default 50)
returns setof public.catalog_products
language sql stable
set search_path = public, extensions
as $$
  with norm as (
    select lower(extensions.unaccent(coalesce(q, ''))) as nq
  ),
  words as (
    select array_remove(regexp_split_to_array(trim(nq), '\s+'), '') as w, nq from norm
  )
  select p.*
  from public.catalog_products p, words
  where (fam is null or p.families @> array[upper(trim(fam))])
    and coalesce(array_length(words.w, 1), 0) > 0
    and not exists (
      select 1 from unnest(words.w) as word
      where position(word in lower(extensions.unaccent(concat_ws(' ',
        p.ref, p.name, p.brand, p.family, p.subfamily, p.origen, p.descripcion_corta)))) = 0
    )
  order by
    case
      when lower(p.ref) = trim(words.nq) then 0
      when lower(extensions.unaccent(p.name)) like trim(words.nq) || '%' then 1
      else 2
    end,
    p.name
  limit greatest(1, least(coalesce(lim, 50), 200))
$$;

grant execute on function public.catalog_family_counts()             to anon, authenticated;
grant execute on function public.catalog_brand_counts()              to anon, authenticated;
grant execute on function public.catalog_search(text, text, integer) to anon, authenticated;
