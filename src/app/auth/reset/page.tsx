import { redirect } from 'next/navigation';
import { APP_URL } from '@/lib/auth/config';
import ResetPasswordForm from './ResetPasswordForm';

export const metadata = {
  title: 'Set a new password · Cottagr',
};

type ResetPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const errorCode = Array.isArray(params.error_code) ? params.error_code[0] : params.error_code;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;

  if (error || errorCode) {
    const target = new URL('/forgot-password', APP_URL);
    target.searchParams.set('message', 'reset-expired');
    redirect(target.pathname + target.search);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-default bg-card p-8 shadow-2xl">
          <h1 className="text-3xl font-semibold">Choose a new password</h1>
          <p className="mt-2 text-sm text-muted">
            Enter a new password for your account. The reset link in your email is valid for a short time.
          </p>
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
