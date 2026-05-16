-- Aurellano · Realineación de catálogos al criterio definitivo de Marco.
--
-- Catálogos oficiales (con sus slugs estables):
--   1. seleccion-aurellano  → "Selección Aurellano"  (home destaca 4 productos de aquí)
--   2. retail               → "Retail"               (/colmado abre filtrado por este)
--   3. horeca               → "HORECA"               (/secrets-du-xef abre filtrado por este)
--   4. delicatessen         → "Delicatessen"         (menú especialidades)
--   5. formages             → "Formages"             (menú especialidades)
--   6. healthy              → "Healthy"              (menú especialidades)
--   7. limited-edition      → "Limited Edition"      (menú especialidades)
--
-- Esta migración NO borra los catálogos legacy (ej. "especial-sin"); sólo añade
-- los nuevos y renombra los existentes para que el wording coincida con lo que
-- Marco quiere ver en la web. Si quieres limpiar legacy, se hace por el PIM.

-- Renombrados / actualización de sort_order
update public.catalogs set name = 'Retail',           sort_order = 2 where slug = 'retail';
update public.catalogs set name = 'HORECA',           sort_order = 3 where slug = 'horeca';
update public.catalogs set name = 'Delicatessen',     sort_order = 4 where slug = 'delicatessen';
update public.catalogs set name = 'Limited Edition',  sort_order = 7 where slug = 'limited-edition';

-- Nuevos catálogos (idempotente — si existen se ignoran)
insert into public.catalogs (slug, name, description, color, sort_order)
values
  ('seleccion-aurellano', 'Selección Aurellano',
    'Curación de la casa: los productos que mejor representan lo que somos. Aparecen destacados en la home.',
    '#fa2ca2', 1),
  ('formages', 'Formages',
    'Quesos afinados de Francia, Italia y España. La savoir-faire del queso traída a la mesa.',
    '#080808', 5),
  ('healthy', 'Healthy',
    'Sin gluten, sin lactosa, vegano, alto en proteínas. Producto gourmet para dietas específicas.',
    '#22c55e', 6)
on conflict (slug) do nothing;
