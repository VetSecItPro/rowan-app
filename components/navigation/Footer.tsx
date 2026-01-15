'use client';

import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black/80 backdrop-blur-lg border-t border-gray-800/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <div className="flex flex-col items-start">
              <span className="text-lg font-semibold gradient-text">Rowan</span>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>© {currentYear}</span>
                <span>•</span>
                <span>Veteran Owned Business</span>
              </div>
            </div>
          </div>

          {/* Links - Centered */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
            <Link
              href="/legal"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Legal
            </Link>
            <Link
              href="/settings/documentation"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Docs
            </Link>
          </div>

          {/* Spacer for the floating feedback button */}
          <div className="w-32 sm:w-40" />
        </div>
      </div>
    </footer>
  );
}
