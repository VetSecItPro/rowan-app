'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

interface PublicHeaderProps {
  animated?: boolean;
}

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'Articles', href: '/articles' },
  { label: 'Pricing', href: '/pricing' },
];

export function PublicHeaderLite({ animated = false }: PublicHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActiveLink = (href: string) => {
    if (href.startsWith('/#')) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const headerContent = (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
          {animated ? (
            <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
              <Image
                src="/rowan-logo.png"
                alt="Rowan Logo"
                width={32}
                height={32}
                className="w-8 h-8"
                priority
              />
            </motion.div>
          ) : (
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={32}
              height={32}
              className="w-8 h-8 transition-transform group-hover:scale-110"
              priority
            />
          )}
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Rowan
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActiveLink(link.href)
                  ? 'text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2.5 text-gray-300 hover:text-white text-sm font-medium transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-semibold rounded-full transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Sign Up
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-gray-800/50"
          >
            <nav className="py-4 space-y-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActiveLink(link.href)
                      ? 'text-white bg-gray-800'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="pb-4 pt-2 border-t border-gray-800/50 flex flex-col gap-2 px-3">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 text-sm font-medium rounded-full transition-all"
              >
                Login
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-semibold rounded-full transition-all"
              >
                Sign Up
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (animated) {
    return (
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/50"
      >
        {headerContent}
      </motion.header>
    );
  }

  return (
    <header className="sticky top-0 z-50 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/50">
      {headerContent}
    </header>
  );
}
