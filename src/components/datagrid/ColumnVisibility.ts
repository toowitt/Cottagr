export type ColumnPriority = 'high' | 'medium' | 'low';

const PRIORITY_WEIGHT: Record<ColumnPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export interface ColumnWithPriority {
  id: string;
  priority?: ColumnPriority;
}

export function sortColumnsByPriority<T extends ColumnWithPriority>(columns: T[]): T[] {
  return [...columns].sort((a, b) => {
    const first = PRIORITY_WEIGHT[a.priority ?? 'medium'];
    const second = PRIORITY_WEIGHT[b.priority ?? 'medium'];
    if (first === second) return 0;
    return first < second ? -1 : 1;
  });
}

export function getMobileVisibleColumns<T extends ColumnWithPriority>(columns: T[]): T[] {
  return sortColumnsByPriority(columns).filter(
    (column) => (column.priority ?? 'medium') !== 'low',
  );
}

export function isColumnVisibleAtBreakpoint(
  column: ColumnWithPriority,
  breakpoint: 'mobile' | 'desktop',
): boolean {
  if (breakpoint === 'desktop') return true;
  return (column.priority ?? 'medium') !== 'low';
}
