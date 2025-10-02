"use client";

import Image from 'next/image';
import Link from 'next/link';
import { Moon, SunMedium } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

export default function SiteHeader() {
  const { theme, toggleTheme, isReady } = useTheme();
  const isDark = (isReady ? theme : 'dark') === 'dark';

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
      <div className="mx-auto flex h-24 max-w-6xl items-center justify-between px-4">
        {/* Logo (bigger) */}
        <Link href="/" className="flex items-center">
          <Image
            src="/cottagr-wordmark.png"
            alt="Cottagr"
            width={220}
            height={96}
            className="h-16 w-auto"
            priority
          />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6 text-sm">
          {/* Cottagr landing sections */}
          <Link href="/#features" className="text-gray-300 hover:text-white">Features</Link>
          <Link href="/#how" className="text-gray-300 hover:text-white">How it works</Link>
          <Link href="/knowledge-hub" className="text-gray-300 hover:text-white">Knowledge Hub</Link>
          <Link href="/#pricing" className="text-gray-300 hover:text-white">Pricing</Link>
          <Link href="/#faq" className="text-gray-300 hover:text-white">FAQ</Link>

          {/* Removed “Property” link */}
          <Link href="/bookings" className="text-gray-300 hover:text-white">Availability</Link>
          <Link href="/expenses" className="text-gray-300 hover:text-white">Expenses</Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-700 bg-gray-800/80 text-gray-200 shadow-sm transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <Link 
            href="/admin" 
            className="inline-flex items-center rounded-md px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Owner Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
