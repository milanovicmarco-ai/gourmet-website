"use client";

import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { MessageCircle, Phone, Mail, MapPin, Instagram } from "lucide-react";
import { WHATSAPP_LINK, WHATSAPP_DISPLAY, PHONE_FIXED, EMAIL, INSTAGRAM, INSTAGRAM_HANDLE, ADDRESS, GOOGLE_BUSINESS_URL } from "@/lib/contact";
import { useI18n } from "@/lib/i18n";

const Contacto = () => {
  const { t } = useI18n();
  return (
  <Layout
    seoTitle="Contacto | Aurellano Productes Gastronòmics"
    seoDescription="WhatsApp +34 621 228 811, teléfono 973 248 266 y email hola@aurellano.com. Lun-Vie 8:00-18:00. Carrer de les Valls d'Andorra 52, 25005 Lleida."
  >
    <section className="relative overflow-hidden">
      <Circle variant="blur" className="w-[500px] h-[500px] -top-40 -right-40" />
      <div className="container-edit pt-32 md:pt-40 pb-16 md:pb-20 max-w-4xl space-y-6 relative">
        <p className="eyebrow">{t("Hablemos")}</p>
        <h1 className="display text-balance">{t("Estamos al otro")}<br /><span className="italic font-light text-accent">{t("lado del WhatsApp.")}</span></h1>
        <p className="text-lg text-muted-foreground max-w-2xl">{t("El canal principal de Aurellano es WhatsApp. Te respondemos rápido, con propuesta y precios.")}</p>
      </div>
    </section>

    <section className="container-edit pb-20 md:pb-28 grid lg:grid-cols-12 gap-8">
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="lg:col-span-7 group relative overflow-hidden rounded-3xl bg-accent text-accent-foreground p-10 md:p-14 hover-lift"
      >
        <Circle variant="outline" className="w-80 h-80 -top-20 -right-20 border-accent-foreground/20" />
        <Circle variant="outline" className="w-64 h-64 -bottom-20 -left-20 border-accent-foreground/20" />
        <div className="relative space-y-5">
          <MessageCircle className="h-10 w-10" strokeWidth={1.5} />
          <h2 className="font-display font-light text-4xl md:text-5xl tracking-tight">WhatsApp</h2>
          <p className="text-accent-foreground/85 text-lg">{WHATSAPP_DISPLAY}</p>
          <p className="text-sm text-accent-foreground/70 max-w-md">{t("Respondemos en horas en horario laboral. Cuéntanos qué buscas.")}</p>
        </div>
      </a>

      <div className="lg:col-span-5 space-y-4">
        {[
          { icon: Phone, label: "Teléfono", value: PHONE_FIXED, href: `tel:${PHONE_FIXED.replace(/\s/g, "")}` },
          { icon: Mail, label: "Email", value: EMAIL, href: `mailto:${EMAIL}` },
          { icon: Instagram, label: "Instagram", value: INSTAGRAM_HANDLE, href:"https://www.instagram.com/aurellano1968/" },
          { icon: MapPin, label: "Dirección", value: ADDRESS, href: GOOGLE_BUSINESS_URL },
        ].map((item) => (
          <a key={item.label} href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="flex items-center gap-5 rounded-2xl border border-border p-6 hover:border-accent transition-colors group">
            <div className="h-12 w-12 rounded-full bg-secondary grid place-items-center group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
              <item.icon className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t(item.label)}</p>
              <p className="font-medium mt-0.5">{item.value}</p>
            </div>
          </a>
        ))}
      </div>
    </section>

    <section className="bg-secondary/40 border-t border-border">
      <div className="container-edit py-16 md:py-20 grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <p className="eyebrow">{t("Horario")}</p>
          <p className="mt-3">{t("Lunes a Viernes")}<br />8:00 — 18:00 h</p>
        </div>
        <div>
          <p className="eyebrow">{t("Zona de servicio")}</p>
          <p className="mt-3">{t("España peninsular y Andorra.")}<br />{t("24–48h en Cataluña.")}</p>
        </div>
        <div>
          <p className="eyebrow">{t("Pedido mínimo")}</p>
          <p className="mt-3">{t("Desde 200€ portes incluidos.")}<br />{t("Pedidos en cajas completas.")}</p>
        </div>
      </div>
    </section>
  </Layout>
  );
};

export default Contacto;
