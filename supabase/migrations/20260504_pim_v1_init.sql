-- Aurellano · PIM v1 · Esquema inicial
-- Crear extensión necesaria para uuid_generate_v4
create extension if not exists "pgcrypto";

-- =============================
-- CATEGORÍAS
-- =============================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- =============================
-- MARCAS
-- =============================
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  story text,
  origin text,
  created_at timestamptz not null default now()
);

-- =============================
-- PRODUCTOS
-- =============================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  ref text,
  brand_id uuid references public.brands(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  short_description text,
  long_description text,
  origin text,
  flavor text,
  format text,
  price_eur numeric(10,2),
  primary_image text,
  gallery jsonb not null default '[]'::jsonb,
  allergens text[] not null default '{}',
  badges text[] not null default '{}',
  pairings text[] not null default '{}',
  client_types text[] not null default '{}',
  dish_types text[] not null default '{}',
  food_category text,
  specialties text[] not null default '{}',
  vegan boolean not null default false,
  gluten_free boolean not null default false,
  lactose_free boolean not null default false,
  nutrition jsonb,
  status text not null default 'published' check (status in ('draft','published','archived')),
  optimization_score int not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Índices útiles
create index if not exists products_category_id_idx on public.products(category_id);
create index if not exists products_brand_id_idx on public.products(brand_id);
create index if not exists products_status_idx on public.products(status);
create index if not exists products_food_category_idx on public.products(food_category);

-- =============================
-- AUDIT LOG
-- =============================
create table if not exists public.product_audit (
  id bigserial primary key,
  product_id uuid references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  changes jsonb,
  created_at timestamptz not null default now()
);

create index if not exists product_audit_product_id_idx on public.product_audit(product_id);

-- =============================
-- TRIGGER updated_at
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

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- =============================
-- ROW LEVEL SECURITY
-- =============================
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_audit enable row level security;

-- Público: lectura de categorías, marcas, y productos publicados
drop policy if exists "Categories are viewable by everyone" on public.categories;
create policy "Categories are viewable by everyone"
  on public.categories for select using (true);

drop policy if exists "Brands are viewable by everyone" on public.brands;
create policy "Brands are viewable by everyone"
  on public.brands for select using (true);

drop policy if exists "Public reads published products" on public.products;
create policy "Public reads published products"
  on public.products for select using (status = 'published');

-- Autenticados (admin): control total
drop policy if exists "Authenticated users manage categories" on public.categories;
create policy "Authenticated users manage categories"
  on public.categories for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage brands" on public.brands;
create policy "Authenticated users manage brands"
  on public.brands for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users manage products" on public.products;
create policy "Authenticated users manage products"
  on public.products for all to authenticated using (true) with check (true);

drop policy if exists "Authenticated users read audit" on public.product_audit;
create policy "Authenticated users read audit"
  on public.product_audit for select to authenticated using (true);
drop policy if exists "Authenticated users insert audit" on public.product_audit;
create policy "Authenticated users insert audit"
  on public.product_audit for insert to authenticated with check (true);

-- =============================
-- STORAGE BUCKET PARA IMÁGENES
-- =============================
-- Crea el bucket "product-images" si no existe y abre la lectura pública.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read product images" on storage.objects;
create policy "Public read product images"
  on storage.objects for select using (bucket_id = 'product-images');

drop policy if exists "Authenticated users manage product images" on storage.objects;
create policy "Authenticated users manage product images"
  on storage.objects for all to authenticated
  using (bucket_id = 'product-images')
  with check (bucket_id = 'product-images');
