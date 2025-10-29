'use client';

import Link from 'next/link';
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  ColumnPriority,
  ColumnWithPriority,
  getMobileVisibleColumns,
  sortColumnsByPriority,
} from './ColumnVisibility';

export interface ResponsiveColumn<T> extends ColumnWithPriority {
  header: ReactNode;
  accessor?: keyof T;
  renderCell?: (row: T) => ReactNode;
  align?: 'start' | 'center' | 'end';
  minWidthClassName?: string;
  headerClassName?: string;
  cellClassName?: string;
  sticky?: boolean;
  mobileLabel?: ReactNode;
}

export interface RowAction<T> {
  id: string;
  label: string;
  onSelect?: (row: T) => void;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  disabled?: boolean;
}

export interface VirtualizedItem<T> {
  index: number;
  key: string;
  data: T;
  size?: number;
  start?: number;
}

export interface VirtualizerResult<T> {
  items: VirtualizedItem<T>[];
  paddingStart?: number;
  paddingEnd?: number;
  totalSize?: number;
}

export interface ResponsiveTableProps<T> {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  emptyState?: ReactNode;
  isLoading?: boolean;
  loadingRowCount?: number;
  renderCell?: (column: ResponsiveColumn<T>, row: T, index: number) => ReactNode;
  actions?: (row: T) => RowAction<T>[];
  virtualizer?: (rows: T[]) => VirtualizerResult<T>;
  mobileTitleColumnId?: string;
}

const defaultLoadingRowCount = 4;

export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  emptyState,
  isLoading = false,
  loadingRowCount = defaultLoadingRowCount,
  renderCell,
  actions,
  virtualizer,
  mobileTitleColumnId,
}: ResponsiveTableProps<T>) {
  const orderedColumns = useMemo(() => sortColumnsByPriority(columns), [columns]);
  const mobileColumns = useMemo(() => getMobileVisibleColumns(columns), [columns]);
  const hasActions = Boolean(actions);

  const dataSource = useMemo(() => {
    if (virtualizer) {
      const result = virtualizer(rows);
      if (result?.items?.length) return result;
    }
    return {
      items: rows.map((row, index) => ({
        index,
        key: rowKey(row, index),
        data: row,
      })),
      paddingStart: 0,
      paddingEnd: 0,
      totalSize: rows.length,
    };
  }, [rows, rowKey, virtualizer]);

  const renderCellContent = useCallback(
    (column: ResponsiveColumn<T>, row: T, index: number) => {
      if (column.renderCell) {
        return column.renderCell(row);
      }
      if (renderCell) {
        return renderCell(column, row, index);
      }
      if (column.accessor) {
        const value = row[column.accessor];
        return value as ReactNode;
      }
      return null;
    },
    [renderCell],
  );

  const renderDesktopTable = () => {
    if (isLoading) {
      return (
        <tbody>
          {Array.from({ length: loadingRowCount }).map((_, index) => (
            <tr key={`loading-${index}`} className="animate-pulse">
              {orderedColumns.map((column) => (
                <td
                  key={`${column.id}-skeleton`}
                  className={cn(
                    'h-16 min-w-[10rem] border-b border-default px-4 align-middle',
                    cellAlignment(column.align),
                  )}
                >
                  <div className="skeleton h-6 w-24 rounded-md" />
                </td>
              ))}
              {hasActions ? (
                <td className="h-16 min-w-[6rem] border-b border-default px-4 align-middle">
                  <div className="skeleton mx-auto h-8 w-8 rounded-full" />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      );
    }

    if (dataSource.items.length === 0) {
      return (
        <tbody>
          <tr>
            <td
              colSpan={orderedColumns.length + (hasActions ? 1 : 0)}
              className="px-6 py-12 text-center text-sm text-muted-foreground"
            >
              {emptyState ?? 'Nothing to display just yet.'}
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {dataSource.items.map(({ key, data, index }) => (
          <tr key={key} className="group">
            {orderedColumns.map((column, columnIndex) => (
              <td
                key={`${key}-${column.id}`}
                className={cn(
                  'border-b border-default px-4 py-4 align-middle text-sm text-foreground transition-colors group-hover:bg-background-muted/80',
                  column.minWidthClassName ?? 'min-w-[12rem]',
                  column.cellClassName,
                  cellAlignment(column.align),
                  column.sticky
                    ? 'sticky left-0 z-30 bg-background text-foreground shadow-[inset_-1px_0_0_rgba(148,163,184,0.18)]'
                    : null,
                  columnIndex === 0 && !column.sticky
                    ? 'md:sticky md:left-0 md:z-30 md:bg-background md:shadow-[inset_-1px_0_0_rgba(148,163,184,0.18)]'
                    : null,
                )}
              >
                {renderCellContent(column, data, index)}
              </td>
            ))}

            {hasActions ? (
              <td className="sticky right-0 z-30 min-w-[6rem] border-b border-default bg-background px-4 py-4 align-middle shadow-[inset_1px_0_0_rgba(148,163,184,0.18)]">
                <RowActionsMenu actions={actions?.(data) ?? []} row={data} />
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    );
  };

  const renderMobileCards = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-4">
          {Array.from({ length: loadingRowCount }).map((_, index) => (
            <article
              key={`loading-card-${index}`}
              className="rounded-2xl border border-default bg-background p-5 shadow-soft"
            >
              <div className="skeleton mb-4 h-6 w-32 rounded-md" />
              <div className="space-y-3">
                {mobileColumns.map((column) => (
                  <div key={`${column.id}-skeleton`} className="flex items-center justify-between gap-4">
                    <div className="skeleton h-4 w-20 rounded-sm" />
                    <div className="skeleton h-5 w-28 rounded-sm" />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      );
    }

    if (dataSource.items.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-default px-4 py-12 text-center text-sm text-muted-foreground">
          {emptyState ?? 'Nothing to display just yet.'}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {dataSource.items.map(({ key, data, index }) => {
          const titleColumn =
            mobileTitleColumnId != null
              ? columns.find((column) => column.id === mobileTitleColumnId)
              : mobileColumns[0];
          const titleContent = titleColumn ? renderCellContent(titleColumn, data, index) : null;

          return (
            <article
              key={key}
              className="rounded-2xl border border-default bg-background p-4 shadow-soft"
              data-container-name="datagrid-card"
            >
              <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-foreground">{titleContent}</div>
              </div>
                {hasActions ? <RowActionsMenu actions={actions?.(data) ?? []} row={data} /> : null}
              </div>

              <div className="mt-4 flex flex-col gap-3">
                {mobileColumns.map((column) => {
                  // Skip the title if we already surfaced it
                  if (titleColumn && column.id === titleColumn.id) {
                    return null;
                  }

                  const label = column.mobileLabel ?? column.header;

                  return (
                    <div
                      key={`${key}-${column.id}-card`}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-start gap-4 text-sm"
                    >
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {label}
                      </span>
                      <span className={cn('text-foreground', column.cellClassName)}>
                        {renderCellContent(column, data, index)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="table-container hidden rounded-2xl border border-default bg-background shadow-soft md:block">
        <table className="min-w-full table-fixed border-collapse">
          <thead className="bg-background-muted text-left">
            <tr>
              {orderedColumns.map((column, index) => (
                <th
                  key={column.id}
                  scope="col"
                  className={cn(
                    'border-b border-default px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground',
                    column.headerClassName,
                    column.minWidthClassName ?? 'min-w-[12rem]',
                    cellAlignment(column.align),
                    column.sticky
                      ? 'sticky left-0 z-40 bg-background text-foreground shadow-[inset_-1px_0_0_rgba(148,163,184,0.18)]'
                      : null,
                    index === 0 && !column.sticky
                      ? 'md:sticky md:left-0 md:z-40 md:bg-background md:shadow-[inset_-1px_0_0_rgba(148,163,184,0.18)]'
                      : null,
                  )}
                >
                  {column.header}
                </th>
              ))}
              {hasActions ? (
                <th className="sticky right-0 z-40 min-w-[6rem] border-b border-default bg-background px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground shadow-[inset_1px_0_0_rgba(148,163,184,0.18)]">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          {renderDesktopTable()}
        </table>
      </div>

      <div className="md:hidden">{renderMobileCards()}</div>
    </div>
  );
}

function cellAlignment(align: ResponsiveColumn<unknown>['align']) {
  switch (align) {
    case 'center':
      return 'text-center';
    case 'end':
      return 'text-right';
    default:
      return 'text-left';
  }
}

interface RowActionsMenuProps<T> {
  actions: RowAction<T>[];
  row: T;
}

function RowActionsMenu<T>({ actions, row }: RowActionsMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLUListElement | null>(null);

  const toggleMenu = () => {
    setOpen((previous) => !previous);
  };

  const closeMenu = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!open) return;
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    },
    [open],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    },
    [closeMenu, open],
  );

  useDocumentEvent('pointerdown', handlePointerDown);
  useDocumentEvent('keydown', handleKeyDown);

  useEffect(() => {
    if (!open || !actions?.length) return;
    const firstItem = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus({ preventScroll: true });
  }, [actions, open]);

  if (!actions || actions.length === 0) {
    return null;
  }

  const handleActionClick = (action: RowAction<T>, event: ReactMouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
    if (action.disabled) {
      event.preventDefault();
      return;
    }

    if (action.onSelect) {
      event.preventDefault();
      action.onSelect(row);
    }
    setOpen(false);
  };

  return (
    <div className="relative flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-default bg-background text-muted-foreground shadow-soft transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggleMenu}
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
        <span className="visually-hidden">Open actions</span>
      </button>

      {open ? (
        <ul
          ref={menuRef}
          role="menu"
          className="absolute right-0 top-full z-[90] mt-2 min-w-[9.5rem] space-y-1 rounded-lg border border-border/60 bg-surface p-2 shadow-[0_18px_48px_-20px_rgba(15,23,42,0.35)] ring-1 ring-black/5"
        >
          {actions.map((action) => {
            const Icon = action.icon;
            const content = (
              <span className="flex w-full items-center justify-between gap-3">
                <span>{action.label}</span>
                {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
              </span>
            );

            if (action.href) {
              return (
                <li key={action.id} role="none">
                  <Link
                    href={action.href}
                    className={cn(
                      'flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-background-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                      action.destructive ? 'text-danger hover:bg-red-50' : null,
                      action.disabled ? 'pointer-events-none opacity-60' : null,
                    )}
                    role="menuitem"
                    onClick={(event) => handleActionClick(action, event)}
                  >
                    {content}
                  </Link>
                </li>
              );
            }

            return (
              <li key={action.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={(event) => handleActionClick(action, event)}
                  className={cn(
                    'flex w-full items-center rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-background-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    action.destructive ? 'text-danger hover:bg-red-50' : null,
                    action.disabled ? 'cursor-not-allowed opacity-60' : null,
                  )}
                  disabled={action.disabled}
                >
                  {content}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function useDocumentEvent<K extends keyof DocumentEventMap>(event: K, handler: (event: DocumentEventMap[K]) => void) {
  const savedHandler = useRef(handler);

  savedHandler.current = handler;

  useEffect(() => {
    const listener = (event: DocumentEventMap[K]) => {
      savedHandler.current(event);
    };

    document.addEventListener(event, listener);
    return () => document.removeEventListener(event, listener);
  }, [event]);
}

export type { ColumnPriority };
