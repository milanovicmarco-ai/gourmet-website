import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Imágenes alojadas en Cloudinary (catálogo en producción)
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Supabase Storage (legacy, se puede quitar cuando no quede ningún uso)
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    serverActions: {
      // Las fotos del catálogo pueden pasar de 1 MB (default), especialmente los
      // PNGs transparentes. El backend (Cloudinary) admite hasta 10 MB, así que
      // alineamos el límite del frontend.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
