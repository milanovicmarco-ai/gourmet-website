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
  },
};

export default nextConfig;
