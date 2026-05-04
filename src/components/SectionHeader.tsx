import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

export const SectionHeader = ({ eyebrow, title, subtitle, align = "left", className }: SectionHeaderProps) => (
  <div className={cn("max-w-3xl space-y-4", align === "center" && "mx-auto text-center", className)}>
    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
    <h2 className="display-md text-balance">{title}</h2>
    {subtitle && <p className="text-base md:text-lg text-muted-foreground text-pretty leading-relaxed max-w-2xl">{subtitle}</p>}
  </div>
);
