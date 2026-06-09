# Traducción al catalán del escaparate — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan checkbox (`- [ ]`).

**Goal:** Que con el selector en **CA** toda la interfaz visible del escaparate (chrome + páginas estáticas) aparezca en catalán, manteliendo el motor i18n actual y el español por defecto.

**Architecture:** No se toca el motor i18n. En cada vista pendiente se importa `useT()`/`useI18n()` y se envuelven los textos VISIBLES en español con `t("…")`. Las traducciones catalanas se añaden al objeto `ca` del diccionario en `src/lib/i18n.tsx`. El fallback `dict[key] ?? key` garantiza que cualquier clave sin traducir muestre el español (nunca rompe).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript. Diccionario plano `{ "frase es": "frase ca" }`.

---

## Patrón de transformación (idéntico en todas las vistas)

**Import** (añadir si no está):
```tsx
import { useT } from "@/lib/i18n";
```

**Dentro del componente** (al principio del cuerpo):
```tsx
const t = useT();
```
> Si la vista ya hace `useI18n()` sin desestructurar `t` (caso `Colmado.tsx`), cambiarlo a `const { t } = useI18n();` o `const t = useT();`.

**Envolver textos visibles:**
```tsx
// ANTES
<p className="eyebrow">La despensa</p>
<h1 className="display text-balance">Despensa<br /><span className="italic font-light text-accent">gourmet.</span></h1>
<a ...><MessageCircle className="h-5 w-5" /> Hablar con nosotros</a>

// DESPUÉS
<p className="eyebrow">{t("La despensa")}</p>
<h1 className="display text-balance">{t("Despensa")}<br /><span className="italic font-light text-accent">{t("gourmet.")}</span></h1>
<a ...><MessageCircle className="h-5 w-5" /> {t("Hablar con nosotros")}</a>
```

**Añadir al diccionario** `src/lib/i18n.tsx` dentro del objeto `ca`:
```tsx
"La despensa": "El rebost",
"Despensa": "Rebost",
"gourmet.": "gourmet.",
"Hablar con nosotros": "Parlar amb nosaltres",
```

## Reglas de traducción (del spec)

- Catalán estándar normatiu (IEC).
- **Sí se traduce:** Despensa→Rebost · Especial "Sin"→Especial "Sense" · Condiciones→Condicions · Contacto→Contacte · Consejos→Consells.
- **No se traduce (marca/propios):** Aurellano · Secrets du Xef · Colmado · Foie · HORECA · Delicatessen · términos en inglés (Healthy Food, Cheese lovers, Limited Edition) · marcas de producto.
- **Geografía en catalán:** Catalunya, Lleida, Girona, Tarragona, Empordà…
- Mantener emojis, números, importes, horarios e IBAN intactos.

## Qué queda FUERA (no envolver)

1. **Datos de producto** (vienen del PIM en español): `name`, `family`, `brand`, `descripcion_corta`, `description_rich`, `ingredientes`, `flavor`, `tags`. → fase 2.
2. **`seoTitle` / `seoDescription`** (props del `Layout`): son metadata, no texto visible en pantalla. Se dejan en español en esta fase (SEO multiidioma = trabajo aparte).
3. **Texto de admin/diagnóstico**: `EmptyHubMessage` de `Colmado.tsx` ("En el PIM…", "correr la migración SQL…") solo lo ve el admin con catálogo vacío. NO se traduce.

## Plurales / interpolaciones

Strings con variable (p. ej. `"X producto(s)"` en `Catalogo.tsx`) se tratan caso por caso: traducir las piezas por separado, p. ej.
```tsx
// "1 producto" / "N productos"
`${n} ${n === 1 ? t("producto") : t("productos")}`
```
con `"producto": "producte"` y `"productos": "productes"` en el diccionario.

## Estrategia de ejecución (subagent-driven)

Para evitar conflictos en el archivo compartido `i18n.tsx`:

- **Fase A (paralela):** un subagente por vista/grupo. Cada uno SOLO edita SUS vistas (archivos distintos → sin conflicto) envolviendo los textos visibles con `t()`, y **devuelve la lista de pares `"es": "ca"`** que hay que añadir al diccionario (NO edita `i18n.tsx`).
- **Fase B (consolidación, secuencial):** el orquestador añade TODAS las entradas devueltas al objeto `ca` de `src/lib/i18n.tsx` en un único paso, agrupadas por área con comentarios.
- **Fase C (verificación + commits):** build, grep, recorrido y commits semánticos por área.

> El fallback desacopla A y B: aunque una vista quede envuelta antes de que su traducción esté en el diccionario, se ve el español (no rompe). El orden no afecta a la corrección.

---

## Task 1: Vistas de producto (Foie, Despensa, Especial Sense, Colmado)

**Files:**
- Modify: `src/views/Foie.tsx`
- Modify: `src/views/Despensa.tsx`
- Modify: `src/views/EspecialSin.tsx`
- Modify: `src/views/Colmado.tsx` (solo textos visibles; NO `EmptyHubMessage` ni SEO)

- [ ] **Step 1: Leer las 4 vistas** y listar todos los textos visibles en español (hero eyebrow/h1/descripción, secciones, botones, tags). Excluir SEO props y `EmptyHubMessage`.

- [ ] **Step 2: Envolver** cada texto visible con `t("…")`. Añadir `import { useT } from "@/lib/i18n";` y `const t = useT();` donde falte. En `Colmado.tsx`, cambiar `useI18n();` por `const t = useT();` y usar `t()` en los strings inline (incluido el array de beneficios `{ t: "Surtido curado", d: "…" }` → renderizar `{t(b.t)}` / `{t(b.d)}` envolviendo en el JSX, NO renombrar las claves del objeto).

- [ ] **Step 3: Devolver** la lista de pares `"es": "ca"` de estas vistas (ver Reglas de traducción). Ejemplo Despensa: `"La despensa"→"El rebost"`, `"Despensa"→"Rebost"`, `"Conservas, aceites, vinagres, panes, pasta y dulces. La base de cualquier cocina con criterio."→"Conserves, olis, vinagres, pans, pasta i dolços. La base de qualsevol cuina amb criteri."`, `"Hablar con nosotros"→"Parlar amb nosaltres"`.

- [ ] **Step 4: Verificar build** (tras Fase B):

Run: `cd <worktree> && npm run build`
Expected: build sin errores TypeScript.

- [ ] **Step 5: Commit**

```bash
git add src/views/Foie.tsx src/views/Despensa.tsx src/views/EspecialSin.tsx src/views/Colmado.tsx src/lib/i18n.tsx
git commit -m "i18n: traduir vistes de producte (Foie, Rebost, Especial Sense, Colmado)"
```

---

## Task 2: Páginas estáticas (Sobre Nosotros, Contacto, Condiciones, Consejos, 404)

**Files:**
- Modify: `src/views/SobreNosotros.tsx`
- Modify: `src/views/Contacto.tsx`
- Modify: `src/views/Condiciones.tsx`
- Modify: `src/views/Consejos.tsx`
- Modify: `src/views/NotFound.tsx`

- [ ] **Step 1: Leer las 5 vistas** y listar textos visibles. Atención a arrays de datos (hitos de historia, valores, tarjetas de condiciones, artículos de consejos): se renderizan en `.map()`, así que se envuelve el valor en el punto de render (`{t(item.title)}`), no se rompe la estructura del array.

- [ ] **Step 2: Envolver** con `t()` + import/hook donde falte.

- [ ] **Step 3 (NotFound refactor):** eliminar el párrafo catalán incrustado a mano (`<p lang="ca">…`) y dejar un único bloque que use `t()`. Las dos frases (es/ca) pasan al diccionario como una entrada.

- [ ] **Step 4: Devolver** los pares `"es": "ca"` de estas vistas. Ejemplos: `"Hablemos"→"Parlem-ne"`, `"Condiciones de venta"→"Condicions de venda"`, `"Devoluciones"→"Devolucions"`, `"Pedido mínimo"→"Comanda mínima"`, `"Zona de servicio"→"Zona de servei"`, `"Horario"→"Horari"`, `"Lunes a Viernes"→"De dilluns a divendres"`, `"+50 años seleccionando producto con criterio"→"+50 anys seleccionant producte amb criteri"`.

- [ ] **Step 5: Verificar build** (tras Fase B): `npm run build` → sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/views/SobreNosotros.tsx src/views/Contacto.tsx src/views/Condiciones.tsx src/views/Consejos.tsx src/views/NotFound.tsx src/lib/i18n.tsx
git commit -m "i18n: traduir pàgines estàtiques (Sobre Nosaltres, Contacte, Condicions, Consells, 404)"
```

---

## Task 3: Catálogo + etiquetas de filtros

**Files:**
- Modify: `src/views/Catalogo.tsx`
- Modify: `src/lib/products.ts` (o el punto de render de las labels)

- [ ] **Step 1: Leer `Catalogo.tsx`** y listar textos visibles: hero, "Filtros", nombres de grupos de filtros ("Tipo de cliente", "Tipo de producto", "Categoría alimentaria", "Especialidades", "Alérgenos", "Precio"), checkboxes ("Sin gluten", "Sin lactosa", "Vegano"), placeholder de búsqueda ("Buscar producto o marca…"), "Limpiar filtros", contador de resultados.

- [ ] **Step 2: Localizar el render de las labels** de `CLIENT_LABELS`/`DISH_LABELS`/`FOOD_LABELS`/`SPECIALTY_LABELS`. Envolver con `t()` en el punto de render (no duplicar los objetos ni tocar los slugs/keys). Si los valores son nombres propios/inglés (Healthy Food, Delicatessen, Secrets du Chef), NO traducir.

- [ ] **Step 3: Tratar el contador** de resultados con el patrón de plural (`"producto"`/`"productos"` → `"producte"`/`"productes"`).

- [ ] **Step 4: Devolver** los pares `"es": "ca"`. Ejemplos: `"Filtros"→"Filtres"`, `"Tipo de cliente"→"Tipus de client"`, `"Tipo de producto"→"Tipus de producte"`, `"Categoría alimentaria"→"Categoria alimentària"`, `"Especialidades"→"Especialitats"`, `"Alérgenos"→"Al·lèrgens"` (ya existe), `"Precio"→"Preu"`, `"Sin gluten"→"Sense gluten"`, `"Sin lactosa"→"Sense lactosa"`, `"Vegano"→"Vegà"`, `"Limpiar filtros"→"Esborrar filtres"`, `"Buscar producto o marca…"→"Cercar producte o marca…"`, `"Restaurantes"→"Restaurants"`, `"Cafeterías"→"Cafeteries"`, `"Bares"→"Bars"`, `"Tiendas gourmet"→"Botigues gourmet"`, `"Primeros platos"→"Primers plats"`, `"Segundos platos"→"Segons plats"`, `"Postres"→"Postres"`, `"Ingredientes"→"Ingredients"`, `"Platos preparados"→"Plats preparats"`, `"Pasta"→"Pasta"`, `"Dulces"→"Dolços"`, `"Salado"→"Salat"`, `"Bebidas"→"Begudes"`, `"Quesos"→"Formatges"` (ya existe).

- [ ] **Step 5: Verificar build** (tras Fase B): `npm run build` → sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/views/Catalogo.tsx src/lib/products.ts src/lib/i18n.tsx
git commit -m "i18n: traduir catàleg + etiquetes de filtres"
```

---

## Task 4: Repaso de huecos + verificación final

**Files:**
- Modify (si hace falta): `src/views/Quesos.tsx`, `src/views/SecretsDelXef.tsx`, y cualquier vista con strings sueltos.

- [ ] **Step 1: Grep de literales en español sin envolver** en las vistas tocadas:

Run:
```bash
cd <worktree>
# Heurística: texto entre tags JSX con letras (incluye acentos) que NO esté ya en {t(...)}
grep -rnE '>[^<>{]*[a-záéíóúñ][^<>{]*<' src/views/ | grep -v 't(' | head -50
```
Expected: revisar manualmente; envolver los que sean texto visible de cara al público (ignorar SEO/admin/clases).

- [ ] **Step 2: Completar huecos** detectados en Quesos/SecretsDelXef u otras, mismo patrón, y devolver sus pares `"es":"ca"` para la Fase B.

- [ ] **Step 3: Build final**

Run: `cd <worktree> && npm run build`
Expected: build verde, 0 errores.

- [ ] **Step 4: Recorrido manual (CA)** — levantar dev server, poner cookie/​selector en CA y recorrer: Catálogo, Foie, Despensa, Especial Sense, Condiciones, Contacto, Consejos, Sobre Nosaltres, 404. Comprobar: 0 español colado en interfaz, 0 claves crudas. Verificar que en ES (default) todo sigue igual (no regresión).

- [ ] **Step 5: Commit** (si hubo cambios)

```bash
git add -A
git commit -m "i18n: repàs de buits de traducció + verificació"
```

---

## Self-review del plan (cobertura del spec)

- ✅ 9 vistas pendientes → Tasks 1, 2, 3 (+ huecos en 4).
- ✅ Etiquetas de filtros (`products.ts`) → Task 3.
- ✅ Refactor 404 → Task 2 Step 3.
- ✅ Reglas de traducción (sí/no, geografía) → sección Reglas + ejemplos por tarea.
- ✅ Datos de producto fuera de alcance + fase 2 → sección "Qué queda FUERA" + spec.
- ✅ Verificación (build + grep + recorrido + no regresión ES) → Task 4.
- ✅ Entrega (un PR, commits por área) → mensajes de commit en cada tarea.
- ➕ Precisiones nuevas (no en el spec, documentadas aquí): SEO meta y `EmptyHubMessage` (admin) fuera de alcance; plurales caso por caso.
