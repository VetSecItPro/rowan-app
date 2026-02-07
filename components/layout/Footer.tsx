import Link from 'next/link';
import Image from 'next/image';

const allLinks = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Security', href: '/security' },
  { label: 'Articles', href: '/articles' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
];

export function Footer() {
  return (
    <footer className="border-t border-gray-800/50 bg-gray-900/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand with logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/rowan-logo.png"
                alt="Rowan Logo"
                width={24}
                height={24}
                className="w-6 h-6"
              />
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Rowan
              </span>
            </Link>
            <span className="text-xs text-gray-500 border-l border-gray-700 pl-3">
              Veteran-Owned Business
            </span>
          </div>

          {/* Links in one line separated by dots */}
          <nav className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1 text-sm text-gray-400">
            {allLinks.map((link, index) => (
              <span key={link.href} className="flex items-center">
                <Link
                  href={link.href}
                  className="hover:text-white transition-colors"
                >
                  {link.label}
                </Link>
                {index < allLinks.length - 1 && (
                  <span className="mx-2 text-gray-600">·</span>
                )}
              </span>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Rowan
          </p>
        </div>
      </div>
    </footer>
  );
}
