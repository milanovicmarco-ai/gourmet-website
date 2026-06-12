# Plan de acción · Catálogo Aurellano — correctitud primero, cobertura después

**Fecha:** 2026-06-12 · **Estado:** aprobado por Gavrilo (brainstorming 12-jun)
**Contexto previo:** `~/Desktop/CLAUDE/aurellano-HANDOFF.md` · `~/Desktop/CLAUDE/aurellano-catalogo/00-ESTADO-Y-PENDIENTES.md` · `~/CerebroDigital/02-Proyectos/aurellano.md`

---

## 1. Problema

La web (gourmet-website-one.vercel.app) tiene ~405 productos en el PIM, pero con caos de datos:

- **~155 productos con la referencia visible mal** (a menudo intercambiada entre vecinos: Moscato↔Riesling, Costilla↔Secreto…). 55 ya corregidos con alta confianza (Fichero A, LIVE 9-jun); **~120 "sospechosos" pendientes de ocultar** (Fichero B preparado, sin aplicar).
- **59 productos sin foto** (`sin-foto.csv`) y un puñado de incidencias residuales (fotos cruzadas, nombres mal) de la auditoría visual del 9-jun.
- **Cobertura incompleta del catálogo estrella Secrets du Chef:** ~115 de 397 productos del PDF están en el PIM; faltan ~250-280 (lista limpia: `lsdc-faltantes-final.csv`).

Hoy se prueba en Vercel, pero al enlazar **aurellano.com** el cliente final puede descubrir los errores. Riesgo real: un pedido por referencia entrega el producto equivocado; la credibilidad de la web (y nuestra) se resiente.

**Insight que ordena el plan:** un producto que *falta* es invisible (riesgo silencioso ≈ 0); un producto *mal* está a la vista y es la bomba de credibilidad. Arreglar/ocultar lo incorrecto es barato (título y foto ya existen); subir lo que falta es caro (recorte de imágenes desde PDF). Por tanto: **correctitud primero, cobertura después** — nunca al revés.

## 2. Decisión de enfoque

**Híbrido por fases** (elegido frente a "solo breadth" y "solo depth"):

- **Fase 0 — hacerlo seguro (días):** puerta de calidad sobre lo ya cargado; todo lo dudoso a Borrador. Resultado: solo se ve lo verificado → se puede enlazar el dominio.
- **Fase 1 — completar (continuo):** industrializar el recorte de imágenes y completar catálogos de uno en uno, empezando por Secrets du Chef. Cada catálogo "se gradúa" al llegar al 100%.

Decisiones de Gavrilo (12-jun):
1. **Enlazar aurellano.com al cerrar Fase 0** — no esperar a catálogos completos. Parcial-pero-correcto es defendible; completo-pero-con-errores no.
2. **Publicar sin esperar el Paso 2 de Marco** (refs canónicas en Neon). Con el alias corregido el producto es pedible-correcto, y el buscador de `/catalogo` ya incluye el alias en su haystack (`effectiveRef`, `src/app/catalogo/page.tsx:230`) → verificar en prod, pero en código la búsqueda por ref corregida funciona.
3. **Fuente de imágenes para productos nuevos: solo los PDFs de Canva** (recorte sin fondo). No hay assets del proveedor → la Fase 1 asume ese coste y lo industrializa.

## 3. La puerta de calidad (definition of done por producto)

Hay **dos puertas distintas**, y conviene no confundirlas:

1. **Puerta técnica del admin (de Marco, LIVE 12-jun, commit `22e2925`):** para publicar, la API del socio solo exige **nombre + ref + imagen**; el resto (marca, familia, alérgenos, origen, descripción, ingredientes) se auto-rellena con placeholders neutros (`enrichForPublish`). Define *publicable*.
2. **Puerta de correctitud (este plan):** un producto puede estar **Publicado** solo si:
   - **Nombre** = maestro para su ref (coincidencia EXACTA),
   - **Ref visible** (`display_ref` efectivo) = maestro,
   - **Foto propia y correcta** (ni cruzada, ni vacía, ni de otro producto).

   Si falla cualquiera → **Borrador**, etiquetado con el motivo (`ref-dudosa` / `sin-foto` / `foto-cruzada` / `nombre-mal`). Define *correcto*.

**Regla de oro (Gavrilo, 12-jun, ya en memoria):** el maestro manda (`excel para gavrilo 020626 aurellano.xls`, 10.265 refs; copia CSV en `aurellano-catalogo/maestro.csv`). Ref+nombre que no coincida EXACTO → marcar + Borrador + revisión humana. **Nunca corregir en silencio.** Los precios del maestro se ignoran.

Grados de correcto (informativo): *pedible-correcto* (las 3 condiciones; lo logramos nosotros) vs *consistente-en-canónica* (refs Neon = maestro; lo arregla Marco en su Paso 2, no bloquea).

## 4. Dónde vive cada cosa (verificado en el repo 12-jun)

| Dato | Sistema | Quién escribe | Credencial |
|---|---|---|---|
| Nombre, **status** (published/draft), precio, ref canónica, familia | **Neon** (API socio `aurellano-api.srv1124642.hstgr.cloud`) | Claude por script / admin UI | `ADMIN_API_KEY` (`.env.local`) |
| **`display_ref`** (alias visible), marca real (`brand_override`), asignación a catálogos (`product_catalogs`), destacados, traducciones | **Supabase** (overlay `product_meta` y compañía) | **Claude directo (NUEVO 12-jun)** | `SUPABASE_SERVICE_ROLE_KEY` (`.env.local`) |
| Imágenes de producto | **Cloudinary** vía `POST /catalog/products/{ref}/images` (dedup MD5) | Claude por script | `ADMIN_API_KEY` |

Lo que cambia con las credenciales de Supabase: correcciones de alias scriptables (adiós al xlsx manual + timeouts del bulk), los 2 `display_ref` atascados (17648, 6049) que eran "PARA-MARCO" pasan a ser nuestros, la auditoría se hace por SQL (JOIN overlay↔maestro), y se puede investigar el "producto-veneno" de la perf.

## 5. Fase 0 — Hacerlo seguro

**Objetivo:** que enlazar aurellano.com no enseñe nada incorrecto. **Hito de salida:** dominio enlazable.

| # | Paso | Vía | Verificación |
|---|---|---|---|
| 0 | Verificar en prod que el buscador encuentra por alias corregido (p.ej. 26403 Koroneiki) | web | búsqueda devuelve el producto correcto |
| 1 | Re-verificar estado vivo del PIM (sesiones paralelas + Marco editan) y snapshot/backup completo | API + SQL | snapshot JSON guardado |
| 2 | **Aplicar Fichero B**: ~120 publicados sospechosos → `status=draft` | script PUT por ref (Admin API), con preview previa y lista exacta | recuento esperado, spot-checks en admin |
| 3 | Aplicar los 2 `display_ref` pendientes (17648, 6049) | SQL Supabase con regla del slug (§7) | fichas muestran ref nueva, slug coherente |
| 4 | **Cerrar la auditoría de los ~405** contra el maestro: cada publicado restante pasa la puerta o va a Borrador con motivo; discrepancias → marcar, nunca auto-corregir | SQL (JOIN) + API | 0 publicados que fallen la puerta |
| 5 | Cruce final: 0 refs visibles duplicadas entre publicados; verificación en admin/web (NO por slug) | SQL + web | listado limpio |
| 6 | Entregar a Marco la cola del Paso 2 (refs canónicas) — no bloquea | docs ya listos (`aurellano-correcciones-refs-2026-06-08.csv` + `-ALTA-confianza.md`) | — |

**Resultado esperado:** ~160 publicados 100% fiables + backlog de Borradores etiquetado por motivo. El PIM no tiene campo para el motivo → el backlog vive como `borradores-backlog.csv` en `~/Desktop/CLAUDE/aurellano-catalogo/` (ref, nombre, motivo, qué falta para publicarlo).

## 6. Fase 1 — Completar, catálogo a catálogo

**Objetivo:** Secrets du Chef al 100% (de ~115 a 397), luego el resto de catálogos. Sin reloj: la web ya es segura.

1. **Pipeline de recorte v2 (la clave):** procesar el PDF **página a página**; recortar cada producto **junto a su etiqueta `REF XXXXX | Nombre`**. El emparejamiento foto↔ref sale de la **adyacencia en la página**, no de un match global OCR+Hungarian (lo frágil de la v1). Stack: `pdftoppm` (render) → detección/recorte por página → OCR de la etiqueta → validar ref+nombre contra el maestro (regla de oro: no match exacto → cuarentena) → `rembg` (**solo modelos u2net/isnet**, los MIT-safe comercial según auditoría) → composite blanco → subir vía API (dedup MD5).
2. **Lote piloto: 15-20 productos** end-to-end (recorte → crear como Borrador → puerta de calidad → Publicar) **antes** de comprometer los ~250. Si el piloto no rinde, re-evaluamos (p.ej. pedir assets al proveedor como plan B).
3. **Lotes de ~25-50** hasta completar; cada producto nuevo entra por la puerta de §3 o se queda en Borrador.
4. El mismo pipeline alimenta los **59 sin-foto** existentes (Borradores de Fase 0 cuyo motivo es `sin-foto`).
5. **Graduación:** un catálogo se declara terminado cuando cobertura = 100% y 0 productos fallan la puerta. Se comunica a Aurellano por hitos de catálogo, no por goteo.

## 7. Reglas operativas de seguridad

- **Overlay por SQL = replicar la lógica del server action**, incluida la **regla del slug**: el slug público se recalcula desde `name + display_ref` (migración `20260513`). Un `UPDATE` a pelo deja URLs viejas. Localizar y replicar el recálculo (o pasar por el server action) — nunca un UPDATE ciego.
- **Service role salta el RLS** → backup de filas (JSON) antes de cada lote, lotes pequeños, verificación después de cada uno.
- **PIM en vivo** (sesiones paralelas + Marco): re-verificar inmediatamente antes de cada lote; patrón Previsualizar→Aplicar; nunca revertir trabajo ajeno; `git fetch` antes de commitear y stage por nombre.
- **Caché web:** búsqueda ~5 min, catálogo ~1 h; la API es instantánea → verificar contra API/admin, no contra la web cacheada.
- **Discrepancias con el maestro:** marcar + Borrador + revisión humana. Sin excepciones.
- Todo cambio masivo deja **CSV de evidencia** (antes/después) en `~/Desktop/CLAUDE/aurellano-catalogo/`.

## 8. Fuera de alcance (encolado, no bloquea)

- **Paso 2 de Marco:** migrar refs canónicas en Neon al maestro (consistencia de fondo + buscador de la API del socio). Listas ya entregables.
- **Catalán de datos de producto** (necesita campos `_ca` en BD de Marco; la UI ya está LIVE).
- **Producto-veneno de la perf** (opcional; ahora investigable con credenciales Supabase).
- Versión "con gusto" de fotos hero (gpt-image-2): decisión comercial aparte.

## 9. Criterios de éxito

**Fase 0 (gate para enlazar dominio):**
- 0 productos publicados que fallen la puerta de correctitud (verificado por cruce SQL/API contra el maestro, no a ojo).
- 0 refs visibles duplicadas entre publicados.
- Búsqueda por alias corregido funciona en prod.
- Backup/evidencia de cada lote aplicado.

**Fase 1:**
- Piloto: ≥90% de los 15-20 pasan la puerta a la primera; emparejamiento foto↔ref sin errores manuales detectados.
- Secrets du Chef: cobertura 397/397 con 0 fallos de puerta → catálogo graduado.

## 10. Riesgos

| Riesgo | Mitigación |
|---|---|
| Sesión paralela o Marco pisa un lote a medias | snapshot previo + lotes pequeños + re-verificación antes/después |
| SQL directo rompe slugs/URLs | regla del slug (§7) + spot-checks de fichas tras cada lote |
| OCR de etiquetas falla en páginas feas del PDF (bombones, fiambres…) | regla de oro: no-match → cuarentena + revisión humana; nunca entra mal |
| El piloto de recorte no rinde | gate explícito tras el piloto; plan B = pedir assets al proveedor |
| Vercel cachea y "parece" que no se aplicó | verificar contra API/admin; esperar TTL o revalidar |
