"use client";

import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { SectionHeader } from "@/components/SectionHeader";
import { Truck, Package, Snowflake, CreditCard, Phone, RefreshCw } from "lucide-react";
import { PHONE_FIXED, EMAIL, WHATSAPP_DISPLAY, WHATSAPP_LINK } from "@/lib/contact";
import { MessageCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

const Condiciones = () => {
  const t = useT();

  const cards = [
    {
      icon: Truck,
      title: "Entregas",
      body: (
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>{t("Cataluña")}: <strong className="text-foreground">24–48h</strong></li>
          <li>{t("Resto de España y Andorra")}: <strong className="text-foreground">48–72h</strong></li>
        </ul>
      ),
    },
    {
      icon: Package,
      title: "Pedido mínimo y portes",
      body: (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>{t("Pedido mínimo")}: <strong className="text-foreground">200€</strong> ({t("portes incluidos según zona")}):</p>
          <ul className="space-y-1 ml-4">
            <li>• {t("Zona 1")} — {t("Catalunya")}</li>
            <li>• {t("Zona 2")} — {t("Norte y centro")}</li>
            <li>• {t("Zona 3")} — {t("Sur")}</li>
          </ul>
          <p>{t("Pedidos inferiores")}: <strong className="text-foreground">+12€</strong> {t("gastos de envío.")}</p>
          <p>{t("Los pedidos se sirven en cajas completas.")}</p>
        </div>
      ),
    },
    {
      icon: Snowflake,
      title: "Productos congelados",
      body: <p className="text-sm text-muted-foreground">{t("Pedido mínimo")}: <strong className="text-foreground">200€</strong> ({t("según zona")}).</p>,
    },
    {
      icon: CreditCard,
      title: "Formas de pago",
      body: (
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p>{t("Transferencia bancaria antes del envío.")}</p>
          <p className="font-mono text-foreground text-xs bg-secondary px-3 py-2 rounded-lg inline-block">IBAN: ES68 0049 2596 5928 1409 0021</p>
        </div>
      ),
    },
    {
      icon: Phone,
      title: "Pedidos",
      body: (
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p>{t("Teléfono")}: <strong className="text-foreground">{PHONE_FIXED}</strong></p>
          <p>WhatsApp: <strong className="text-foreground">{WHATSAPP_DISPLAY}</strong></p>
          <p>{t("Email")}: <a href={`mailto:${EMAIL}`} className="text-foreground underline underline-offset-2">{EMAIL}</a></p>
        </div>
      ),
    },
    {
      icon: RefreshCw,
      title: "Devoluciones",
      body: (
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <p>{t("Plazo")}: <strong className="text-foreground">24h</strong> {t("desde la recepción.")}</p>
          <p>{t("Solo por producto defectuoso.")}</p>
        </div>
      ),
    },
  ];

  return (
  <Layout
    seoTitle="Condiciones de venta | Aurellano P. Gastronómicos"
    seoDescription="Pedido mínimo 200€. Entrega 24-48h en Cataluña, 48-72h en resto de España y Andorra. Formas de pago, devoluciones y zonas de servicio."
  >
    <section className="relative overflow-hidden">
      <Circle variant="accent" className="w-72 h-72 -top-10 -right-20" />
      <div className="container-edit pt-12 md:pt-20 pb-12 max-w-4xl space-y-6 relative">
        <p className="eyebrow">{t("Condiciones de venta")}</p>
        <h1 className="display text-balance">{t("Claras desde")}<br /><span className="italic font-light text-accent">{t("el primer pedido.")}</span></h1>
      </div>
    </section>

    <section className="container-edit pb-20 md:pb-28 grid md:grid-cols-2 gap-6 lg:gap-8">
      {cards.map((c) => (
        <div key={c.title} className="rounded-3xl border border-border p-8 bg-background hover-lift">
          <c.icon className="h-7 w-7 text-accent mb-5" strokeWidth={1.5} />
          <h3 className="font-display font-medium text-xl mb-4">{t(c.title)}</h3>
          {c.body}
        </div>
      ))}
    </section>

    <section className="container-edit pb-24 md:pb-32">
      <div className="rounded-3xl bg-primary text-primary-foreground p-10 md:p-14 text-center relative overflow-hidden">
        <Circle variant="outline" className="w-72 h-72 -top-20 -right-20 border-primary-foreground/10" />
        <div className="relative max-w-xl mx-auto space-y-5">
          <h2 className="display-md">{t("¿Más información?")}</h2>
          <p className="text-primary-foreground/70">{t("Estamos a tu disposición. Contáctanos por el canal que prefieras.")}</p>
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-6 pr-7 py-4 font-medium">
            <MessageCircle className="h-5 w-5" /> WhatsApp
          </a>
        </div>
      </div>
    </section>
  </Layout>
  );
};

export default Condiciones;
