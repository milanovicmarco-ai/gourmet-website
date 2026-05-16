-- Aurellano · Overlay de metadatos de producto en NUESTRO Supabase.
-- Aquí guardamos campos que queremos gestionar nosotros sin tocar la API del socio:
--   * brand_override: marca como texto libre (la API tiene FK estricta a brands; nosotros la ignoramos).
--   * diet_*: atributos dietéticos adicionales (la API solo tiene sin_gluten/lactosa/vegetariano).

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.product_meta (
  product_ref text primary key,
  brand_override text,
  -- Atributos dietéticos extras (los 3 base viven en la API):
  diet_no_nuts boolean not null default false,
  diet_vegan boolean not null default false,
  diet_no_added_sugar boolean not null default false,
  diet_high_protein boolean not null default false,
  diet_keto boolean not null default false,
  diet_other text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists product_meta_updated_at on public.product_meta;
create trigger product_meta_updated_at
  before update on public.product_meta
  for each row execute function public.set_updated_at();

alter table public.product_meta enable row level security;

drop policy if exists "Product meta viewable by everyone" on public.product_meta;
create policy "Product meta viewable by everyone"
  on public.product_meta for select using (true);

drop policy if exists "Authenticated manage product meta" on public.product_meta;
create policy "Authenticated manage product meta"
  on public.product_meta for all to authenticated using (true) with check (true);
