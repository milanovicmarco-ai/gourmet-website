import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { CookieBanner } from "@/components/consent/CookieBanner";
import {
  ADDRESS_STREET,
  ADDRESS_CITY,
  ADDRESS_POSTAL,
  ADDRESS_REGION,
  ADDRESS_COUNTRY,
  EMAIL,
  PHONE_FIXED,
  WHATSAPP_DISPLAY,
  INSTAGRAM,
  GOOGLE_BUSINESS_URL,
} from "@/lib/contact";
import { BRAND, SEO_TITLE_TEMPLATE } from "@/lib/brand";

const SITE_URL = "https://aurellano.com";
const DEFAULT_TITLE = `${BRAND.es.name} · ${BRAND.es.claim} ${BRAND.es.claimSub}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: SEO_TITLE_TEMPLATE,
  },
  description: BRAND.es.description,
  authors: [{ name: BRAND.es.name }],
  alternates: {
    canonical: "/",
    languages: {
      "es-ES": "/",
      "ca-ES": "/",
      "x-default": "/",
    },
  },
  openGraph: {
    type: "website",
    siteName: BRAND.es.name,
    locale: "es_ES",
    alternateLocale: ["ca_ES"],
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: BRAND.es.description,
    images: [{ url: "/images/Restaurant_productes_gastronomics_aurellano.jpg", width: 1200, height: 630, alt: BRAND.es.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: BRAND.es.description,
    images: ["/images/Restaurant_productes_gastronomics_aurellano.jpg"],
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/favicon.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#fa2ca2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: BRAND.es.name,
  alternateName: BRAND.es.short,
  slogan: `${BRAND.es.claim} ${BRAND.es.claimSub}`,
  description: BRAND.es.description,
  url: SITE_URL,
  logo: `${SITE_URL}/images/Restaurant_productes_gastronomics_aurellano.jpg`,
  email: EMAIL,
  telephone: WHATSAPP_DISPLAY,
  sameAs: [INSTAGRAM, GOOGLE_BUSINESS_URL],
  address: {
    "@type": "PostalAddress",
    streetAddress: ADDRESS_STREET,
    addressLocality: ADDRESS_CITY,
    postalCode: ADDRESS_POSTAL,
    addressRegion: ADDRESS_REGION,
    addressCountry: ADDRESS_COUNTRY,
  },
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "FoodEstablishment",
  name: BRAND.es.name,
  url: SITE_URL,
  image: `${SITE_URL}/images/Restaurant_productes_gastronomics_aurellano.jpg`,
  telephone: PHONE_FIXED,
  email: EMAIL,
  hasMap: GOOGLE_BUSINESS_URL,
  priceRange: "€€-€€€",
  address: {
    "@type": "PostalAddress",
    streetAddress: ADDRESS_STREET,
    addressLocality: ADDRESS_CITY,
    postalCode: ADDRESS_POSTAL,
    addressRegion: ADDRESS_REGION,
    addressCountry: ADDRESS_COUNTRY,
  },
  areaServed: [
    { "@type": "AdministrativeArea", name: "Catalunya" },
    { "@type": "AdministrativeArea", name: "Andorra" },
    { "@type": "AdministrativeArea", name: "España" },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "08:00",
      closes: "18:00",
    },
  ],
};

// Solo lectura de env var (estático, no fuerza render dinámico). La lectura de
// la cookie de consentimiento se hace en el cliente (ver ConsentProvider) para
// no perder el prerenderizado estático/ISR del resto del sitio: usar
// `cookies()` de next/headers en el layout raíz convertiría TODAS las rutas
// en dinámicas (server-rendered on demand), incluido el catálogo con ISR.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        {/* Google Consent Mode v2: todo denegado por defecto hasta que el
            cliente confirme (cookie ya guardada o decisión en el banner). */}
        <script
          id="consent-default"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){ window.dataLayer.push(arguments); }
              gtag('consent', 'default', {
                analytics_storage: 'denied',
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                wait_for_update: 500
              });
              window.gtag = gtag;
            `,
          }}
        />
      </head>
      <body>
        <ConsentProvider gtmId={GTM_ID}>
          <Providers>
            {children}
            <CookieBanner />
          </Providers>
        </ConsentProvider>
      </body>
    </html>
  );
}
