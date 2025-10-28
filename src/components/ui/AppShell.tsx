"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

type IconComponent = React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

const iconMap = {
  Home: Icons.Home,
  Calendar: Icons.Calendar,
  Users: Icons.Users,
  Wallet: Icons.Wallet,
  ListTodo: Icons.ListTodo,
  FileText: Icons.FileText,
  Newspaper: Icons.Newspaper,
  Settings: Icons.Settings,
} satisfies Record<string, IconComponent>;

export type IconKey = keyof typeof iconMap;

export type NavItem = {
  name: string;
  href: string;
  icon: IconKey;
};

export default function AppShell({
  nav,
  children,
  showSidebar = true,
}: {
  nav: NavItem[];
  children: ReactNode;
  showSidebar?: boolean;
}) {
  const pathname = usePathname();

  const renderNavItem = (item: NavItem, className: string) => {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = iconMap[item.icon] ?? Icons.Circle;

    return (
      <li key={item.href}>
        <Link
          href={item.href}
          className={`${className} ${active ? "bg-accent text-accent-foreground" : "hover:bg-muted"}`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className="truncate">{item.name}</span>
        </Link>
      </li>
    );
  };

  const hasSidebar = showSidebar && nav.length > 0;

  return (
    <div data-shell="admin-v1" className="min-h-dvh bg-background text-foreground">
      <div className={hasSidebar ? "grid md:grid-cols-[16rem_1fr]" : "block"}>
        {hasSidebar ? (
          <aside className="hidden border-r md:block">
            <div className="sticky top-0 flex h-dvh flex-col bg-surface-elevated/60">
              <div className="border-b border-border/60 px-4 py-6">
                <Link href="/" className="flex items-center transition hover:opacity-85">
                  <Image
                    src="/Cottagr-wordmark.png"
                    alt="Cottagr"
                    width={220}
                    height={96}
                    className="h-12 w-auto"
                    priority
                  />
                </Link>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-6">
                <ul className="space-y-1 list-none">
                  {nav.map((item) =>
                    renderNavItem(
                      item,
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition"
                    )
                  )}
                  <li className="pt-4">
                    <form action="/logout" method="post">
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:text-destructive"
                      >
                        <Icons.LogOut className="h-4 w-4" aria-hidden="true" />
                        Sign out
                      </button>
                    </form>
                  </li>
                </ul>
              </nav>
            </div>
          </aside>
        ) : null}

        <main className="min-w-0">
          <div className="mx-auto w-full max-w-screen-xl px-4 pb-20 sm:px-6 lg:px-8 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {nav.length > 0 ? (
        <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur md:hidden supports-[padding:max(0px)]:pb-[max(env(safe-area-inset-bottom),0px)]">
          <ul className="flex flex-nowrap overflow-x-auto list-none">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = iconMap[item.icon] ?? Icons.Circle;
              return (
                <li key={item.href} className="min-w-[5rem] flex-1">
                  <Link
                    href={item.href}
                    className={`flex flex-col items-center justify-center gap-1 py-2 text-xs transition ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              );
            })}
            <li className="min-w-[5rem] flex-1">
              <form action="/logout" method="post" className="flex h-full w-full">
                <button
                  type="submit"
                  className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition hover:text-destructive"
                >
                  <Icons.LogOut className="h-5 w-5" aria-hidden="true" />
                  <span className="truncate">Sign out</span>
                </button>
              </form>
            </li>
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
