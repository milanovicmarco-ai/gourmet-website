// Esquema compartido entre el exportador y el importador bulk.
//
// La lista `BULK_COLUMNS` es la ÚNICA fuente de verdad: define el header en
// español, cómo extraer el valor del producto (export), y cómo escribirlo
// de vuelta al payload de la API o al overlay de Supabase (import).
//
// Reglas:
//  - Headers en español (Marco-friendly).
//  - Columnas booleanas se exportan como TRUE/FALSE strings (Excel acepta y
//    es legible humanamente). Aceptamos varios alias al importar: TRUE/SI/SÍ/X/1.
//  - Listas (tags, maridajes, alérgenos, catálogos) van CSV en una sola celda.
//  - Campos read-only están marcados con `readOnly: true` y se ignoran al importar.
//
// Para añadir un campo nuevo: añade una entrada a BULK_COLUMNS. Punto.

import type { ApiProduct } from "./api";
import type { ProductMeta } from "./product-meta";

/** Filas a exportar: API product + overlay meta + catálogos asignados. */
export type BulkRowSource = {
  product: ApiProduct;
  meta: ProductMeta | null;
  catalogSlugs: string[];
};

/** Lo que el importer construye desde una fila para aplicar cambios. */
export type ImportRow = {
  /** Acciones: update / create / delete. Se decide en el importer. */
  ref: string | null;
  refVisible: string | null;
  borrar: boolean;
  // Campos de la API
  name: string | null;
  family: string | null;
  status: "draft" | "published" | "archived" | null;
  brand: string | null;
  descripcion_corta: string | null;
  description_rich: string | null;
  origen: string | null;
  flavor: string | null;
  format: string | null;
  units_per_box: number | null;
  price_eur: number | null;
  tags: string[] | null;
  pairings: string[] | null;
  alergenos: string[] | null;
  ingredientes: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sin_gluten: boolean | null;
  sin_lactosa: boolean | null;
  vegetariano: boolean | null;
  // Overlay nuestro
  diet_no_nuts: boolean | null;
  diet_vegan: boolean | null;
  diet_no_added_sugar: boolean | null;
  diet_high_protein: boolean | null;
  diet_keto: boolean | null;
  diet_other: string | null;
  catalogos: string[] | null;
  // Clasificación gastronómica (overlay)
  gama: number | null;
  momento_plato: string | null;
  destacado: boolean | null;
  primer_precio: boolean | null;
};

type Cell = string | number | boolean | null;

export type BulkColumn = {
  header: string;
  /** Marcado como read-only: aparece en export pero se ignora al importar. */
  readOnly?: boolean;
  /** Pista para Excel: ancho aproximado de columna. */
  width?: number;
  /** Cómo extraer el valor del producto para el export. */
  toCell: (src: BulkRowSource) => Cell;
  /** Cómo leer la celda en el import. Devuelve qué campo de ImportRow rellenar. */
  fromCell?: (raw: unknown, row: Partial<ImportRow>) => void;
};

// ──────────────────────────────────────────────────────────────────────────────
// Parsers / formatters
// ──────────────────────────────────────────────────────────────────────────────

const csvJoin = (arr: string[] | null | undefined): string =>
  Array.isArray(arr) && arr.length > 0 ? arr.join(", ") : "";

const csvSplit = (v: unknown): string[] | null => {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (s.length === 0) return null;
  return s.split(",").map((x) => x.trim()).filter(Boolean);
};

const parseBool = (v: unknown): boolean | null => {
  if (v == null || v === "") return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["true", "1", "si", "sí", "x", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", ""].includes(s)) return false;
  return null;
};

const parseNumber = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
  if (s.length === 0) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

const parseStatus = (v: unknown): "draft" | "published" | "archived" | null => {
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (["draft", "borrador"].includes(s)) return "draft";
  if (["published", "publicado", "publish"].includes(s)) return "published";
  if (["archived", "archivado", "archive"].includes(s)) return "archived";
  return null;
};

const str = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
};

const bool = (v: boolean | null | undefined): string =>
  v === true ? "TRUE" : v === false ? "FALSE" : "";

// La marca real vive en product_meta.brand_override. Si no hay override, mostramos
// lo que tenga la API (suele ser el sentinel "Aurellano" o vacío).
const effectiveBrand = (src: BulkRowSource): string =>
  src.meta?.brand_override?.trim() || src.product.brand || "";

const effectiveRef = (src: BulkRowSource): string =>
  src.meta?.display_ref?.trim() || src.product.ref;

// ──────────────────────────────────────────────────────────────────────────────
// Schema
// ──────────────────────────────────────────────────────────────────────────────

export const BULK_COLUMNS: BulkColumn[] = [
  {
    header: "ref",
    width: 14,
    toCell: (s) => s.product.ref,
    fromCell: (raw, row) => {
      row.ref = str(raw);
    },
  },
  {
    header: "ref_visible",
    width: 16,
    toCell: (s) => effectiveRef(s),
    fromCell: (raw, row) => {
      row.refVisible = str(raw);
    },
  },
  {
    header: "borrar",
    width: 8,
    toCell: () => "",
    fromCell: (raw, row) => {
      row.borrar = parseBool(raw) === true;
    },
  },
  {
    header: "nombre",
    width: 36,
    toCell: (s) => s.product.name ?? "",
    fromCell: (raw, row) => {
      row.name = str(raw);
    },
  },
  {
    header: "familia",
    width: 16,
    toCell: (s) => s.product.family ?? "",
    fromCell: (raw, row) => {
      row.family = str(raw);
    },
  },
  {
    header: "estado",
    width: 12,
    toCell: (s) =>
      s.product.status ?? (s.product.active === false ? "archived" : "published"),
    fromCell: (raw, row) => {
      row.status = parseStatus(raw);
    },
  },
  {
    header: "marca",
    width: 22,
    toCell: (s) => effectiveBrand(s),
    fromCell: (raw, row) => {
      row.brand = str(raw);
    },
  },
  {
    header: "descripcion_corta",
    width: 50,
    toCell: (s) => s.product.descripcion_corta ?? "",
    fromCell: (raw, row) => {
      row.descripcion_corta = str(raw);
    },
  },
  {
    header: "descripcion_larga",
    width: 60,
    toCell: (s) => s.product.description_rich ?? "",
    fromCell: (raw, row) => {
      row.description_rich = str(raw);
    },
  },
  {
    header: "origen",
    width: 20,
    toCell: (s) => s.product.origen ?? "",
    fromCell: (raw, row) => {
      row.origen = str(raw);
    },
  },
  {
    header: "sabor",
    width: 30,
    toCell: (s) => s.product.flavor ?? "",
    fromCell: (raw, row) => {
      row.flavor = str(raw);
    },
  },
  {
    header: "formato",
    width: 18,
    toCell: (s) => s.product.formato_opciones?.[0]?.label ?? "",
    fromCell: (raw, row) => {
      row.format = str(raw);
    },
  },
  {
    header: "unidades_por_caja",
    width: 12,
    toCell: (s) => s.product.units_per_box ?? "",
    fromCell: (raw, row) => {
      row.units_per_box = parseNumber(raw);
    },
  },
  {
    header: "precio_eur",
    width: 10,
    toCell: (s) => s.product.base_price_eur ?? "",
    fromCell: (raw, row) => {
      row.price_eur = parseNumber(raw);
    },
  },
  {
    header: "tags",
    width: 30,
    toCell: (s) => csvJoin(s.product.tags),
    fromCell: (raw, row) => {
      row.tags = csvSplit(raw);
    },
  },
  {
    header: "maridajes",
    width: 30,
    toCell: (s) => csvJoin(s.product.pairings),
    fromCell: (raw, row) => {
      row.pairings = csvSplit(raw);
    },
  },
  {
    header: "alergenos",
    width: 24,
    toCell: (s) => {
      const a = s.product.alergenos;
      if (Array.isArray(a)) return csvJoin(a);
      return typeof a === "string" ? a : "";
    },
    fromCell: (raw, row) => {
      row.alergenos = csvSplit(raw);
    },
  },
  {
    header: "ingredientes",
    width: 50,
    toCell: (s) => s.product.ingredientes ?? "",
    fromCell: (raw, row) => {
      row.ingredientes = str(raw);
    },
  },
  {
    header: "seo_title",
    width: 40,
    toCell: (s) => s.product.seo_title ?? "",
    fromCell: (raw, row) => {
      row.seo_title = str(raw);
    },
  },
  {
    header: "seo_description",
    width: 50,
    toCell: (s) => s.product.seo_description ?? "",
    fromCell: (raw, row) => {
      row.seo_description = str(raw);
    },
  },
  {
    header: "sin_gluten",
    width: 10,
    toCell: (s) => bool(s.product.sin_gluten ?? false),
    fromCell: (raw, row) => {
      row.sin_gluten = parseBool(raw);
    },
  },
  {
    header: "sin_lactosa",
    width: 10,
    toCell: (s) => bool(s.product.sin_lactosa ?? false),
    fromCell: (raw, row) => {
      row.sin_lactosa = parseBool(raw);
    },
  },
  {
    header: "vegetariano",
    width: 10,
    toCell: (s) => bool(s.product.vegetariano ?? false),
    fromCell: (raw, row) => {
      row.vegetariano = parseBool(raw);
    },
  },
  {
    header: "sin_frutos_secos",
    width: 12,
    toCell: (s) => bool(s.meta?.diet_no_nuts ?? false),
    fromCell: (raw, row) => {
      row.diet_no_nuts = parseBool(raw);
    },
  },
  {
    header: "vegano",
    width: 10,
    toCell: (s) => bool(s.meta?.diet_vegan ?? false),
    fromCell: (raw, row) => {
      row.diet_vegan = parseBool(raw);
    },
  },
  {
    header: "sin_azucares_anadidos",
    width: 12,
    toCell: (s) => bool(s.meta?.diet_no_added_sugar ?? false),
    fromCell: (raw, row) => {
      row.diet_no_added_sugar = parseBool(raw);
    },
  },
  {
    header: "alto_proteinas",
    width: 12,
    toCell: (s) => bool(s.meta?.diet_high_protein ?? false),
    fromCell: (raw, row) => {
      row.diet_high_protein = parseBool(raw);
    },
  },
  {
    header: "keto",
    width: 8,
    toCell: (s) => bool(s.meta?.diet_keto ?? false),
    fromCell: (raw, row) => {
      row.diet_keto = parseBool(raw);
    },
  },
  {
    header: "dieta_otros",
    width: 28,
    toCell: (s) => s.meta?.diet_other ?? "",
    fromCell: (raw, row) => {
      row.diet_other = str(raw);
    },
  },
  {
    header: "catalogos",
    width: 28,
    toCell: (s) => csvJoin(s.catalogSlugs),
    fromCell: (raw, row) => {
      row.catalogos = csvSplit(raw);
    },
  },
  {
    header: "gama",
    width: 6,
    toCell: (s) => s.meta?.gama ?? "",
    fromCell: (raw, row) => {
      const n = parseNumber(raw);
      row.gama = n != null && n >= 1 && n <= 6 ? Math.floor(n) : null;
    },
  },
  {
    header: "momento_plato",
    width: 14,
    toCell: (s) => s.meta?.momento_plato ?? "",
    fromCell: (raw, row) => {
      const s = str(raw)?.toLowerCase();
      const valid = ["aperitivo", "entrante", "principal", "guarnicion", "postre"];
      row.momento_plato = s && valid.includes(s) ? s : null;
    },
  },
  {
    header: "destacado",
    width: 10,
    toCell: (s) => bool(s.meta?.destacado ?? false),
    fromCell: (raw, row) => {
      row.destacado = parseBool(raw);
    },
  },
  {
    header: "primer_precio",
    width: 12,
    toCell: (s) => bool(s.meta?.primer_precio ?? false),
    fromCell: (raw, row) => {
      row.primer_precio = parseBool(raw);
    },
  },
  // Columnas informativas (read-only): ayudan a Marco pero se ignoran al importar.
  {
    header: "score",
    readOnly: true,
    width: 8,
    toCell: (s) => s.product.optimization_score ?? "",
  },
  {
    header: "slug",
    readOnly: true,
    width: 32,
    toCell: (s) => s.product.slug ?? "",
  },
  {
    header: "imagen_principal",
    readOnly: true,
    width: 40,
    toCell: (s) => s.product.image_url ?? "",
  },
  {
    header: "num_imagenes",
    readOnly: true,
    width: 8,
    toCell: (s) => (Array.isArray(s.product.gallery) ? s.product.gallery.length : s.product.image_url ? 1 : 0),
  },
];

/** Construye una fila de Excel (array de celdas en el orden de BULK_COLUMNS). */
export function rowFromSource(src: BulkRowSource): Cell[] {
  return BULK_COLUMNS.map((c) => c.toCell(src));
}

/** Convierte un objeto fila (con headers como keys, vienen del parser xlsx)
 *  en un ImportRow tipado. Ignora columnas read-only. */
export function importRowFromObject(obj: Record<string, unknown>): ImportRow {
  const row: Partial<ImportRow> = { borrar: false };
  for (const col of BULK_COLUMNS) {
    if (col.readOnly) continue;
    if (!col.fromCell) continue;
    const raw = obj[col.header];
    col.fromCell(raw, row);
  }
  return row as ImportRow;
}

export const BULK_HEADERS: string[] = BULK_COLUMNS.map((c) => c.header);
