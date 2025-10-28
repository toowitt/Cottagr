import { Suspense } from 'react';
import ForgotPasswordForm from './ForgotPasswordForm';

export const metadata = {
  title: 'Forgot password · Cottagr',
};

type ForgotPasswordPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const buildAlert = (message: string | undefined) => {
  switch (message) {
    case 'reset-expired':
      return {
        tone: 'danger' as const,
        text: 'That reset link expired. Request a new email to continue.',
      };
    case 'reset-success':
      return {
        tone: 'success' as const,
        text: 'Check your inbox for a password reset link.',
      };
    default:
      return null;
  }
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const params = await searchParams;
  const message = Array.isArray(params.message) ? params.message[0] : params.message;
  const alert = buildAlert(message);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background-secondary to-background">
      <div className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-12">
        <div className="rounded-3xl border border-default bg-card p-8 shadow-2xl">
          <h1 className="text-3xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-sm text-muted">
            Enter the email associated with your account. We&apos;ll send a secure link so you can create a new password.
          </p>

          {alert ? (
            <div
              className={
                alert.tone === 'danger'
                  ? 'mt-4 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger'
                  : 'mt-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200'
              }
            >
              {alert.text}
            </div>
          ) : null}

          <Suspense fallback={<p className="mt-6 text-sm text-muted">Loading form…</p>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
