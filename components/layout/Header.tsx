'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';

export function Header() {
  return (
    <header className="bg-white dark:bg-black border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo and Brand - Clickable */}
          <Link href="/" className="flex items-center gap-3 group">
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={32}
              height={32}
              className="w-8 h-8 transition-transform group-hover:scale-110"
            />
            <span className="text-2xl font-semibold gradient-text">Rowan</span>
          </Link>

          {/* Menu, Theme Toggle & Auth Buttons */}
          <div className="flex items-center gap-4">
            <a href="#pricing" className="hidden md:block text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
            <HamburgerMenu />
            <ThemeToggle />
            <a
              href="#login"
              className="px-6 py-2 shimmer-bg text-white rounded-full hover:opacity-90 transition-all shadow-lg shadow-purple-500/30"
            >
              Login
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
