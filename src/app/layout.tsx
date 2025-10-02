import './globals.css';
import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Cottagr',
  description: 'Shared cottage management made simple.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full theme-dark" suppressHydrationWarning>
      <body className="min-h-full bg-gray-950 text-gray-100 antialiased transition-colors">
        <ThemeProvider>
          <SiteHeader />
          <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
