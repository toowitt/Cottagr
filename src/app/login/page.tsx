import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: userData,
    error: authError,
  } = await supabase.auth.getUser();
  handleSupabaseAuthError(authError);
  const user = userData?.user ?? null;

  const params = await searchParams;
  const redirectPath = typeof params.redirect === 'string' ? params.redirect : undefined;
  const message = typeof params.message === 'string' ? params.message : undefined;

  if (user) {
    const target = redirectPath && redirectPath !== '/login' ? redirectPath : '/admin';
    redirect(target);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-8 px-6 py-16">
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
            Welcome back
          </div>
          <h1 className="text-pretty text-4xl font-semibold">Sign in to Cottagr</h1>
          <p className="text-sm text-muted-foreground">
            Your shared home for bookings, expenses, and every document that keeps the cottage running smoothly.
          </p>
        </div>

        <section className="rounded-3xl border border-default/60 bg-surface p-8 shadow-soft">
          {message === 'signed-out' ? (
            <div className="mb-6 rounded-xl border border-default/70 bg-background px-4 py-3 text-sm text-muted-foreground">
              You have been signed out.
            </div>
          ) : message === 'password-reset-success' ? (
            <div className="mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-200">
              Password updated. Sign in with your new credentials.
            </div>
          ) : null}

          <LoginForm redirectTo={redirectPath} />
        </section>
      </div>
    </div>
  );
}
