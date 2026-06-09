# Traducción al catalán del escaparate — Diseño

**Fecha:** 2026-06-09
**Proyecto:** Aurellano — escaparate (Next.js 16, App Router)
**Rama:** `feat/traduccion-catalan` (worktree aislado desde `origin/main` @105b6e3)
**Deadline cliente:** 15-jun-2026

## Objetivo

Completar la traducción al catalán de **toda la interfaz** del escaparate (chrome + páginas
estáticas), de forma que un visitante que pulse el selector **CA** vea la web 100% en catalán
en lo que respecta a la interfaz. Los **datos de producto** (que viven en el PIM en español)
quedan fuera de alcance en esta entrega; se documenta un plan de fase 2.

## Decisiones tomadas (brainstorming 2026-06-09)

1. **Alcance:** interfaz completa al catalán ahora + plan de fase 2 para los datos de producto.
2. **Idioma por defecto:** español (sin cambios). El visitante cambia a catalán con el
   selector ES|CA que ya existe en el menú.
3. **Enfoque de entrega:** un único PR a Marco con **commits semánticos por área**
   (páginas estáticas / vistas de producto / catálogo+filtros). Se mantiene el patrón actual
   del diccionario (clave = frase en español).

## Arquitectura (sin cambios al motor)

No se modifica el sistema i18n existente:

- `src/lib/i18n.tsx` — función `t(key)`, `I18nProvider` (React Context), cookie
  `aurellano_lang` + `localStorage`, default `"es"`. Se mantiene tal cual.
- `src/app/providers.tsx` — el `I18nProvider` ya envuelve la app. Sin cambios.
- `src/components/Nav.tsx` — `LangSwitcher` (selector ES|CA con icono Globe). Sin cambios.

**Patrón:** la clave del diccionario **es la frase en español** (`"Catálogo": "Catàleg"`).
**Fallback como red de seguridad:** `t()` devuelve la clave (español) si falta la traducción
→ la web nunca muestra claves crudas ni se rompe (`return dict[key] ?? key`).

El trabajo consiste, por tanto, en dos cosas mecánicas y de bajo riesgo:
1. **Envolver** los textos hardcodeados en español con `t("…")` en las vistas pendientes.
2. **Añadir** las entradas catalanas correspondientes al diccionario de `i18n.tsx`.

## Alcance — qué se traduce

### Estado de partida (ya traducido, ~40%, 173 entradas)

Home (`Index.tsx`), ficha de producto (`ProductDetail.tsx`), `Inspiracion.tsx`, `Nav.tsx`,
`Footer.tsx`, `FloatingActions.tsx`, toasts. Parcialmente: `Colmado.tsx`, `Quesos.tsx`,
`SecretsDelXef.tsx`.

### Vistas pendientes (texto hardcodeado a envolver + traducir)

| Vista | Volumen aprox. | Notas |
|---|---|---|
| `src/views/Catalogo.tsx` | ~25-30 | hero, etiquetas de filtros, placeholder de búsqueda, "producto/productos" |
| `src/views/Condiciones.tsx` | ~35-45 | condiciones de venta, tarjetas, horario, zona, pedido mínimo |
| `src/views/SobreNosotros.tsx` | ~30 | historia (hitos 1968/1985/2005/Hoy), valores |
| `src/views/Consejos.tsx` | ~20 | artículos (eyebrow/título/excerpt), CTA |
| `src/views/Contacto.tsx` | ~15-20 | WhatsApp, tarjetas de contacto, horario/zona (comparte con Condiciones) |
| `src/views/EspecialSin.tsx` | ~10 | eyebrow, h1, descripción, tags dietéticos, CTA |
| `src/views/Foie.tsx` | ~7-10 | eyebrow, h1, descripción, secciones, CTA |
| `src/views/Despensa.tsx` | ~5 | eyebrow, h1, descripción, sección |
| `src/views/NotFound.tsx` | ~6 | + refactor del catalán incrustado (ver más abajo) |

### Etiquetas de filtros (datos estáticos en código)

`src/lib/products.ts` — objetos de labels (~19 strings):
`CLIENT_LABELS`, `DISH_LABELS`, `FOOD_LABELS`, `SPECIALTY_LABELS`.

> Decisión de implementación: estas etiquetas se renderizan en el catálogo. Se traducen
> envolviéndolas con `t()` en el punto de render (no se duplican los objetos), para no
> cambiar la forma del dato ni los slugs. Si el patrón existente ya las pasa por `t()` en
> algún sitio, se sigue ese patrón.

### Repaso de huecos

Revisar `Colmado.tsx`, `Quesos.tsx`, `SecretsDelXef.tsx` por si quedan strings sueltos sin
envolver y completarlos.

**Total estimado:** ~170-200 textos nuevos → diccionario final ~350 entradas.

## Reglas de traducción

- **Variante:** catalán estándar normatiu (IEC).
- **Sí se traduce** (coherente con lo ya hecho, p. ej. *Quesos → Formatges*):
  - Despensa → **Rebost**
  - Especial "Sin" → **Especial "Sense"**
  - Condiciones → **Condicions**
  - Contacto → **Contacte**
  - Consejos → **Consells**
  - Sobre Nosotros → **Sobre Nosaltres** (ya hecho)
- **No se traduce** (marca / nombres propios):
  - Aurellano, **Secrets du Xef**, **Colmado**, **Foie**, HORECA, Delicatessen
  - Términos en inglés ya usados como marca: Healthy Food, Cheese lovers, Limited Edition
  - Nombres de marcas de producto
- **Geografía** en catalán: Catalunya, Lleida, Girona, Tarragona, Empordà…
- Mantener emojis, números, formatos (horarios, importes, IBAN) intactos.

## Caso especial — `NotFound.tsx`

Ahora tiene catalán **incrustado a mano** (un `<p lang="ca">` duplicado junto al español).
Se refactoriza para usar `t()` como el resto → una sola fuente de verdad. Se eliminan los
textos catalanes duplicados del JSX y se mueven al diccionario.

## Fuera de alcance — datos de producto (fase 2)

Los siguientes campos vienen del PIM/Supabase **en español** y NO se traducen en esta entrega
(se muestran en español aunque la interfaz esté en catalán):

- `name`, `family`, `brand`
- `descripcion_corta`, `description_rich`, `ingredientes`, `flavor`, `tags`

Se renderizan principalmente en `ProductDetail.tsx` y en las tarjetas del catálogo.

### Plan de fase 2 (documentado, no se implementa ahora)

Para traducir también los datos de producto haría falta, en coordinación con Marco:

1. Añadir campos `_ca` al overlay `product_meta` en Supabase (p. ej. `descripcion_corta_ca`,
   `description_rich_ca`, `ingredientes_ca`) — o una tabla de traducciones por `product_ref`.
2. Un helper tipo `localizedField(meta, base, lang)` que devuelva la versión CA si existe,
   con fallback a la española.
3. UI de edición en el PIM para introducir las traducciones.
4. Estrategia de carga inicial (traducción manual vs asistida) de las fichas con foto.

Esto es un proyecto en sí mismo y depende de la BD de Marco → fuera del deadline del 15-jun.

## Verificación

- `npm run build` en verde (sin errores de TypeScript ni de build).
- **Recorrido manual con la web en catalán** por las 9 vistas pendientes: comprobar que no
  queda español "colado" en la interfaz ni aparecen claves crudas.
- **No regresión en español** (default): con ES, las páginas se ven exactamente igual que antes.
- **Grep final** de textos hardcodeados restantes en las vistas tocadas (literales JSX en
  español fuera de `t()`), para no dejar cabos sueltos.

## Entrega

- Worktree aislado: `~/.config/superpowers/worktrees/aurellano-escaparate/feat-traduccion-catalan`
  (rama `feat/traduccion-catalan` desde `origin/main`).
- **Commits semánticos por área:**
  1. `i18n: traducir páginas estáticas (Sobre Nosotros, Contacto, Condiciones, Consejos, 404)`
  2. `i18n: traducir vistas de producto (Foie, Despensa, Especial Sense)`
  3. `i18n: traducir catálogo + etiquetas de filtros`
  (+ posibles commits de repaso de huecos)
- **Un PR a Marco.** Sin deploy por nuestra parte (el merge dispara el autodeploy de Vercel).
- Disciplina de sesiones paralelas: `git fetch` antes de commitear, `git add` por nombre.

## Riesgos y mitigaciones

- **Riesgo:** dejar algún string sin traducir. **Mitigación:** el fallback muestra español
  (no rompe) + grep final + recorrido manual.
- **Riesgo:** romper algo al envolver con `t()` (interpolaciones, plurales). **Mitigación:**
  cambios mecánicos, `npm run build`, revisión visual; los textos con variables se tratan
  caso por caso.
- **Riesgo:** pisar trabajo de Marco / sesiones paralelas. **Mitigación:** worktree desde
  `origin/main`, PR (no push a main), fetch antes de commitear.
