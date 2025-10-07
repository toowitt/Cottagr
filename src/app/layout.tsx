import './globals.css';
import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import { ThemeProvider } from '@/components/ThemeProvider';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ensureUserRecord } from '@/lib/auth/ensureUser';
import SupabaseProvider from '@/components/SupabaseProvider';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Cottagr',
  description: 'Shared cottage management made simple.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureUserRecord(user);
  }

  return (
    <html lang="en" className="h-full theme-light light" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground antialiased transition-colors">
        <ThemeProvider>
          <SupabaseProvider initialSession={session}>
            <SiteHeader initialAuthenticated={Boolean(user)} />
            <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
          </SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
