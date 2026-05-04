import { cn } from "@/lib/utils";

/** Decorative circle — design system primitive */
export const Circle = ({
  className,
  variant = "outline",
}: {
  className?: string;
  variant?: "outline" | "fill" | "accent" | "blur";
}) => {
  const styles = {
    outline: "border border-foreground/10",
    fill: "bg-secondary",
    accent: "bg-accent/10 border border-accent/20",
    blur: "bg-accent/20 blur-3xl",
  } as const;
  return <div aria-hidden className={cn("absolute rounded-full pointer-events-none", styles[variant], className)} />;
};
