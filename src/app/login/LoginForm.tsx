'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/forms';
import { Input } from '@/components/ui';
import Link from 'next/link';
import { AUTH_REDIRECT_URL, APP_URL, EMAIL_REDIRECT_BASE } from '@/lib/auth/config';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/cn';

type LoginFormProps = {
  redirectTo?: string;
};

type AuthMode = 'sign-in' | 'sign-up';

const MIN_PASSWORD_LENGTH = 8;
const SIGN_IN_FALLBACK_REDIRECT = '/admin';
const SIGN_UP_FALLBACK_REDIRECT = '/admin/setup';
const formSchema = z
  .object({
    mode: z.enum(['sign-in', 'sign-up']),
    email: z
      .string()
      .min(1, 'Email is required.')
      .email('Enter a valid email address.'),
    password: z.string().min(1, 'Password is required.'),
    name: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.mode === 'sign-up') {
      if (!value.name?.trim()) {
        ctx.addIssue({
          path: ['name'],
          code: z.ZodIssueCode.custom,
          message: 'Name is required.',
        });
      }
      if (value.password.length < MIN_PASSWORD_LENGTH) {
        ctx.addIssue({
          path: ['password'],
          code: z.ZodIssueCode.custom,
          message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
        });
      }
    }
  });

type LoginFormValues = z.infer<typeof formSchema>;

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNavigating, startNavigation] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [cooldownMs, setCooldownMs] = useState(0);
  const retryCountRef = useRef(0);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      mode: 'sign-in',
      email: '',
      password: '',
      name: '',
    },
  });

  const mode = form.watch('mode') as AuthMode;
  const rootError = form.formState.errors.root?.message;

  const cooldownMessage = useMemo(() => {
    if (cooldownMs <= 0) {
      return null;
    }
    const seconds = Math.ceil(cooldownMs / 1000);
    return `Too many attempts. Please wait ${seconds}s before trying again.`;
  }, [cooldownMs]);

  useEffect(() => {
    if (cooldownMs <= 0) {
      retryCountRef.current = 0;
      if (form.formState.errors.root?.type === 'cooldown') {
        form.clearErrors('root');
      }
      return undefined;
    }

    form.setError('root', {
      type: 'cooldown',
      message: cooldownMessage ?? 'Please wait before trying again.',
    });

    const intervalId = window.setInterval(() => {
      setCooldownMs((remaining) => (remaining <= 1000 ? 0 : remaining - 1000));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownMessage, cooldownMs, form]);

  const resetCooldown = () => {
    retryCountRef.current = 0;
    setCooldownMs(0);
    if (form.formState.errors.root?.type === 'cooldown') {
      form.clearErrors('root');
    }
  };

  const buildRedirectTarget = (fallback: string, options?: { ignoreQuery?: boolean }) => {
    if (options?.ignoreQuery || !redirectTo || redirectTo === '/login') {
      return fallback;
    }

    try {
      const resolved = new URL(redirectTo, APP_URL);
      if (resolved.origin !== APP_URL) {
        return fallback;
      }
      const normalized = `${resolved.pathname}${resolved.search}${resolved.hash}`;
      return normalized || fallback;
    } catch (error) {
      console.warn('Ignoring unsafe redirect parameter', error);
      return fallback;
    }
  };

  const buildEmailRedirectUrl = (targetPath: string) => {
    try {
      const base = new URL(EMAIL_REDIRECT_BASE);
      base.searchParams.set('redirect_to', targetPath);
      return base.toString();
    } catch (error) {
      console.error('Invalid email redirect base. Falling back to AUTH_REDIRECT_URL.', {
        base: EMAIL_REDIRECT_BASE,
        error,
      });
      const fallback = new URL(AUTH_REDIRECT_URL);
      fallback.searchParams.set('redirect_to', targetPath);
      return fallback.toString();
    }
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
    form.setValue('mode', nextMode, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    form.setValue('password', '', { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    if (nextMode === 'sign-in') {
      form.setValue('name', '', { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    }
    form.clearErrors();
    setStatusMessage(null);
    resetCooldown();
  };

  const onSubmit = form.handleSubmit(async (values) => {
    if (cooldownMs > 0 || isSubmitting) {
      if (cooldownMessage) {
        form.setError('root', { type: 'cooldown', message: cooldownMessage });
      }
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    form.clearErrors('root');

    try {
      const trimmedEmail = values.email.trim();
      if (!trimmedEmail) {
        form.setError('email', { type: 'manual', message: 'Email is required.' });
        return;
      }

      if (values.mode === 'sign-up') {
        const trimmedName = values.name?.trim() ?? '';
        const redirectTarget = buildRedirectTarget(SIGN_UP_FALLBACK_REDIRECT, { ignoreQuery: true });
        const emailRedirectTo = buildEmailRedirectUrl(redirectTarget);

        const {
          data,
          error: signUpError,
        } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: values.password,
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
            form.setError('root', {
              type: 'server',
              message: 'Too many attempts. Please wait a moment and try again.',
            });
          } else if (status === 400 || status === 422) {
            handleModeChange('sign-in');
            form.setValue('password', '', { shouldDirty: false, shouldTouch: false, shouldValidate: false });
            form.setError('root', {
              type: 'server',
              message: 'That email is already registered. Try signing in with your password or reset it below.',
            });
            setStatusMessage('Sign in with your password or use the password reset link.');
          } else {
            applyCooldown('soft');
            form.setError('root', { type: 'server', message: signUpError.message });
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
          resetCooldown();
          setIsSubmitting(false);
          startNavigation(() => {
            router.replace(redirectTarget);
            if (typeof router.refresh === 'function') {
              router.refresh();
            }
          });
          return;
        }

        setStatusMessage(
          `Check ${trimmedEmail} to confirm your account. Once verified, we'll finish setting things up.`,
        );
        form.reset(
          {
            mode: 'sign-in',
            email: trimmedEmail,
            password: '',
            name: '',
          },
          { keepDefaultValues: false },
        );
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: values.password,
      });

      if (signInError) {
        const status = 'status' in signInError ? signInError.status : undefined;
        if (status === 429) {
          applyCooldown('hard');
        } else {
          applyCooldown('soft');
          form.setError('root', { type: 'server', message: signInError.message });
        }
        return;
      }

      const target = buildRedirectTarget(SIGN_IN_FALLBACK_REDIRECT);
      resetCooldown();
      setIsSubmitting(false);
      startNavigation(() => {
        router.replace(target);
        if (typeof router.refresh === 'function') {
          router.refresh();
        }
      });
      return;
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={onSubmit} noValidate>
        <div className="grid gap-2 rounded-2xl border border-default bg-background-muted/80 p-2 text-xs font-semibold md:grid-cols-2">
          <button
            type="button"
            onClick={() => handleModeChange('sign-in')}
            className={cn(
              'touch-target flex-1 rounded-xl px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              mode === 'sign-in'
                ? 'bg-emerald-500 text-black shadow-soft'
                : 'bg-transparent text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('sign-up')}
            className={cn(
              'touch-target flex-1 rounded-xl px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2',
              mode === 'sign-up'
                ? 'bg-emerald-500 text-black shadow-soft'
                : 'bg-transparent text-muted-foreground hover:bg-background hover:text-foreground',
            )}
          >
            Sign up
          </button>
        </div>

        <div className="space-y-3 rounded-2xl bg-background px-4 py-4 text-sm shadow-inner">
          <p className="font-medium text-foreground">
            {mode === 'sign-in' ? 'Use your email and password to sign in.' : 'Create your owner account.'}
          </p>
          <p className="text-xs text-muted-foreground">
            {mode === 'sign-in'
              ? 'Enter your credentials to access your account.'
              : 'We will send a confirmation email before finishing setup.'}
          </p>
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode === 'sign-up' ? (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    autoComplete="name"
                    placeholder="Sam Smith"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{mode === 'sign-up' ? 'Create a password' : 'Password'}</FormLabel>
              <FormDescription>
                {mode === 'sign-up'
                  ? `Use at least ${MIN_PASSWORD_LENGTH} characters, with a mix of letters and numbers.`
                  : 'Keep your account secure by never sharing your password.'}
              </FormDescription>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'sign-up' ? 'At least 8 characters' : '••••••••'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {rootError ? (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{rootError}</div>
        ) : null}

        {statusMessage ? (
          <div className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-accent">{statusMessage}</div>
        ) : null}

        <input type="hidden" {...form.register('mode')} />

        <button
          type="submit"
          disabled={isSubmitting || cooldownMs > 0 || isNavigating}
          className={cn(
            'touch-target w-full rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-black shadow-strong transition-transform hover:-translate-y-0.5 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {cooldownMs > 0
            ? `Try again in ${Math.ceil(cooldownMs / 1000)}s`
            : isNavigating
              ? 'Redirecting…'
              : isSubmitting
                ? mode === 'sign-up'
                  ? 'Creating account…'
                  : 'Signing in…'
              : mode === 'sign-up'
                ? 'Create account'
                : 'Sign in'}
        </button>
        <div className="text-center text-xs text-muted-foreground">
          <Link href="/forgot-password" className="text-accent hover:text-accent-strong">
            Forgot password?
          </Link>
        </div>
      </form>
    </Form>
  );
}
