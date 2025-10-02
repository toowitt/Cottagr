
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Check environment variables
  if (process.env.SINGLE_TENANT !== "true" || !process.env.ADMIN_PASSWORD) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-md p-6 bg-gray-800 rounded-lg">
          <h1 className="text-xl font-bold mb-4">Configuration Required</h1>
          <p className="text-gray-300 mb-4">
            To use the admin panel, please set:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>SINGLE_TENANT=&quot;true&quot;</li>
            <li>ADMIN_PASSWORD=&quot;your-secure-password&quot;</li>
          </ul>
        </div>
      </div>
    );
  }

  // If already authenticated, redirect to admin
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('auth');
  
  if (authCookie && authCookie.value === 'ok') {
    redirect('/admin');
  }

  return <>{children}</>;
}
