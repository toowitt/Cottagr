import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';
import { createServerSupabaseClient, handleSupabaseAuthError } from '@/lib/supabase/server';
import SupportFooter from '@/components/SupportFooter';

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
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-background via-background-secondary to-background">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-default bg-card p-8 shadow-2xl">
          <h1 className="text-3xl font-semibold">Welcome to Cottagr</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to access your cottage dashboard or create a new owner profile to get started.
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
      <SupportFooter />
    </div>
  );
}
