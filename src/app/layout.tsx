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

const SITE_URL = "https://aurellano.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Aurellano Productos Gastronómicos · Distribución gourmet",
    template: "%s | Aurellano Productos Gastronómicos",
  },
  description:
    "Distribuidor gourmet con +200 proveedores y +10.000 referencias para HORECA y tiendas. Servicio en toda Cataluña y Andorra. Pedidos por WhatsApp.",
  authors: [{ name: "Aurellano Productos Gastronómicos" }],
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
    siteName: "Aurellano Productos Gastronómicos",
    locale: "es_ES",
    alternateLocale: ["ca_ES"],
    url: SITE_URL,
    title: "Aurellano Productos Gastronómicos · Distribución gourmet",
    description:
      "Distribuidor gourmet con +200 proveedores y +10.000 referencias para HORECA y tiendas. Servicio en toda Cataluña y Andorra.",
    images: [{ url: "/og/aurellano-cover.jpg", width: 1200, height: 630, alt: "Aurellano Productos Gastronómicos" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aurellano Productos Gastronómicos · Distribución gourmet",
    description:
      "Distribuidor gourmet con +200 proveedores y +10.000 referencias para HORECA y tiendas. Servicio en toda Cataluña y Andorra.",
    images: ["/og/aurellano-cover.jpg"],
  },
  icons: { icon: "/favicon.ico" },
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
  name: "Aurellano Productos Gastronómicos",
  alternateName: "Aurellano",
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
  name: "Aurellano Productos Gastronómicos",
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
