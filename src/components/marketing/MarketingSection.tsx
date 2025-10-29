"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type MarketingSectionVariant = "default" | "muted" | "contrast";

interface MarketingSectionProps {
  id?: string;
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  variant?: MarketingSectionVariant;
  withDivider?: boolean;
}

const VARIANT_MAP: Record<MarketingSectionVariant, string> = {
  default: "bg-background text-foreground",
  muted: "bg-background-muted text-foreground",
  contrast: "bg-slate-950 text-white",
};

export default function MarketingSection({
  id,
  children,
  className,
  containerClassName,
  variant = "default",
  withDivider = true,
}: MarketingSectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "py-20",
        withDivider && "border-t border-border/40",
        VARIANT_MAP[variant],
        className,
      )}
    >
      <div className={cn("mx-auto w-full max-w-6xl px-6", containerClassName)}>{children}</div>
    </section>
  );
}
