-- Aurellano · Clasificación gastronómica adicional en product_meta.
--
-- Cuatro campos nuevos que la API del socio no contempla y que gestionamos
-- como overlay para no depender de cambios suyos:
--
--   gama          int 1-6   · clasificación de procesado (1ª fresco, 2ª conserva, 3ª congelado, ...)
--   momento_plato text       · "aperitivo" | "entrante" | "principal" | "guarnicion" | "postre"
--   destacado     boolean    · destaca el producto (separado del catálogo "Selección Aurellano")
--   primer_precio boolean    · marca de "entry-level / línea económica" para filtros del catálogo
--
-- Idempotente — se puede correr varias veces sin efectos.

alter table public.product_meta
  add column if not exists gama smallint
    check (gama is null or (gama between 1 and 6));

alter table public.product_meta
  add column if not exists momento_plato text
    check (
      momento_plato is null
      or momento_plato in ('aperitivo','entrante','principal','guarnicion','postre')
    );

alter table public.product_meta
  add column if not exists destacado boolean not null default false;

alter table public.product_meta
  add column if not exists primer_precio boolean not null default false;

-- Índices para filtros rápidos (la web pública puede querer listar "destacados" o "primer precio").
create index if not exists product_meta_destacado_idx
  on public.product_meta (destacado) where destacado = true;

create index if not exists product_meta_primer_precio_idx
  on public.product_meta (primer_precio) where primer_precio = true;
