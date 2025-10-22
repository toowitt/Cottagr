'use client';

import {
  HTMLAttributes,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
];

export interface DrawerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  labelledBy?: string;
  closeLabel?: string;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  labelledBy,
  closeLabel = 'Close navigation',
  className,
  children,
  ...props
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);
  const generatedId = useId();
  const lastFocusedElement = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const headingId = title ? labelledBy ?? generatedId : undefined;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    lastFocusedElement.current = document.activeElement as HTMLElement | null;

    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;

      const autoFocusEl = panel.querySelector<HTMLElement>('[data-autofocus="true"]');
      const focusable = getFocusable(panel);
      (autoFocusEl ?? focusable[0] ?? panel).focus();
    }, 20);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const handleClose = useCallback(() => {
    onClose();
    if (lastFocusedElement.current) {
      lastFocusedElement.current.focus({ preventScroll: true });
    }
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = getFocusable(panel);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (current === first || current === panel) {
          event.preventDefault();
          last.focus();
        }
      } else if (current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, open]);

  const overlayClasses = useMemo(
    () =>
      cn(
        'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200',
        open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
      ),
    [open],
  );

  const panelClasses = useMemo(
    () =>
      cn(
        'container-inline fixed inset-y-0 left-0 z-50 flex w-[min(90vw,20rem)] max-w-xs flex-col gap-6 overflow-y-auto bg-background text-foreground shadow-strong transition-transform duration-200 ease-out',
        open ? 'translate-x-0' : '-translate-x-full',
        className,
      ),
    [className, open],
  );

  if (!mounted) {
    return null;
  }

  return createPortal(
    <>
      <div
        ref={overlayRef}
        className={overlayClasses}
        aria-hidden="true"
        onClick={handleClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={headingId}
        className={panelClasses}
        {...props}
      >
        <div className="flex flex-col gap-4 border-b border-default px-5 pb-4 pt-6">
          <div className="flex items-center justify-between gap-4">
            {title ? (
              <div id={headingId} className="text-lg font-semibold tracking-tight">
                {title}
              </div>
            ) : null}
            <button
              type="button"
              className="touch-target rounded-full border border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background-muted focus-visible:ring-2"
              onClick={handleClose}
            >
              {closeLabel}
            </button>
          </div>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 px-5 py-4">{children}</div>
      </div>
    </>,
    document.body,
  );
}

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS.join(','))).filter(
    (node) => !node.hasAttribute('disabled') && !node.getAttribute('aria-hidden'),
  );
}

export default Drawer;
