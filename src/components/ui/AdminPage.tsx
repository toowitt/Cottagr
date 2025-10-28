'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface AdminPageProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AdminPage({ title, description, actions, children, className }: AdminPageProps) {
  return (
    <div className={cn('space-y-8 py-8 md:py-10', className)}>
      <header className="flex flex-col gap-3 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>

      <div className="space-y-6">{children}</div>
    </div>
  );
}

interface AdminCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function AdminCard({ title, description, children, className, footer }: AdminCardProps) {
  return (
    <section className={cn('rounded-3xl border border-border/60 bg-surface p-6 shadow-soft', className)}>
      {(title || description) && (
        <header className="mb-4 space-y-1">
          {title ? <h2 className="text-lg font-semibold text-foreground">{title}</h2> : null}
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </header>
      )}
      <div className="space-y-4">{children}</div>
      {footer ? <footer className="mt-4 border-t border-border/50 pt-4 text-sm text-muted-foreground">{footer}</footer> : null}
    </section>
  );
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
    <div className={cn('grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]', className)}>
      {primary}
      {secondary}
    </div>
  );
}
