'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { PASSWORD_RESET_REDIRECT_URL } from '@/lib/auth/config';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/forms';
import { Input } from '@/components/ui';
import { cn } from '@/lib/cn';

const formSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
});

type ForgotPasswordFormValues = z.infer<typeof formSchema>;

export default function ForgotPasswordForm() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const email = values.email.trim();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: PASSWORD_RESET_REDIRECT_URL,
      });

      if (error) {
        const status = 'status' in error ? error.status : undefined;
        if (status === 429) {
          setErrorMessage('Too many requests. Wait a few moments and try again.');
        } else {
          setErrorMessage(error.message ?? 'Unable to send reset email.');
        }
        return;
      }

      setStatusMessage(`We sent a reset link to ${email}. Check your inbox to continue.`);
      form.reset({ email: '' });
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Form {...form}>
      <form className="mt-6 space-y-6" onSubmit={onSubmit} noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email address</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="you@example.com" autoComplete="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {errorMessage ? (
          <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
            {errorMessage}
          </div>
        ) : null}

        {statusMessage ? (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {statusMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            'touch-target w-full rounded-full bg-accent px-6 py-3 text-sm font-semibold text-background shadow-strong transition-transform hover:-translate-y-0.5 hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {isSubmitting ? 'Sending reset link…' : 'Send reset link'}
        </button>
      </form>
    </Form>
  );
}
