"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import logoSrc from "@/assets/logo-aurellano.png";

interface LogoProps {
  variant?: "dark" | "light";
  className?: string;
}

export const Logo = ({ className }: LogoProps) => {
  return (
    <Link
      href="/"
      aria-label="Aurellano · Inicio"
      className={cn("inline-flex items-center group", className)}
    >
      <Image
        src={logoSrc}
        alt="Aurellano"
        width={56}
        height={56}
        priority
        className={cn(
          "h-12 w-12 md:h-14 md:w-14 object-contain transition-transform duration-500 group-hover:scale-105",
          className,
        )}
      />
    </Link>
  );
};
