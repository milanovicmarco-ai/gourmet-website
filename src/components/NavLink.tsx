"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef, ComponentProps } from "react";
import { cn } from "@/lib/utils";

type NextLinkProps = ComponentProps<typeof Link>;

interface NavLinkProps extends Omit<NextLinkProps, "className"> {
  className?: string;
  activeClassName?: string;
  /** Match exactly (true for "/", false otherwise by default). */
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, activeClassName, href, end, ...props }, ref) => {
    const pathname = usePathname();
    const target = typeof href === "string" ? href.split("?")[0] : "";
    const isActive = end || target === "/" ? pathname === target : pathname.startsWith(target);
    return (
      <Link
        ref={ref as never}
        href={href}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
