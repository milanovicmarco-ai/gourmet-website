-- Aurellano · Inspiración: portfolio público de catálogos en PDF.
--
-- Cada fila es un catálogo (de Aurellano o de proveedores/marcas) que se enseña
-- en /inspiracion como tarjeta con carátula + logo + título y descarga del PDF.
-- Gestionado desde /admin/settings/inspiration.

create extension if not exists "pgcrypto";

create table if not exists public.inspiration_catalogs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  -- URLs PÚBLICAS de los assets en Supabase Storage (bucket "inspiration").
  pdf_url text not null,
  cover_url text not null,
  logo_url text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists inspiration_catalogs_updated_at on public.inspiration_catalogs;
create trigger inspiration_catalogs_updated_at
  before update on public.inspiration_catalogs
  for each row execute function public.set_updated_at();

alter table public.inspiration_catalogs enable row level security;

drop policy if exists "Inspiration viewable by everyone" on public.inspiration_catalogs;
create policy "Inspiration viewable by everyone"
  on public.inspiration_catalogs for select using (active = true);

drop policy if exists "Authenticated manage inspiration" on public.inspiration_catalogs;
create policy "Authenticated manage inspiration"
  on public.inspiration_catalogs for all to authenticated using (true) with check (true);

-- =====================================================
-- Storage bucket "inspiration" — público para lectura
-- =====================================================
insert into storage.buckets (id, name, public)
values ('inspiration', 'inspiration', true)
on conflict (id) do update set public = true;

-- Policies del bucket
drop policy if exists "Inspiration files public read" on storage.objects;
create policy "Inspiration files public read"
  on storage.objects for select
  using (bucket_id = 'inspiration');

drop policy if exists "Inspiration files authenticated write" on storage.objects;
create policy "Inspiration files authenticated write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'inspiration');

drop policy if exists "Inspiration files authenticated update" on storage.objects;
create policy "Inspiration files authenticated update"
  on storage.objects for update to authenticated
  using (bucket_id = 'inspiration') with check (bucket_id = 'inspiration');

drop policy if exists "Inspiration files authenticated delete" on storage.objects;
create policy "Inspiration files authenticated delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'inspiration');
