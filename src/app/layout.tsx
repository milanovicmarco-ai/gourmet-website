import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
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
    images: [{ url: "/og/aurellano-cover.jpg", width: 1200, height: 630, alt: BRAND.es.name }],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: BRAND.es.description,
    images: ["/og/aurellano-cover.jpg"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
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
  logo: `${SITE_URL}/og/aurellano-cover.jpg`,
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
  image: `${SITE_URL}/og/aurellano-cover.jpg`,
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
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
