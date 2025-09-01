import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const isConfigured = Boolean(process.env.ADMIN_PASSWORD);
  const authed = cookies().get('admin_auth')?.value === 'ok';

  // --- Server actions (run on the server only) ---
  async function login(formData: FormData) {
    'use server';
    if (!process.env.ADMIN_PASSWORD) {
      redirect('/admin?error=ADMIN_PASSWORD not configured');
    }
    const pw = (formData.get('password') ?? '').toString();
    if (pw !== process.env.ADMIN_PASSWORD) {
      redirect('/admin?error=Invalid password');
    }
    cookies().set('admin_auth', 'ok', {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
      sameSite: 'lax',
    });
    redirect('/admin');
  }

  async function logout() {
    'use server';
    cookies().delete('admin_auth');
    redirect('/admin');
  }
  // ------------------------------------------------

  // Not configured yet
  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <h1 className="text-2xl font-semibold">Admin not configured</h1>
          <p>
            Set <span className="font-mono">ADMIN_PASSWORD</span> in Replit Secrets for both
            <strong> Run</strong> and <strong>Deploy</strong> environments, then reload.
          </p>
          <div>
            <Link href="/" className="text-blue-400 hover:text-blue-300">
              ← Back to site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated → show server-action login form
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center p-6">
        <form
          action={login}
          className="max-w-sm w-full bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4"
        >
          <h1 className="text-2xl font-semibold">Admin Login</h1>
          <label className="block text-sm">
            <span className="text-gray-300">Password</span>
            <input
              type="password"
              name="password"
              required
              className="mt-1 w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Sign in
          </button>
          <div className="text-sm">
            <Link href="/" className="text-gray-400 hover:text-gray-300">
              ← Back to site
            </Link>
          </div>
        </form>
      </div>
    );
  }

  // Authenticated → render admin chrome + children
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-6">
              <Link href="/admin/properties" className="text-gray-200 hover:text-white">
                Properties
              </Link>
              <Link href="/admin/bookings" className="text-gray-200 hover:text-white">
                Bookings
              </Link>
              <Link href="/admin/blackouts" className="text-gray-200 hover:text-white">
                Blackouts
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-gray-300">
                ← Back to site
              </Link>
              <form action={logout}>
                <button
                  type="submit"
                  className="bg-gray-700 hover:bg-gray-600 text-sm px-3 py-1 rounded"
                >
                  Log out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
