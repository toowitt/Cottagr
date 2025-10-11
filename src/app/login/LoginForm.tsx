'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type LoginFormProps = {
  redirectTo?: string;
};

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const retryCountRef = useRef(0);

  useEffect(() => {
    if (cooldownMs <= 0) {
      setError((current) =>
        current && current.startsWith('Too many attempts.') ? null : current,
      );
      return undefined;
    }

    setError((current) =>
      !current || current.startsWith('Too many attempts.') ? getCooldownMessage() : current,
    );

    const intervalId = window.setInterval(() => {
      setCooldownMs((remaining) => (remaining <= 1000 ? 0 : remaining - 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownMs]);

  const resetCooldown = () => {
    retryCountRef.current = 0;
    setCooldownMs(0);
  };

  const applyCooldown = (severity: 'soft' | 'hard') => {
    retryCountRef.current = Math.min(retryCountRef.current + 1, 6);
    const baseDelay = severity === 'hard' ? 4000 : 2000;
    const exponential = baseDelay * Math.pow(2, retryCountRef.current - 1);
    const jitter = Math.round(Math.random() * 500);
    const nextDelay = Math.min(exponential + jitter, 60000);
    setCooldownMs(nextDelay);
  };

  const getCooldownMessage = () => {
    if (cooldownMs <= 0) {
      return null;
    }
    const seconds = Math.ceil(cooldownMs / 1000);
    return `Too many attempts. Please wait ${seconds}s before trying again.`;
  };

  const handlePasswordLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cooldownMs > 0) {
      setError(getCooldownMessage());
      return;
    }

    setError(null);

    startTransition(async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const status = 'status' in signInError ? signInError.status : undefined;
        if (status === 429) {
          applyCooldown('hard');
          setError(getCooldownMessage());
        } else {
          applyCooldown('soft');
          setError(signInError.message);
        }
        return;
      }

      resetCooldown();
      router.replace(redirectTo && redirectTo !== '/login' ? redirectTo : '/admin');
    });
  };

  const handleMagicLink = async () => {
    if (cooldownMs > 0) {
      setError(getCooldownMessage());
      return;
    }

    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({ email });
    if (otpError) {
      const status = 'status' in otpError ? otpError.status : undefined;
      if (status === 429) {
        applyCooldown('hard');
        setError(getCooldownMessage());
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
    <form className="mt-6 space-y-5" onSubmit={handlePasswordLogin}>
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

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="••••••••"
        />
      </div>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <button
        type="submit"
        disabled={isPending || cooldownMs > 0}
        className="w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600"
      >
        {cooldownMs > 0 ? `Try again in ${Math.ceil(cooldownMs / 1000)}s` : isPending ? 'Signing in…' : 'Sign in'}
      </button>

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
    </form>
  );
}
