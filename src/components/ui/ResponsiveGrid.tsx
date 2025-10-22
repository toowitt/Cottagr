import { ElementType, HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Breakpoint = 'base' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

type ResponsiveGridColumns = Partial<Record<Breakpoint, 1 | 2 | 3 | 4 | 5 | 6>>;

type GridGap = 'none' | 'sm' | 'md' | 'lg';

export interface ResponsiveGridProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  columns?: ResponsiveGridColumns;
  gap?: GridGap;
  rowGap?: GridGap;
  withContainerQueries?: boolean;
}

const breakpointOrder: Breakpoint[] = ['base', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'];

const gapClassnames: Record<GridGap, string> = {
  none: 'gap-0',
  sm: 'gap-3 md:gap-4',
  md: 'gap-4 md:gap-6 lg:gap-8',
  lg: 'gap-6 md:gap-8 lg:gap-12',
};

const rowGapClassnames: Record<GridGap, string> = {
  none: 'gap-y-0',
  sm: 'gap-y-3 md:gap-y-4',
  md: 'gap-y-4 md:gap-y-6 lg:gap-y-8',
  lg: 'gap-y-6 md:gap-y-8 lg:gap-y-12',
};

function resolveColumns(columns?: ResponsiveGridColumns) {
  if (!columns) return 'grid-cols-1 md:grid-cols-2';

  return breakpointOrder
    .filter((breakpoint) => columns[breakpoint] !== undefined)
    .map((breakpoint) => {
      const value = columns[breakpoint];
      if (!value) return null;

      const baseClass = `grid-cols-${value}`;
      return breakpoint === 'base' ? baseClass : `${breakpoint}:${baseClass}`;
    })
    .filter(Boolean)
    .join(' ');
}

export function ResponsiveGrid({
  as: Component = 'div',
  columns,
  gap = 'md',
  rowGap,
  withContainerQueries = true,
  className,
  children,
  ...props
}: ResponsiveGridProps) {
  const columnClasses = resolveColumns(columns);

  return (
    <Component
      className={cn(
        'grid items-start',
        withContainerQueries && 'container-inline',
        columnClasses,
        gapClassnames[gap],
        rowGap ? rowGapClassnames[rowGap] : null,
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export default ResponsiveGrid;
