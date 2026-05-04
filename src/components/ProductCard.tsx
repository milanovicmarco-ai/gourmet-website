import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  image: string;
  title: string;
  category: string;
  origin?: string;
  href?: string;
  circle?: boolean;
  className?: string;
}

export const ProductCard = ({ image, title, category, origin, href = "#", circle = false, className }: ProductCardProps) => {
  const Wrapper: any = href.startsWith("/") ? Link : "a";
  const wrapperProps = href.startsWith("/") ? { to: href } : { href };

  return (
    <Wrapper {...wrapperProps} className={cn("group block hover-lift", className)}>
      <div className={cn(
        "relative overflow-hidden bg-secondary",
        circle ? "aspect-square rounded-full" : "aspect-[4/5] rounded-2xl"
      )}>
        <img
          src={image}
          alt={title}
          loading="lazy"
          width={800}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="absolute top-4 right-4 h-9 w-9 rounded-full bg-background/95 backdrop-blur grid place-items-center opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{category}</p>
          <h3 className="font-display font-medium text-lg leading-tight">{title}</h3>
          {origin && <p className="text-sm text-muted-foreground mt-1">{origin}</p>}
        </div>
      </div>
    </Wrapper>
  );
};
