-- Aurellano · Destacado por catálogo.
--
-- El flag booleano `destacado` global se queda en la tabla como legacy fallback,
-- pero la nueva forma de destacar es por catálogo: un producto puede estar
-- destacado en HORECA, en Retail, en Formages, o en varios a la vez.
--
-- Cómo lo guardamos: array de slugs de catálogo (text[]).

alter table public.product_meta
  add column if not exists destacado_en text[] not null default '{}';

-- Índice GIN para queries tipo `where 'horeca' = any(destacado_en)`.
create index if not exists product_meta_destacado_en_idx
  on public.product_meta using gin (destacado_en);
