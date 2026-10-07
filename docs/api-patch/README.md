# Parche pendiente de desplegar en aurellano-api

`catalog.py` es `backend/app/api/routers/catalog.py` (VPS Hostinger, `/root/aurellano/backend/...`)
con un parámetro nuevo en `GET /catalog/products`: **`?view=list`**.

- Sin `view` (o `view=full`): idéntico a hoy.
- `view=list`: devuelve solo ref, slug, name, family(ies), brand, active, status, image_url,
  descripcion_corta y flags sin_gluten/sin_lactosa/vegetariano. En la BD carga solo esas
  columnas (`load_only`) y no carga `brand_obj` ni `catalogs`. ~5x menos peso y menos trabajo en Neon.

La web (`src/lib/pim/catalog-index.ts`) ya envía `view=list`; hoy la API lo ignora y devuelve el
producto completo, y la web se queda con los campos que necesita. Funciona igual con o sin el parche.

## Desplegar (en el VPS)

```bash
cd /root/aurellano
cp backend/app/api/routers/catalog.py backend/app/api/routers/catalog.py.bak-$(date +%F)
# copiar docs/api-patch/catalog.py sobre backend/app/api/routers/catalog.py
docker compose -f deploy/docker-compose.vps.yml up -d --build   # unos segundos de corte
curl -s "https://aurellano-api.srv1124642.hstgr.cloud/catalog/products?limit=2&view=list"
```

Rollback: restaurar el `.bak` y repetir `up -d --build`.
