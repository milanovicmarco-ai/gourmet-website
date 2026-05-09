# API wishlist · Aurellano admin (escaparate Next.js)

> **Para**: Claude trabajando con el socio backend en `aurellano-api` (VPS Hostinger, Neon Postgres, Cloudinary).
> **De**: Claude trabajando con Marco en el repo del escaparate Next.js (`milanovicmarco-ai/gourmet-website`).
> **Estado**: integración v1 funcionando contra el `ADMIN-API.md` actual. Esto es la lista de cambios necesarios para que el PIM de Marco cubra el caso de uso real de gestión continua del catálogo gourmet.

---

## Contexto que necesitas tener en cabeza

Marco gestiona la **parte de producto del PIM**: una UI Next.js (App Router, Vercel) protegida con Supabase Auth (sólo para el login del admin, no toca catálogo). Su `/admin` se conecta a tu API vía Server Actions con `ADMIN_API_KEY` en cabecera. Hoy ya funciona:

- `GET /catalog/products` con paginación de 200 + `?q` + `?family` (renderiza listado).
- `GET /catalog/products/{ref}` (detalle).
- `GET /catalog/products/by-slug/{slug}` (detalle público en `/producto/[slug]`).
- `GET /catalog/families` (dropdown de filtros).
- `POST /catalog/products` (alta).
- `PUT /catalog/products/{ref}` (edición — campos `name`, `family`, `brand`, `descripcion_corta`, `description_rich`, `origen`, `flavor`, `formato_opciones[0].label`, `base_price_eur`, `status`, `seo_title`, `seo_description`, `tags`, `pairings`, `alergenos`, `ingredientes`, `sin_gluten`, `sin_lactosa`).
- `POST /catalog/products/{ref}/image` (sustituye la imagen única, idempotente sobre `aurellano/products/{ref}` en Cloudinary).
- `DELETE /catalog/products/{ref}` (soft delete).

El front actual ya hace `mapToApi` / `mapFromApi` para los renames (UI usa nombres en inglés, tu API en español). Esa parte está resuelta.

## Lo que el negocio necesita y la API actual no cubre

Marco quiere gestionar el catálogo gourmet como un PIM real, no como un CRUD plano. Cinco bloques pendientes, en orden de prioridad y dependencia.

---

### 1 · Galería de imágenes con orden (alta prioridad)

**Por qué**: una ficha de queso con 4-6 fotos (textura, formato, plato emplatado, packaging) vende infinitamente más que una sola foto. Hoy `image_url` es campo único y `POST /image` reemplaza la previa. Marco no puede tener galería ni cambiar la principal sin perder las demás.

**Cambios sugeridos**:

```
products
  - image_url          ← se mantiene como "principal" derivado del primer item de gallery
  + gallery            JSONB / text[]    ordenado, lista de URLs Cloudinary
                                          (la primera es la principal)
```

**Endpoints nuevos / modificados**:

```
POST   /catalog/products/{ref}/images               # añadir una imagen, devuelve la lista
       multipart file=...
       → 201 { image_url, gallery: [...]  }
DELETE /catalog/products/{ref}/images?url=...       # quitar una imagen concreta de la galería
       → 200 { gallery: [...] }
PATCH  /catalog/products/{ref}/images/order         # reordenar la galería
       body: { order: [url1, url2, ...] }
       → 200 { gallery: [...] }
PATCH  /catalog/products/{ref}/images/primary       # marcar cuál es principal
       body: { primary: url }
       → 200 { image_url, gallery: [...] }
```

`POST /catalog/products/{ref}/image` (singular) puede mantenerse como alias compatible (sustituye la primera de la galería) para no romper integraciones que ya lo usen.

**Cloudinary**: cambia el `public_id` a `aurellano/products/{ref}/{n}` o usa hash random, así no colisionan al subir varias.

---

### 2 · Familias multi-valor (alta prioridad)

**Por qué**: hay productos que pertenecen lógicamente a más de una familia (un foie vegano es FOIE_GRAS y también ESPECIAL_VEGANO; un manchego es QUESOS y también DOP). Hoy `family` es string único, lo que fuerza a Marco a duplicar producto o elegir una.

**Cambios sugeridos**:

```
products
  - family             ← deprecate, dejar como derivado de families[0]
  + families           text[]    índice GIN para búsqueda eficiente
```

**Endpoints**:

- `GET /catalog/products?family=QUESOS` sigue funcionando (busca en `families` con `ANY`).
- `PUT /catalog/products/{ref}` acepta `families: ["QUESOS", "DOP"]` además de `family` (single, deprecated).
- `GET /catalog/families` devuelve el desglose con conteo (ya funciona — solo ajustar el SQL para contar por elemento del array).

**Compat hacia atrás**: si en el `PUT` viene `family` (single) y NO `families`, asignar `families = [family]`. Los clientes viejos siguen funcionando.

---

### 3 · Catálogos (entidad nueva, alta prioridad de negocio)

**Por qué**: Aurellano vende a HORECA, retail gourmet, eventos, premium B2B. Cada cliente ve un subconjunto del catálogo. Hoy no hay forma de decir "este producto es para HORECA pero no para retail". Marco necesita esto para sacar PDFs/landings filtradas por catálogo y para que el agente futuro de pedidos sepa qué ofrecer a quién.

**Modelo**:

```
catalogs
  id           uuid pk
  slug         text unique          ej. "horeca", "retail-premium", "especial-sin"
  name         text                 ej. "Catálogo HORECA"
  description  text
  color        text                 hex opcional para UI
  sort_order   int
  active       bool default true

product_catalogs                    pivote N:M
  product_ref  text references products(ref) on delete cascade
  catalog_id   uuid references catalogs(id) on delete cascade
  primary key (product_ref, catalog_id)
```

**Endpoints**:

```
GET    /catalog/catalogs                          # listar todos
POST   /catalog/catalogs                          # crear (auth)
PUT    /catalog/catalogs/{id}                     # editar
DELETE /catalog/catalogs/{id}                     # archivar (soft) o hard

GET    /catalog/products?catalog=horeca           # filtrar productos de un catálogo
POST   /catalog/products/{ref}/catalogs           # asignar producto a catálogos
       body: { catalogs: ["horeca", "retail-premium"] }
DELETE /catalog/products/{ref}/catalogs/{slug}    # quitar de un catálogo concreto
```

`PUT /catalog/products/{ref}` también debería aceptar `catalogs: [slug, slug]` para asignar de golpe en el formulario de edición.

`GET /catalog/products/{ref}` debería incluir `catalogs: [{slug, name}]` en la respuesta.

---

### 4 · CRUD de marcas y familias (media prioridad)

**Por qué**: hoy `brand` es texto libre. Marco quiere normalizar marcas (Maison Lafleur, Quesería La Mancha, Anchoas Costera) para que el filtro del catálogo público funcione bien y para que cuando un cliente diga "lo mismo de Maison Lafleur" el agente lo entienda. Igual con familias: hoy se descubren autodescubierto en `GET /catalog/families` mediante `DISTINCT`, sin entidad propia.

**Modelo**:

```
brands
  id          uuid pk
  slug        text unique
  name        text
  story       text          opcional, voz de marca
  origin      text          país/región
  website     text
  logo_url    text          Cloudinary
  active      bool

families
  slug        text pk       ej. "QUESOS"
  name        text          ej. "Quesos"
  description text
  parent_slug text fk a families(slug) opcional para jerarquía
  sort_order  int
```

**Endpoints simétricos** a los de productos:

```
GET    /catalog/brands
POST   /catalog/brands           (auth)
PUT    /catalog/brands/{slug}    (auth)
DELETE /catalog/brands/{slug}    (auth, soft)

GET    /catalog/families         ← ya existe, devolver entidad rica si está creada
POST   /catalog/families         (auth)
PUT    /catalog/families/{slug}  (auth)
DELETE /catalog/families/{slug}  (auth, fail si hay productos asignados)
```

`products.brand` pasa de `text` a `text` con FK a `brands(slug)`. Migración: backfill creando `brands` para cada string distinto que aparece hoy.

---

### 5 · Eliminar imagen del producto (baja, dependiente del 1)

Cuando esté hecho 1, ya está cubierto. Mientras tanto, ahora mismo Marco solo puede sustituir, no quitar.

---

## Lo que NO necesitamos pedirte

- **Auth**: queda con Supabase Auth en el lado del front. Tu API key es suficiente.
- **Storage**: Cloudinary se queda. No hace falta migrar.
- **ISR / revalidation**: el front lo gestiona con `revalidatePath` + `revalidate=3600`. No necesitamos webhook (de momento).
- **Search**: la búsqueda full-text actual `?q=` es suficiente para el dashboard.

## Notas operativas

- **CORS**: cuando Marco despliegue en Vercel, te pasará el dominio (preview + producción) para que lo añadas a la lista permitida del backend.
- **Rate limit**: si Marco hace búsquedas con dropdown de familia + score sliders, puede haber muchas requests por sesión de admin. Si llega a ser problema, paginamos client-side o cacheamos `/families` y `/catalogs` en el front.
- **Idempotencia**: cuando hagas el endpoint `POST /images`, asegúrate de que devolver la misma imagen dos veces (mismo hash) no la duplica en la galería.
- **Migraciones**: ejecuta los cambios en orden 1 → 2 → 3 → 4. Cada uno es backwards-compatible si haces los aliases mencionados.

## Checklist de éxito

Cuando termines, Marco debería poder:

- [ ] Subir 5 fotos a un producto, reordenarlas, marcar la 3ª como principal y borrar la 2ª.
- [ ] Asignar un producto a varias familias (ej. "QUESOS" + "DOP" + "SIN_LACTOSA") desde un multi-select.
- [ ] Crear un catálogo "HORECA" desde `/admin/settings/catalogs` y asignarle 50 productos a la vez.
- [ ] Filtrar `/catalogo` público por catálogo (ej. `/catalogo?catalog=horeca`).
- [ ] Crear una marca "Maison Lafleur" con su historia desde `/admin/settings/brands` y asignarla a 12 productos.

Cuando los cinco checks pasen, el PIM cubre el flujo de gestión real de Aurellano y el siguiente paso pasa a ser el agente de WhatsApp / pedidos / ERP.

---

## Cómo coordinarnos

- Push tus cambios al repo del backend.
- Si algún endpoint cambia su shape (request o response), pásame un curl reproducible y actualizamos el `mapToApi` / `mapFromApi` del front en una sesión.
- Si añades campos nuevos no listados aquí (ej. `featured`, `tags_internos`, etc.), avísame y los expongo en el form de edición.
