// /api/chat — endpoint del Asistente Gourmet (chat público de la web).
//
// Sustituye la antigua Supabase Edge Function `gourmet-chat`. Aquí proxiamos a
// OpenAI con streaming SSE para que la respuesta aparezca token a token.

import { AI_MODEL } from "@/lib/ai";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT_ES = `Eres el Asistente Gourmet de Aurellano Productes Gastronòmics, distribuidor con +50 años en Cataluña que sirve a restaurantes, hoteles y tiendas especializadas.

VOZ:
- Profesional, cercano, gastronómico. Sin clichés ni adjetivos vacíos ("exquisito", "sublime").
- Concreto: datos > frases.
- Si el usuario pregunta por un producto que podríamos tener, sugiere navegar al catálogo (/catalogo) o contactar por WhatsApp.

REGLAS:
- Idioma: español neutro.
- Markdown ligero permitido: negrita con ** **, listas con -, saltos de párrafo.
- No inventes referencias específicas. Si no sabes algo, dilo y orienta a contacto.
- Máx 200 palabras por respuesta.`;

const SYSTEM_PROMPT_CA = `Ets l'Assistent Gourmet d'Aurellano Productes Gastronòmics, distribuïdor amb +50 anys a Catalunya que serveix a restaurants, hotels i botigues especialitzades.

VEU:
- Professional, proper, gastronòmic. Sense clixés ni adjectius buits.
- Concret: dades > frases.
- Si l'usuari pregunta per un producte que podríem tenir, suggereix navegar al catàleg (/catalogo) o contactar per WhatsApp.

REGLES:
- Idioma: català.
- Markdown lleuger permès: negreta amb ** **, llistes amb -, salts de paràgraf.
- No t'inventis referències específiques. Si no ho saps, digues-ho i orienta a contacte.
- Màx 200 paraules per resposta.`;

type Msg = { role: "system" | "user" | "assistant"; content: string };

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY no configurada en el server." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  let body: { messages?: Msg[]; lang?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }
  const userMessages = Array.isArray(body.messages) ? body.messages : [];
  const lang = body.lang === "ca" ? "ca" : "es";
  const system = lang === "ca" ? SYSTEM_PROMPT_CA : SYSTEM_PROMPT_ES;

  // Mete el system prompt al inicio y limita historial reciente.
  const messages: Msg[] = [
    { role: "system", content: system },
    ...userMessages.filter((m) => m && (m.role === "user" || m.role === "assistant")).slice(-12),
  ];

  const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    console.error(`[/api/chat] OpenAI ${upstream.status}:`, text.slice(0, 400));
    return new Response(
      JSON.stringify({ error: `OpenAI ${upstream.status}` }),
      { status: upstream.status, headers: { "Content-Type": "application/json" } },
    );
  }

  // Reenvía el stream de OpenAI tal cual (formato SSE compatible con el cliente).
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
