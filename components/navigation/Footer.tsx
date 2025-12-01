'use client';

import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white/80 dark:bg-black/80 backdrop-blur-lg border-t border-gray-200/50 dark:border-gray-800/50 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={32}
              height={32}
              className="w-8 h-8 sm:w-8 sm:h-8"
            />
            <div className="flex flex-col items-start">
              <span className="text-lg font-semibold gradient-text">Rowan</span>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>© {currentYear}</span>
                <span>•</span>
                <span>Veteran Owned Business</span>
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center flex-wrap justify-center gap-1 sm:gap-3">
            <Link
              href="/terms"
              className="btn-touch px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
            >
              Terms of Service
            </Link>
            <Link
              href="/privacy"
              className="btn-touch px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
            >
              Privacy Policy
            </Link>
            <Link
              href="/cookies"
              className="btn-touch px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
            >
              Cookie Policy
            </Link>
            <Link
              href="/settings/privacy-data"
              className="btn-touch px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
            >
              Privacy Settings
            </Link>
            <button
              onClick={() => {
                // Trigger cookie consent dialog
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('show-cookie-consent'));
                }
              }}
              className="btn-touch px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
            >
              Cookie Preferences
            </button>
            <Link
              href="/settings/documentation"
              className="btn-touch px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
            >
              Documentation
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
