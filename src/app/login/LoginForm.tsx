'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type LoginFormProps = {
  redirectTo?: string;
};

type AuthMode = 'sign-in' | 'sign-up';

const MIN_PASSWORD_LENGTH = 6;
const SIGN_IN_FALLBACK_REDIRECT = '/admin';
const SIGN_UP_FALLBACK_REDIRECT = '/admin/setup';
const EMAIL_REDIRECT_OVERRIDE = process.env.NEXT_PUBLIC_SUPABASE_EMAIL_REDIRECT_TO;

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);
  const retryCountRef = useRef(0);

  const cooldownMessage = useMemo(() => {
    if (cooldownMs <= 0) {
      return null;
    }
    const seconds = Math.ceil(cooldownMs / 1000);
    return `Too many attempts. Please wait ${seconds}s before trying again.`;
  }, [cooldownMs]);

  useEffect(() => {
    if (cooldownMs <= 0) {
      setError((current) =>
        current && current.startsWith('Too many attempts.') ? null : current,
      );
      return undefined;
    }

    setError((current) =>
      !current || current.startsWith('Too many attempts.') ? cooldownMessage : current,
    );

    const intervalId = window.setInterval(() => {
      setCooldownMs((remaining) => (remaining <= 1000 ? 0 : remaining - 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownMessage, cooldownMs]);

  const resetCooldown = () => {
    retryCountRef.current = 0;
    setCooldownMs(0);
  };

  const buildRedirectTarget = (fallback: string, options?: { ignoreQuery?: boolean }) => {
    if (options?.ignoreQuery || !redirectTo || redirectTo === '/login') {
      return fallback;
    }
    return redirectTo;
  };

  const applyCooldown = (severity: 'soft' | 'hard') => {
    retryCountRef.current = Math.min(retryCountRef.current + 1, 6);
    const baseDelay = severity === 'hard' ? 4000 : 2000;
    const exponential = baseDelay * Math.pow(2, retryCountRef.current - 1);
    const jitter = Math.round(Math.random() * 500);
    const nextDelay = Math.min(exponential + jitter, 60000);
    setCooldownMs(nextDelay);
  };

  const handleModeChange = (nextMode: AuthMode) => {
    if (nextMode === mode) {
      return;
    }
    setMode(nextMode);
    setError(null);
    setStatusMessage(null);
    setMagicLinkSent(false);
    resetCooldown();
  };

  const handleAuthSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cooldownMs > 0) {
      setError(cooldownMessage);
      return;
    }

    setError(null);
    setStatusMessage(null);

    startTransition(async () => {
      const trimmedEmail = email.trim();
      if (!trimmedEmail) {
        setError('Email is required');
        return;
      }

      if (mode === 'sign-up') {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setError('Name is required');
          return;
        }
        if (password.length < MIN_PASSWORD_LENGTH) {
          setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
          return;
        }
        const redirectTarget = buildRedirectTarget(SIGN_UP_FALLBACK_REDIRECT, { ignoreQuery: true });
        const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
        const emailRedirectTo = EMAIL_REDIRECT_OVERRIDE ?? (origin ? `${origin}${redirectTarget}` : undefined);

        const {
          data,
          error: signUpError,
        } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: trimmedName,
            },
            emailRedirectTo,
          },
        });

        if (signUpError) {
          const status = 'status' in signUpError ? signUpError.status : undefined;
          if (status === 429) {
            applyCooldown('hard');
            setError(cooldownMessage);
          } else {
            applyCooldown('soft');
            setError(signUpError.message);
          }
          return;
        }

        if (data?.user && data.session) {
          const accessToken = data.session.access_token;
          try {
            const response = await fetch('/api/auth/ensure-user', {
              method: 'POST',
              headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
            });
            if (!response.ok) {
              console.warn('ensure-user endpoint responded with', response.status);
            }
          } catch (ensureError) {
            console.warn('Failed to ensure local user record', ensureError);
          }
        }

        resetCooldown();

        if (data?.session) {
          router.replace(redirectTarget);
          return;
        }

        setStatusMessage(
          `Check ${trimmedEmail} to confirm your account. Once verified, we'll finish setting things up.`,
        );
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      if (signInError) {
        const status = 'status' in signInError ? signInError.status : undefined;
        if (status === 429) {
          applyCooldown('hard');
          setError(cooldownMessage);
        } else {
          applyCooldown('soft');
          setError(signInError.message);
        }
        return;
      }

      resetCooldown();
      router.replace(buildRedirectTarget(SIGN_IN_FALLBACK_REDIRECT));
    });
  };

  const handleMagicLink = async () => {
    if (cooldownMs > 0) {
      setError(cooldownMessage);
      return;
    }

    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required');
      return;
    }
    const { error: otpError } = await supabase.auth.signInWithOtp({ email: trimmedEmail });
    if (otpError) {
      const status = 'status' in otpError ? otpError.status : undefined;
      if (status === 429) {
        applyCooldown('hard');
        setError(cooldownMessage);
      } else {
        applyCooldown('soft');
        setError(otpError.message);
      }
      return;
    }
    resetCooldown();
    setMagicLinkSent(true);
  };

  return (
    <form className="mt-6 space-y-6" onSubmit={handleAuthSubmit}>
      <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 p-1 text-xs font-medium text-slate-300">
        <button
          type="button"
          onClick={() => handleModeChange('sign-in')}
          className={`w-full rounded-lg px-3 py-2 transition ${
            mode === 'sign-in' ? 'bg-emerald-500 text-black shadow-inner shadow-emerald-500/40' : 'hover:text-slate-100'
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('sign-up')}
          className={`w-full rounded-lg px-3 py-2 transition ${
            mode === 'sign-up' ? 'bg-emerald-500 text-black shadow-inner shadow-emerald-500/40' : 'hover:text-slate-100'
          }`}
        >
          Sign up
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-200">
          {mode === 'sign-in' ? 'Use your email and password or request a magic link.' : 'Create your owner account.'}
        </p>
        <p className="text-xs text-slate-400">
          {mode === 'sign-in'
            ? 'Forgot your password? Use the magic link below to get back in.'
            : 'We will send a confirmation email before finishing setup.'}
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="you@example.com"
        />
      </div>

      {mode === 'sign-up' ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-300" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            required={mode === 'sign-up'}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Ada Lovelace"
            autoComplete="name"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300" htmlFor="password">
          {mode === 'sign-up' ? 'Create a password' : 'Password'}
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder={mode === 'sign-up' ? 'At least 6 characters' : '••••••••'}
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
        />
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {statusMessage ? <p className="text-sm text-emerald-300">{statusMessage}</p> : null}

      <button
        type="submit"
        disabled={isPending || cooldownMs > 0}
        className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600"
      >
        {cooldownMs > 0
          ? `Try again in ${Math.ceil(cooldownMs / 1000)}s`
          : isPending
            ? mode === 'sign-up'
              ? 'Creating account…'
              : 'Signing in…'
            : mode === 'sign-up'
              ? 'Create account'
              : 'Sign in'}
      </button>

      {mode === 'sign-in' ? (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
          <p className="text-xs text-slate-400">Prefer a magic link?</p>
          {magicLinkSent ? (
            <p className="text-xs text-emerald-300">Magic link sent! Check your inbox.</p>
          ) : (
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={cooldownMs > 0}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-emerald-400"
            >
              {cooldownMs > 0 ? `Wait ${Math.ceil(cooldownMs / 1000)}s` : 'Email me a login link'}
            </button>
          )}
        </div>
      ) : null}
    </form>
  );
}
