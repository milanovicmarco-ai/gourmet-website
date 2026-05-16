"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/integrations/supabase/server";
import { chat, SYSTEM_VOICE } from "@/lib/ai";
import type { Locale, ProductTranslation } from "@/lib/pim/translations";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  return supabase;
}

const LOCALE_LABEL: Record<Locale, string> = {
  ca: "catalán",
  en: "inglés",
};

const TRANSLATABLE_FIELDS = [
  "name",
  "descripcion_corta",
  "description_rich",
  "flavor",
  "origen",
  "ingredientes",
  "seo_title",
  "seo_description",
] as const;

export type TranslatableFields = {
  name?: string | null;
  descripcion_corta?: string | null;
  description_rich?: string | null;
  flavor?: string | null;
  origen?: string | null;
  ingredientes?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
};

export async function saveTranslation(
  productRef: string,
  locale: Locale,
  fields: TranslatableFields,
) {
  const supabase = await requireAdmin();

  const norm = (v: unknown): string | null => {
    if (v == null) return null;
    const s = String(v).trim();
    return s.length === 0 ? null : s;
  };

  const payload: ProductTranslation = {
    product_ref: productRef,
    locale,
    name: norm(fields.name),
    descripcion_corta: norm(fields.descripcion_corta),
    description_rich: norm(fields.description_rich),
    flavor: norm(fields.flavor),
    origen: norm(fields.origen),
    ingredientes: norm(fields.ingredientes),
    seo_title: norm(fields.seo_title),
    seo_description: norm(fields.seo_description),
  };

  const { error } = await supabase
    .from("product_translations")
    .upsert(payload, { onConflict: "product_ref,locale" });
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/products/${productRef}`);
  revalidatePath("/admin/products");
  revalidatePath("/catalogo");
}

/** Traduce un conjunto de campos al idioma destino con OpenAI manteniendo voz Aurellano. */
export async function translateFields(
  source: TranslatableFields,
  targetLocale: Locale,
): Promise<TranslatableFields> {
  await requireAdmin();

  // Compactamos el contexto para reducir tokens
  const nonEmpty: Record<string, string> = {};
  for (const key of TRANSLATABLE_FIELDS) {
    const v = source[key];
    if (typeof v === "string" && v.trim().length > 0) nonEmpty[key] = v.trim();
  }

  if (Object.keys(nonEmpty).length === 0) return {};

  const userPrompt = `Traduce los siguientes campos de un producto gastronómico de español a ${LOCALE_LABEL[targetLocale]}. Mantén la voz Aurellano (profesional, gastronómica, sin clichés). Si un campo es Markdown, conserva el formato Markdown (negritas, listas, saltos de párrafo). Si hay términos técnicos gastronómicos en francés/italiano que se usan tal cual en la industria (mi-cuit, ratatouille, parmigiano), NO los traduzcas.

CAMPOS ORIGINALES (JSON):
${JSON.stringify(nonEmpty, null, 2)}

INSTRUCCIONES DE OUTPUT:
- Devuelve SÓLO un objeto JSON válido con las MISMAS CLAVES.
- Cada valor: la traducción del campo correspondiente.
- Sin preamble, sin comentarios, sin bloque \`\`\`.`;

  const result = await chat(
    [
      { role: "system", content: SYSTEM_VOICE },
      { role: "user", content: userPrompt },
    ],
    { temperature: 0.3, max_tokens: 1800 },
  );

  // Limpieza defensiva: si la respuesta viene con bloque markdown, lo quitamos
  const cleaned = result
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();

  let parsed: Record<string, string>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("La IA no devolvió JSON válido. Reintenta.");
  }

  return parsed as TranslatableFields;
}
