import './globals.css';
import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
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
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession();
  handleSupabaseAuthError(sessionError);
  const session = sessionData?.session ?? null;

  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(userError);
  const user = userData?.user ?? null;

  if (user) {
    await ensureUserRecord(user);
  }

  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased">
        <SupabaseProvider initialSession={session}>
          <SiteHeader initialAuthenticated={Boolean(user)} />
          <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        </SupabaseProvider>
      </body>
    </html>
  );
}
