"use client";

import { Layout } from "@/components/Layout";
import { Circle } from "@/components/Circle";
import { EMAIL, WHATSAPP_LINK } from "@/lib/contact";
import { MessageCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

const Privacidad = () => {
  const t = useT();

  const sections = [
    {
      title: "Responsable del tratamiento",
      body: "Aurellano Productes Gastronòmics, con domicilio en Carrer de les Valls d'Andorra, 52, 25005 Lleida, email hola@aurellano.com y teléfono 973 248 266, es responsable del tratamiento de los datos que nos facilitas a través de este sitio web (formulario de contacto, WhatsApp o email).",
    },
    {
      title: "Finalidad del tratamiento",
      body: "Gestionar tus consultas comerciales, prepararte propuestas de producto y precios, y mantener la relación comercial una vez sois clientes. Si aceptas las cookies analíticas, también usamos datos de navegación agregados para mejorar la web (ver Política de Cookies).",
    },
    {
      title: "Legitimación",
      body: "El consentimiento que nos das al enviarnos tus datos (contacto) y, en su caso, la ejecución de la relación comercial una vez sois clientes.",
    },
    {
      title: "Destinatarios",
      body: "No cedemos tus datos a terceros salvo obligación legal. Usamos proveedores tecnológicos (hosting, email, Google Analytics si aceptas cookies analíticas) que actúan como encargados del tratamiento bajo contrato.",
    },
    {
      title: "Tus derechos",
      body: "Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiéndonos a hola@aurellano.com adjuntando copia de tu DNI o documento equivalente.",
    },
    {
      title: "Conservación de los datos",
      body: "Conservamos tus datos mientras dure la relación comercial y, tras finalizar, durante los plazos legalmente exigibles para atender posibles responsabilidades.",
    },
    {
      title: "Reclamaciones",
      body: "Si consideras que no hemos tratado tus datos correctamente, puedes presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).",
    },
  ];

  return (
    <Layout
      seoTitle="Política de Privacidad | Aurellano P. Gastronómicos"
      seoDescription="Cómo tratamos tus datos personales: responsable, finalidad, legitimación, derechos y conservación."
    >
      <section className="relative overflow-hidden">
        <Circle variant="accent" className="w-72 h-72 -top-10 -right-20" />
        <div className="container-edit pt-12 md:pt-20 pb-12 max-w-4xl space-y-6 relative">
          <p className="eyebrow">{t("Política de Privacidad")}</p>
          <h1 className="display text-balance">
            {t("Cómo tratamos")}
            <br />
            <span className="italic font-light text-accent">{t("tus datos.")}</span>
          </h1>
        </div>
      </section>

      <section className="container-edit pb-20 md:pb-28 max-w-3xl space-y-8">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="font-display font-medium text-xl mb-2">{t(s.title)}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t(s.body)}</p>
          </div>
        ))}
      </section>

      <section className="container-edit pb-24 md:pb-32">
        <div className="rounded-3xl bg-primary text-primary-foreground p-10 md:p-14 text-center relative overflow-hidden">
          <Circle variant="outline" className="w-72 h-72 -top-20 -right-20 border-primary-foreground/10" />
          <div className="relative max-w-xl mx-auto space-y-5">
            <h2 className="display-md">{t("¿Más información?")}</h2>
            <p className="text-primary-foreground/70">
              {t("Estamos a tu disposición. Contáctanos por el canal que prefieras.")}
            </p>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-accent text-accent-foreground rounded-full pl-6 pr-7 py-4 font-medium"
            >
              <MessageCircle className="h-5 w-5" /> WhatsApp
            </a>
            <p className="text-primary-foreground/50 text-xs">{EMAIL}</p>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Privacidad;
