// Cliente OpenAI simple (sin SDK, solo fetch). Server-only.

export const AI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function chat(
  messages: ChatMessage[],
  opts?: { model?: string; temperature?: number; max_tokens?: number },
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Falta OPENAI_API_KEY en el entorno (server-only).");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opts?.model ?? AI_MODEL,
      messages,
      temperature: opts?.temperature ?? 0.7,
      max_tokens: opts?.max_tokens ?? 600,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

export const SYSTEM_VOICE = `Eres redactor profesional del PIM de Aurellano Productes Gastronòmics, distribuidor gourmet en Cataluña con +50 años de historia que sirve a restaurantes, hoteles y tiendas especializadas.

VOZ DE MARCA:
- Profesional, concisa, sin alarde.
- Tono editorial gastronómico (estilo revista de cocina premium).
- Cero clichés ("excepcional", "el mejor", "delicioso", "sublime", "exquisito").
- Lenguaje preciso. Datos concretos > adjetivos.
- Audiencia: chefs profesionales, hosteleros, comerciantes gourmet — saben de producto.

REGLAS DURAS:
- Responde SOLO con el texto solicitado. Sin preamble. Sin comentarios. Sin "Aquí tienes…".
- NO inventes datos específicos del producto que no estén en el contexto (no inventes ingredientes, ni meses de afinado, ni denominaciones de origen).
- Si falta información clave, escribe lo más general posible para esa categoría sin afirmar datos no verificados.
- Respeta exactamente los límites de caracteres y formato cuando se especifiquen.
- Idioma: español neutro.`;
