-- Aurellano · Catálogos de PUBLICACIÓN (en nuestro Supabase)
-- Independiente del "catálogo" de origen que vive en Neon (gestionado por la API del socio).
-- Nuestros catálogos definen DÓNDE se muestra cada producto en la web (HORECA, Retail, etc.).

create extension if not exists "pgcrypto";

-- =============================
-- Helper updated_at (idempotente)
-- =============================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================
-- CATÁLOGOS DE PUBLICACIÓN
-- =============================
create table if not exists public.catalogs (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  color text default '#fa2ca2',
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists catalogs_updated_at on public.catalogs;
create trigger catalogs_updated_at
  before update on public.catalogs
  for each row execute function public.set_updated_at();

-- =============================
-- ASIGNACIÓN PRODUCTO ↔ CATÁLOGO
-- product_ref es la `ref` del producto en la API de Neon (no FK porque vive fuera).
-- =============================
create table if not exists public.product_catalogs (
  product_ref text not null,
  catalog_id uuid not null references public.catalogs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_ref, catalog_id)
);

create index if not exists product_catalogs_product_ref_idx on public.product_catalogs(product_ref);
create index if not exists product_catalogs_catalog_id_idx on public.product_catalogs(catalog_id);

-- =============================
-- METADATOS DE FAMILIA (overlay sobre las familias auto-descubiertas en Neon)
-- =============================
create table if not exists public.families_meta (
  slug text primary key,                       -- "QUESOS", "FOIE_GRAS"...
  display_name text,                            -- "Quesos afinados", etc.
  description text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists families_meta_updated_at on public.families_meta;
create trigger families_meta_updated_at
  before update on public.families_meta
  for each row execute function public.set_updated_at();

-- =============================
-- ROW LEVEL SECURITY
-- =============================
alter table public.catalogs enable row level security;
alter table public.product_catalogs enable row level security;
alter table public.families_meta enable row level security;

-- Lectura pública (la web pública necesita estos datos)
drop policy if exists "Catalogs viewable by everyone" on public.catalogs;
create policy "Catalogs viewable by everyone"
  on public.catalogs for select using (true);

drop policy if exists "Product catalogs viewable by everyone" on public.product_catalogs;
create policy "Product catalogs viewable by everyone"
  on public.product_catalogs for select using (true);

drop policy if exists "Families meta viewable by everyone" on public.families_meta;
create policy "Families meta viewable by everyone"
  on public.families_meta for select using (true);

-- Mutación sólo authenticated (admin del PIM)
drop policy if exists "Authenticated manage catalogs" on public.catalogs;
create policy "Authenticated manage catalogs"
  on public.catalogs for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated manage product_catalogs" on public.product_catalogs;
create policy "Authenticated manage product_catalogs"
  on public.product_catalogs for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated manage families_meta" on public.families_meta;
create policy "Authenticated manage families_meta"
  on public.families_meta for all to authenticated using (true) with check (true);

-- =============================
-- SEED OPCIONAL — catálogos típicos para empezar
-- =============================
insert into public.catalogs (slug, name, description, color, sort_order)
values
  ('horeca', 'HORECA', 'Producto pensado para restauración: 4ª y 5ª gama, ingredientes de autor.', '#000000', 1),
  ('retail', 'Retail / Colmado', 'Producto premium de alta rotación para tiendas, mercados y supermercados especializados.', '#fa2ca2', 2),
  ('especial-sin', 'Especial Sin', 'Selección sin gluten, sin lactosa, sin huevo y vegana.', '#22c55e', 3),
  ('delicatessen', 'Delicatessen', 'Iconos del gusto: foie, quesos afinados, anchoas, vermut.', '#080808', 4),
  ('limited-edition', 'Edición limitada', 'Producciones cortas, importaciones puntuales, ediciones numeradas.', '#fa2ca2', 5)
on conflict (slug) do nothing;
