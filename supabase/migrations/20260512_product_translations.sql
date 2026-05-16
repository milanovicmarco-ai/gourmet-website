-- Aurellano · Traducciones de producto (en nuestro Supabase).
-- Locale base es 'es' (los datos canónicos viven en la API de tu socio).
-- Esta tabla guarda únicamente las traducciones a OTROS idiomas (ca, en, ...).

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

create table if not exists public.product_translations (
  product_ref text not null,
  locale text not null check (locale in ('ca', 'en')),
  name text,
  descripcion_corta text,
  description_rich text,
  flavor text,
  origen text,
  ingredientes text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_ref, locale)
);

create index if not exists product_translations_locale_idx on public.product_translations(locale);

drop trigger if exists product_translations_updated_at on public.product_translations;
create trigger product_translations_updated_at
  before update on public.product_translations
  for each row execute function public.set_updated_at();

-- RLS
alter table public.product_translations enable row level security;

drop policy if exists "Translations viewable by everyone" on public.product_translations;
create policy "Translations viewable by everyone"
  on public.product_translations for select using (true);

drop policy if exists "Authenticated manage translations" on public.product_translations;
create policy "Authenticated manage translations"
  on public.product_translations for all to authenticated using (true) with check (true);
