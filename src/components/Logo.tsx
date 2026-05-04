import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import logoSrc from "@/assets/logo-aurellano.png";

interface LogoProps {
  variant?: "dark" | "light";
  className?: string;
}

export const Logo = ({ variant = "dark", className }: LogoProps) => {
  return (
    <Link to="/" aria-label="Aurellano · Inicio" className={cn("inline-flex items-center group", className)}>
      <img
        src={logoSrc}
        alt="Aurellano"
        className={cn(
          "h-12 w-12 md:h-14 md:w-14 object-contain transition-transform duration-500 group-hover:scale-105",
          className
        )}
      />
    </Link>
  );
};
