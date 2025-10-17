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
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-default bg-card p-8 shadow-2xl">
          <h1 className="text-3xl font-semibold">Welcome to Cottagr</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to access your cottage dashboard or create a new owner profile to get started.
          </p>

          {message === 'signed-out' ? (
            <div className="mt-4 rounded-lg border border-default bg-card px-4 py-3 text-sm text-muted-foreground">
              You have been signed out.
            </div>
          ) : null}

          <LoginForm redirectTo={redirectPath} />
        </div>
      </div>
    </div>
  );
}
