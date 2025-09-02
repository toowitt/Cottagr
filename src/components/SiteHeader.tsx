import Link from 'next/link';

export default function SiteHeader() {
  return (
    <header className="border-b border-gray-800 bg-gray-900/70 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
      <div className="mx-auto max-w-6xl px-4 h-20 flex items-center justify-between">
        {/* Logo (bigger) */}
        <Link href="/" className="flex items-center">
          <img 
            src="/cottagr-logo.png"   // make sure this exists in /public
            alt="Cottagr" 
            className="h-12 w-auto"   // increased size
          />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-6 text-sm">
          {/* Cottagr landing sections */}
          <Link href="/#features" className="text-gray-300 hover:text-white">Features</Link>
          <Link href="/#how" className="text-gray-300 hover:text-white">How it works</Link>
          <Link href="/#pricing" className="text-gray-300 hover:text-white">Pricing</Link>
          <Link href="/#faq" className="text-gray-300 hover:text-white">FAQ</Link>

          {/* Removed “Property” link */}
          <Link href="/bookings" className="text-gray-300 hover:text-white">Availability</Link>
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