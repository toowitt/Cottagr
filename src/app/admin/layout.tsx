'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't check auth on login page to prevent redirect loop
    if (pathname === '/admin/login') {
      setIsAuthenticated(true);
      setIsChecking(false);
      return;
    }

    const checkConfig = async () => {
      try {
        const configResponse = await fetch('/admin/api/config');
        const configData = await configResponse.json();
        
        if (!configData.configured) {
          setIsConfigured(false);
          setIsChecking(false);
          return;
        }
        
        setIsConfigured(true);
        
        // Only check auth if config is valid
        const authResponse = await fetch('/admin/api/check-auth');
        if (authResponse.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.replace('/admin/login');
        }
      } catch (error) {
        setIsAuthenticated(false);
        router.replace('/admin/login');
      } finally {
        setIsChecking(false);
      }
    };

    checkConfig();
  }, [router, pathname]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (isConfigured === false) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="max-w-md p-6 bg-gray-800 rounded-lg">
          <h1 className="text-xl font-bold mb-4">Configuration Required</h1>
          <p className="text-gray-300 mb-4">
            To use the admin panel, please set these environment variables in Secrets:
          </p>
          <ul className="list-disc list-inside text-gray-300 space-y-1">
            <li>SINGLE_TENANT="true"</li>
            <li>ADMIN_PASSWORD="your-secure-password"</li>
          </ul>
          <p className="text-sm text-gray-400 mt-4">
            After adding secrets, restart your application.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/admin/login') {
    return null; // Will redirect to login
  }


  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/admin" className="text-xl font-bold">
              CottageMaster Admin
            </Link>
            <div className="flex space-x-6">
              <Link
                href="/admin/properties"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Properties
              </Link>
              <Link
                href="/admin/calendar"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Calendar
              </Link>
              <Link
                href="/admin/blackouts"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Blackouts
              </Link>
              <Link
                href="/admin/bookings"
                className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Bookings
              </Link>
              <Link
                href="/"
                className="text-gray-400 hover:text-gray-300 px-3 py-2 rounded-md text-sm font-medium"
              >
                ← Back to Site
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}