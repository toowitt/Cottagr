'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Banknote,
  Calendar,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  Menu,
  MenuSquare,
  Newspaper,
  Settings as SettingsIcon,
  Users,
  X,
} from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Drawer } from '@/components/ui/Drawer';

const iconRegistry = {
  home: Home,
  bookings: CalendarDays,
  calendar: Calendar,
  menu: MenuSquare,
  owners: Users,
  expenses: Banknote,
  tasks: ClipboardCheck,
  checklist: ClipboardList,
  documents: FileText,
  blog: Newspaper,
  settings: SettingsIcon,
} as const;

type IconName = keyof typeof iconRegistry;

export interface AppNavItem {
  href: string;
  name: string;
  icon?: IconName;
  badge?: ReactNode;
  ariaLabel?: string;
}

export interface AppShellProps {
  title: ReactNode;
  navItems: AppNavItem[];
  bottomNavItems?: AppNavItem[];
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

export function AppShell({
  title,
  navItems,
  bottomNavItems,
  actions,
  children,
  className,
  footer,
}: AppShellProps) {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const primaryNav = useMemo(() => navItems ?? [], [navItems]);
  const mobileNav = bottomNavItems ?? primaryNav.slice(0, 4);

  return (
    <div className={cn('flex min-h-screen bg-background text-foreground', className)}>
      <nav
        className="hidden w-72 shrink-0 flex-col border-r border-default bg-background-muted px-5 py-6 md:flex lg:w-80"
        aria-label="Primary"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold tracking-tight text-foreground">{title}</div>
          {actions ? <div className="hidden lg:flex">{actions}</div> : null}
        </div>

        <div className="mt-6 flex flex-1 flex-col gap-1">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(pathname, item.href)}
              onNavigate={() => setIsDrawerOpen(false)}
            />
          ))}
        </div>
        {footer ? <div className="mt-auto pt-6">{footer}</div> : null}
      </nav>

      <Drawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={title}
        description="Use the menu to move between main sections. Press escape to close."
      >
        <div className="flex flex-col gap-2">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(pathname, item.href)}
              onNavigate={() => setIsDrawerOpen(false)}
            />
          ))}
        </div>
        {footer ? <div className="mt-auto pt-6 text-sm text-muted-foreground">{footer}</div> : null}
      </Drawer>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-default bg-background backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <button
              type="button"
              className="touch-target flex items-center gap-2 rounded-full border border-default bg-background px-4 py-2 text-sm font-semibold"
              onClick={() => setIsDrawerOpen((prev) => !prev)}
              aria-expanded={isDrawerOpen}
              aria-controls="mobile-navigation"
            >
              {isDrawerOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
              <span>Menu</span>
            </button>
            <div className="text-base font-semibold text-foreground">{title}</div>
            {actions ? <div className="flex items-center">{actions}</div> : <span aria-hidden className="w-10" />}
          </div>
        </header>

        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      <nav
        id="mobile-navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-default bg-background backdrop-blur md:hidden"
        aria-label="Bottom navigation"
      >
        {mobileNav.map((item) => {
          const IconComponent = item.icon ? iconRegistry[item.icon] : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'touch-target relative flex h-full flex-1 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                isActive(pathname, item.href) ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
              aria-label={item.ariaLabel ?? item.name}
            >
              {IconComponent ? <IconComponent className="h-5 w-5" aria-hidden /> : null}
              <span>{item.name}</span>
              {item.badge ? (
                <span className="absolute right-5 top-2 inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-accent-strong px-2 text-[10px] font-semibold text-background">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavLink({
  item,
  isActive,
  onNavigate,
}: {
  item: AppNavItem;
  isActive: boolean;
  onNavigate: () => void;
}) {
  const { href, name, icon, badge, ariaLabel } = item;
  const IconComponent = icon ? iconRegistry[icon] : null;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'touch-target group flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        isActive
          ? 'bg-background text-foreground shadow-soft'
          : 'text-muted-foreground hover:bg-background hover:text-foreground',
      )}
      aria-label={ariaLabel ?? name}
    >
      <span className="flex items-center gap-3">
        {IconComponent ? <IconComponent className="h-4 w-4 shrink-0" aria-hidden /> : null}
        <span>{name}</span>
      </span>
      {badge ? (
        <span className="inline-flex min-h-[1.25rem] min-w-[1.25rem] items-center justify-center rounded-full bg-accent-subtle px-2 text-[11px] font-semibold text-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default AppShell;
