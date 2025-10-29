"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Breadcrumb = {
  label: string;
  href?: string;
};

interface AdminPageProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AdminPage({
  title,
  description,
  actions,
  breadcrumbs,
  children,
  className,
  contentClassName,
}: AdminPageProps) {
  return (
    <div className={cn("space-y-8", className)}>
      <header className="space-y-4">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.label} className="flex items-center gap-2">
                {crumb.href ? (
                  <Link
                    href={crumb.href}
                    className="rounded-md px-2 py-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="rounded-md bg-muted/60 px-2 py-1 text-foreground">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 ? <span aria-hidden="true">/</span> : null}
              </span>
            ))}
          </nav>
        ) : null}

        <div className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </header>

      <div className={cn("space-y-6", contentClassName)}>{children}</div>
    </div>
  );
}

interface AdminSectionProps {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  subdued?: boolean;
}

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
  footer,
  subdued = false,
}: AdminSectionProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border/60 p-6 shadow-soft",
        subdued ? "bg-background" : "bg-surface",
        className
      )}
    >
      {(title || description || actions) && (
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            {title ? <h2 className="text-lg font-semibold text-foreground">{title}</h2> : null}
            {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className="space-y-4">{children}</div>
      {footer ? <footer className="mt-6 border-t border-border/40 pt-4 text-sm text-muted-foreground">{footer}</footer> : null}
    </section>
  );
}

interface AdminCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
  muted?: boolean;
}

export function AdminCard({ title, description, children, className, footer, muted = false }: AdminCardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/50 p-6 shadow-soft",
        muted ? "bg-background" : "bg-surface-elevated",
        className
      )}
    >
      {(title || description) && (
        <header className="mb-4 space-y-1">
          {title ? <h3 className="text-base font-semibold text-foreground">{title}</h3> : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </header>
      )}
      <div className="space-y-3">{children}</div>
      {footer ? <footer className="mt-4 border-t border-border/40 pt-4 text-xs text-muted-foreground">{footer}</footer> : null}
    </div>
  );
}

interface AdminMetricProps {
  label: string;
  value: ReactNode;
  description?: string;
  trend?: ReactNode;
  className?: string;
}

export function AdminMetric({ label, value, description, trend, className }: AdminMetricProps) {
  return (
    <div className={cn("rounded-2xl border border-border/50 bg-surface-elevated/80 p-4 shadow-soft", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-xl font-semibold text-foreground">{value}</span>
        {trend ? <span className="text-xs text-muted-foreground">{trend}</span> : null}
      </div>
      {description ? <p className="mt-2 text-xs text-muted-foreground/80">{description}</p> : null}
    </div>
  );
}

export function AdminMetricGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>{children}</div>;
}

export function AdminSplit({
  primary,
  secondary,
  className,
}: {
  primary: ReactNode;
  secondary: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]", className)}>
      {primary}
      {secondary}
    </div>
  );
}

export function AdminTableContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-border/60 bg-background px-4 py-4 shadow-soft", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}
