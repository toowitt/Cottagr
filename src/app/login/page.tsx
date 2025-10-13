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
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-black/40">
          <h1 className="text-3xl font-semibold">Welcome to Cottagr</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign in to access your cottage dashboard or create a new owner profile to get started.
          </p>

          {message === 'signed-out' ? (
            <div className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
              You have been signed out.
            </div>
          ) : null}

          <LoginForm redirectTo={redirectPath} />
        </div>
      </div>
    </div>
  );
}
