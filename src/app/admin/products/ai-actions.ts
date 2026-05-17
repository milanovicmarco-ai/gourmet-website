"use server";

import { createClient } from "@/integrations/supabase/server";
import { chat, SYSTEM_VOICE } from "@/lib/ai";
import { getProductByRef } from "@/lib/pim/api";

async function requireAdmin() {
  // En dev se puede saltar el gate Supabase con DEV_BYPASS_ADMIN_AUTH=1.
  if (process.env.DEV_BYPASS_ADMIN_AUTH === "1") return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
}

export type AIField =
  | "short_description"
  | "long_description"
  | "seo_title"
  | "seo_description"
  | "pairings"
  | "tags"
  | "flavor";

const FIELD_PROMPTS: Record<AIField, { task: string; max_tokens: number; temperature: number }> = {
  short_description: {
    task:
      "Redacta una DESCRIPCIÓN CORTA del producto en 1-2 frases (entre 120 y 220 caracteres). Que destaque la propuesta de valor y el aspecto sensorial relevante (textura, sabor, uso). Termina con punto. Devuelve SOLO el texto.",
    max_tokens: 200,
    temperature: 0.6,
  },
  long_description: {
    task:
      "Redacta una DESCRIPCIÓN LARGA del producto (2-3 párrafos, entre 400 y 700 caracteres totales). Estructura: 1) origen/proceso/ingredientes (basado en datos reales del contexto). 2) perfil sensorial. 3) sugerencia de uso/maridaje en cocina profesional. Sin clichés. Devuelve SOLO el texto, sin títulos ni encabezados.",
    max_tokens: 500,
    temperature: 0.65,
  },
  seo_title: {
    task:
      "Genera un SEO TITLE en español. EXACTAMENTE el formato: '{producto} | Aurellano Productes Gastronòmics'. Máximo 60 caracteres TOTALES. Si excede, abrevia el nombre del producto. Devuelve SOLO el title, sin comillas.",
    max_tokens: 80,
    temperature: 0.4,
  },
  seo_description: {
    task:
      "Genera una SEO DESCRIPTION en español. Máximo 155 caracteres. Que incluya: tipo de producto, propuesta de valor, una llamada a la acción suave (descúbrelo, pídelo, etc). Sin signos de exclamación. Devuelve SOLO el texto.",
    max_tokens: 100,
    temperature: 0.5,
  },
  pairings: {
    task:
      "Sugiere MARIDAJES para este producto en formato de lista separada por comas. Entre 3 y 5 maridajes concretos y verificables (vino, ingrediente, plato). Devuelve SOLO los maridajes separados por comas, nada más. Ejemplo de output: 'Membrillo, Vino tinto reserva, Pan rústico'.",
    max_tokens: 80,
    temperature: 0.6,
  },
  tags: {
    task:
      "Sugiere TAGS / BADGES para este producto. Entre 3 y 5 tags. Que sean términos cortos y filtrables: DOP, Premium, Artesanal, Vegano, Sin gluten, etc. Devuelve SOLO los tags separados por comas, nada más.",
    max_tokens: 60,
    temperature: 0.5,
  },
  flavor: {
    task:
      "Describe el PERFIL DE SABOR del producto en una sola línea (máximo 100 caracteres). Notas concretas sin clichés. Ejemplo: 'Intenso, ligeramente picante, notas de avellana tostada'. Devuelve SOLO la línea de sabor.",
    max_tokens: 60,
    temperature: 0.6,
  },
};

function buildContext(p: Awaited<ReturnType<typeof getProductByRef>>) {
  if (!p) return "Producto sin datos.";
  const pieces = [
    `Nombre: ${p.name}`,
    p.brand && `Marca: ${p.brand}`,
    p.family && `Familia: ${p.family}`,
    p.origen && `Origen: ${p.origen}`,
    p.flavor && `Sabor actual: ${p.flavor}`,
    p.ingredientes && `Ingredientes: ${p.ingredientes}`,
    p.alergenos && `Alérgenos: ${typeof p.alergenos === "string" ? p.alergenos : p.alergenos.join(", ")}`,
    p.formato_opciones?.[0]?.label && `Formato: ${p.formato_opciones[0].label}`,
    p.descripcion_corta && `Descripción corta actual: ${p.descripcion_corta}`,
    p.description_rich && `Descripción larga actual: ${p.description_rich.slice(0, 400)}`,
    Array.isArray(p.tags) && p.tags.length && `Tags actuales: ${p.tags.join(", ")}`,
    Array.isArray(p.pairings) && p.pairings.length && `Maridajes actuales: ${p.pairings.join(", ")}`,
  ].filter(Boolean);
  return pieces.join("\n");
}

/**
 * Genera una sugerencia de IA para un campo concreto del producto.
 * Trae el producto desde la API (para tener todo el contexto en server-side) y llama a OpenAI.
 */
export async function suggestField(productRef: string, field: AIField): Promise<string> {
  await requireAdmin();
  const product = await getProductByRef(productRef);
  if (!product) throw new Error("Producto no encontrado");

  const cfg = FIELD_PROMPTS[field];
  if (!cfg) throw new Error(`Campo no soportado: ${field}`);

  const userPrompt = `CONTEXTO DEL PRODUCTO:
${buildContext(product)}

TAREA:
${cfg.task}`;

  const result = await chat(
    [
      { role: "system", content: SYSTEM_VOICE },
      { role: "user", content: userPrompt },
    ],
    { temperature: cfg.temperature, max_tokens: cfg.max_tokens },
  );

  return result;
}

/**
 * Variante que usa el contenido del FORM EN VIVO del usuario (incluso si todavía no se ha guardado).
 * Útil para regenerar SEO basándose en cambios no persistidos.
 */
export async function suggestFieldFromContext(
  field: AIField,
  context: Record<string, string | string[] | null | undefined>,
): Promise<string> {
  await requireAdmin();

  const cfg = FIELD_PROMPTS[field];
  if (!cfg) throw new Error(`Campo no soportado: ${field}`);

  const lines = Object.entries(context)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join("\n");

  const userPrompt = `CONTEXTO DEL PRODUCTO (en edición):
${lines}

TAREA:
${cfg.task}`;

  const result = await chat(
    [
      { role: "system", content: SYSTEM_VOICE },
      { role: "user", content: userPrompt },
    ],
    { temperature: cfg.temperature, max_tokens: cfg.max_tokens },
  );

  return result;
}
