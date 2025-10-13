import React from 'react';
import { describe, beforeEach, expect, test, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from '../LoginForm';

const originalFetch = global.fetch;

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const signInWithOtp = vi.fn();
const routerReplace = vi.fn();

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => ({
    auth: {
      signInWithPassword,
      signUp,
      signInWithOtp,
    },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: routerReplace,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    signUp.mockReset();
    signInWithOtp.mockReset();
    routerReplace.mockReset();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  test('switching to sign-up mode reveals the name field', async () => {
    render(<LoginForm />);
    const user = userEvent.setup();

    expect(screen.queryByLabelText(/name/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  });

  test('successful password sign-in redirects to /admin', async () => {
    signInWithPassword.mockResolvedValueOnce({ error: null });
    render(<LoginForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'owner@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    const submitButton = screen
      .getAllByRole('button', { name: /sign in/i })
      .find((button) => button.getAttribute('type') === 'submit');
    expect(submitButton).toBeDefined();
    await user.click(submitButton!);

    await waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: 'owner@example.com',
        password: 'password123',
      });
    });

    await waitFor(() => {
      expect(routerReplace).toHaveBeenCalledWith('/admin');
    });
  });

  test('sign-up without immediate session prompts for email confirmation', async () => {
    signUp.mockResolvedValueOnce({
      data: {
        user: {
          id: '123',
          email: 'new@example.com',
        },
        session: null,
      },
      error: null,
    });

    render(<LoginForm />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /sign up/i }));
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/name/i), 'New Owner');
    await user.type(screen.getByLabelText(/create a password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'secret123',
        options: expect.objectContaining({
          data: expect.objectContaining({ full_name: 'New Owner' }),
        }),
      });
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/auth/ensure-user', { method: 'POST' });
    });

    expect(
      await screen.findByText(/Check new@example.com to confirm your account/i),
    ).toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});
