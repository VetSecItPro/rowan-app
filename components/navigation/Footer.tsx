'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Shield } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [mobileLegalExpanded, setMobileLegalExpanded] = useState(false);

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

          {/* Desktop Links - always visible on sm+ */}
          <div className="hidden sm:flex items-center flex-wrap justify-center gap-1 sm:gap-3">
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

          {/* Mobile Links - Collapsible */}
          <div className="sm:hidden w-full">
            <button
              onClick={() => setMobileLegalExpanded(!mobileLegalExpanded)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-[0.98]"
            >
              <Shield className="w-4 h-4" />
              <span>Legal & Policies</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileLegalExpanded ? 'rotate-180' : ''}`} />
            </button>

            {mobileLegalExpanded && (
              <div className="flex flex-col items-center gap-1 pt-2 pb-1 border-t border-gray-200/50 dark:border-gray-700/50 mt-2">
                <Link
                  href="/terms"
                  className="btn-touch px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
                >
                  Terms of Service
                </Link>
                <Link
                  href="/privacy"
                  className="btn-touch px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
                >
                  Privacy Policy
                </Link>
                <Link
                  href="/cookies"
                  className="btn-touch px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
                >
                  Cookie Policy
                </Link>
                <Link
                  href="/settings/privacy-data"
                  className="btn-touch px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
                >
                  Privacy Settings
                </Link>
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      window.dispatchEvent(new CustomEvent('show-cookie-consent'));
                    }
                  }}
                  className="btn-touch px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
                >
                  Cookie Preferences
                </button>
                <Link
                  href="/settings/documentation"
                  className="btn-touch px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95"
                >
                  Documentation
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
