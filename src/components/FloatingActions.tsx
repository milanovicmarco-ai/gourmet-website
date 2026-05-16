"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Sparkles, X, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { WHATSAPP_LINK } from "@/lib/contact";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTION_KEYS = [
  "¿Qué quesos recomendarías para una tabla equilibrada?",
  "Busco un foie para un menú de Navidad",
  "Productos sin gluten para una cafetería",
];

const WELCOME_KEY =
  "¡Hola! Soy el **Asistente Gourmet de Aurellano** 👨‍🍳\n\nPregúntame sobre quesos, foie, maridajes, productos sin gluten o lo que necesites para tu negocio.";

export const FloatingActions = () => {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: t(WELCOME_KEY) },
  ]);

  // Refresh welcome message when language changes (only if conversation hasn't started)
  useEffect(() => {
    setMessages((prev) => (prev.length <= 1 ? [{ role: "assistant", content: t(WELCOME_KEY) }] : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Nuestro propio endpoint en Next.js (Route Handler) que proxia a OpenAI.
      // Antes apuntaba a una Supabase Edge Function que nunca se desplegó.
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, lang }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        let msg = t("No pude responder ahora mismo. Prueba en un momento o escríbenos por WhatsApp.");
        if (resp.status === 429) msg = t("Demasiadas consultas seguidas. Espera unos segundos e inténtalo de nuevo.");
        if (resp.status === 402) msg = t("El asistente está temporalmente fuera de servicio. Escríbenos por WhatsApp.");
        setMessages((p) => [...p, { role: "assistant", content: msg }]);
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";
      let done = false;

      setMessages((p) => [...p, { role: "assistant", content: "" }]);

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages((p) => p.map((m, i) => (i === p.length - 1 ? { ...m, content: assistant } : m)));
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      if ((e as any)?.name !== "AbortError") {
        setMessages((p) => [
          ...p,
          { role: "assistant", content: t("Algo ha fallado. Inténtalo de nuevo o escríbenos por WhatsApp.") },
        ]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  // Toggle global: el Asistente Gourmet está deshabilitado de momento. Cambia
  // a `true` para re-activar (sin tocar el resto del componente).
  const ASSISTANT_ENABLED = false;

  return (
    <>
      {ASSISTANT_ENABLED && <>
      {/* Chat panel */}
      <div
        className={cn(
          "fixed z-[60] bg-background border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right",
          "bottom-24 right-4 sm:bottom-28 sm:right-5",
          "w-[calc(100vw-2rem)] sm:w-[400px] h-[min(600px,calc(100vh-10rem))]",
          open ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-90 pointer-events-none"
        )}
        role="dialog"
        aria-label={t("Asistente Gourmet")}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-accent flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <p className="font-display text-base leading-tight">{t("Asistente Gourmet")}</p>
              <p className="text-[11px] text-primary-foreground/60">Aurellano · IA</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label={t("Cerrar chat")}
            className="h-8 w-8 rounded-full hover:bg-primary-foreground/10 flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-secondary/30">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-background border border-border rounded-bl-md"
                )}
              >
                {m.role === "assistant" ? (
                  <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-strong:text-foreground">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{m.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="bg-background border border-border rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}

          {messages.length <= 1 && (
            <div className="space-y-2 pt-2">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground px-1">{t("Sugerencias")}</p>
              {SUGGESTION_KEYS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(t(s))}
                  className="block w-full text-left text-xs bg-background border border-border rounded-xl px-3 py-2 hover:border-accent hover:text-accent transition-colors"
                >
                  {t(s)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="p-3 border-t border-border bg-background flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("Pregúntame sobre quesos, foie…")}
            disabled={loading}
            className="flex-1 bg-secondary/60 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label={t("Enviar")}
            className="h-10 w-10 rounded-full bg-accent text-accent-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {/* AI Floating button — sin animaciones ni hover effects (criterio Marco) */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t("Cerrar Asistente Gourmet") : t("Abrir Asistente Gourmet")}
        className="fixed bottom-[5.5rem] right-5 z-50"
      >
        <span className="relative flex items-center gap-2 bg-primary text-primary-foreground rounded-full pl-4 pr-5 py-3">
          {open ? <X className="h-5 w-5" strokeWidth={2.2} /> : <Sparkles className="h-5 w-5" strokeWidth={2.2} />}
          <span className="hidden sm:inline text-sm font-medium">{open ? t("Cerrar") : t("Asistente Gourmet")}</span>
        </span>
      </button>

      </>}

      {/* WhatsApp button — sin animaciones ni hover effects */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("Hablar por WhatsApp con Aurellano")}
        className="fixed bottom-5 right-5 z-50"
      >
        <span className="relative flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-4 pr-5 py-3">
          <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
          <span className="hidden sm:inline text-sm font-medium">WhatsApp</span>
        </span>
      </a>
    </>
  );
};
