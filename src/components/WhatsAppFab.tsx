import { MessageCircle } from "lucide-react";
import { WHATSAPP_LINK } from "@/lib/contact";

export const WhatsAppFab = () => (
  <a
    href={WHATSAPP_LINK}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Hablar por WhatsApp con Aurellano"
    className="fixed bottom-5 right-5 z-50 group"
  >
    <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" aria-hidden />
    <span className="relative flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-4 pr-5 py-3 shadow-glow hover:shadow-soft transition-all duration-300 hover:translate-y-[-2px]">
      <MessageCircle className="h-5 w-5" strokeWidth={2.2} />
      <span className="hidden sm:inline text-sm font-medium">WhatsApp</span>
    </span>
  </a>
);
