import Link from 'next/link';
import { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Container } from './Container';

interface Breadcrumb {
  href?: string;
  label: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Breadcrumb[];
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  primaryAction,
  secondaryAction,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('border-b border-default bg-background-muted backdrop-blur', className)}>
      <Container
        padding="md"
        className="flex flex-col gap-5 py-6 sm:py-8 md:flex-row md:items-end md:justify-between lg:py-10"
      >
        <div className="flex flex-1 flex-col gap-4">
          {breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {breadcrumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                    {crumb.href ? (
                      <Link
                        href={crumb.href}
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-background-muted/60 hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">{crumb.label}</span>
                    )}
                    {index < breadcrumbs.length - 1 && (
                      <span aria-hidden="true" className="text-muted-foreground/50">
                        /
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="space-y-2">
            {typeof title === 'string' ? (
              <h1 className="text-foreground text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                {title}
              </h1>
            ) : (
              title
            )}

            {description && (
              <div className="max-w-content-sm text-pretty text-muted-foreground">{description}</div>
            )}
          </div>

          {children && (
            <div className="flex flex-col gap-3 md:hidden">
              {children}
            </div>
          )}
        </div>

        {(primaryAction || secondaryAction) && (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 md:justify-end">
            {secondaryAction}
            {primaryAction}
          </div>
        )}
      </Container>

      {children && (
        <div className="hidden border-t border-default bg-background-muted md:block">
          <Container padding="md" className="flex flex-wrap items-center gap-3 py-4">
            {children}
          </Container>
        </div>
      )}
    </header>
  );
}

export default PageHeader;
