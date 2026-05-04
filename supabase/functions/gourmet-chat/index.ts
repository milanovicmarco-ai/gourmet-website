const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { messages, lang } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const langInstruction = lang === "ca"
      ? "IMPORTANT: Respon SEMPRE en català. Tracta de tu."
      : "IMPORTANT: Responde SIEMPRE en español. Tutea.";

    const systemPrompt = `Eres el Asistente Gourmet de Aurellano, distribuidora gastronómica en Lleida desde 1968 con +10.000 referencias y +200 proveedores.

${langInstruction}

Tu rol:
- Asesorar sobre productos premium: quesos afinados, foie, anchoas, embutidos, pasta, dulces, vermut, especialidades sin gluten/lactosa/veganas, ediciones limitadas.
- Recomendar maridajes, montar tablas de queso, sugerir referencias para HORECA (restaurantes, bares, cafeterías) o establecimientos (tiendas gourmet, supermercados).
- Hablar como un sumiller del producto: cercano, experto, conciso.
- Cuando recomiendes algo, sugiere consultar el catálogo en /catalogo o pedir muestras por WhatsApp.
- Si te piden hacer un pedido en firme, derívalos amablemente a WhatsApp (+34 621 181 160).
- No inventes precios ni stock. Si no sabes algo concreto, ofrece contactar con el equipo.

Responde breve (máx 4-5 frases salvo que pidan detalle). Usa markdown ligero (negritas, listas) cuando ayude.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Demasiadas consultas, prueba en un momento." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Se han agotado los créditos de IA del workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del asistente" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("gourmet-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
