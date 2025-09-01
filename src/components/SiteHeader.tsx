import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="border-b border-gray-800 bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img 
            src="/brand/logo.png" 
            alt="CottageMaster" 
            className="h-16 w-auto"
          />
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/#features" className="text-gray-300 hover:text-white">Features</Link>
          <Link href="/#property" className="text-gray-300 hover:text-white">Property</Link>
          <Link href="/bookings" className="text-gray-300 hover:text-white">Availability</Link>
          <Link href="/admin" className="inline-flex items-center rounded-md px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            Owner Login
          </Link>
        </nav>
      </div>
    </header>
  );
}
