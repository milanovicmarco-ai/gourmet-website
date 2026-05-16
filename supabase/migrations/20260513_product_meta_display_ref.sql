-- Aurellano · display_ref: alias editable de la referencia de producto.
--
-- La API del socio trata `ref` como PK inmutable. Para que el editor del PIM pueda
-- cambiar la referencia visible (en cards del catálogo, ficha pública, listado admin)
-- guardamos un override aquí. Si está vacío, la web usa la ref canónica de la API.
--
-- El slug del producto (que va en el URL público) se recalcula desde name + display_ref
-- en cada guardado, así el cambio de ref se propaga automáticamente al URL.

alter table public.product_meta
  add column if not exists display_ref text;

-- Útil cuando filtremos por display_ref desde el listado admin.
create index if not exists product_meta_display_ref_idx
  on public.product_meta (display_ref)
  where display_ref is not null;
