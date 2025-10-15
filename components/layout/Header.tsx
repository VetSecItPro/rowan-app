'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';
import { NotificationCenter } from '@/components/reminders/NotificationCenter';
import { useAuth } from '@/lib/contexts/auth-context';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';

const COLOR_THEMES = {
  emerald: 'bg-emerald-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  pink: 'bg-pink-500',
  orange: 'bg-orange-500',
  rose: 'bg-rose-500',
  cyan: 'bg-cyan-500',
  amber: 'bg-amber-500',
};

export function Header() {
  const { user, signOut } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    setIsDropdownOpen(false);
    router.push('/login');
  };

  return (
    <header className="bg-gray-50 dark:bg-black border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo and Brand - Clickable */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3 group">
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={48}
              height={48}
              sizes="(max-width: 640px) 32px, (max-width: 1024px) 40px, 48px"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 transition-transform group-hover:scale-110"
              priority
            />
            <span className="text-2xl font-semibold gradient-text">Rowan</span>
          </Link>

          {/* Menu, Theme Toggle & Auth Buttons */}
          <div className="flex items-center gap-4">
            <a href="#pricing" className="hidden md:block inline-block py-3 px-4 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors active:opacity-80">Pricing</a>
            <HamburgerMenu />

            {/* Only show Settings and Notifications for logged-in users */}
            {user && (
              <>
                <NotificationCenter userId={user.id} />
                <Link
                  href="/settings"
                  className="hidden sm:flex items-center justify-center btn-icon-mobile rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all touch-feedback focus-mobile active:scale-95"
                  aria-label="Settings"
                >
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </Link>
              </>
            )}

            <ThemeToggle />

            {/* Show Dashboard only for logged-in users, Create Account for non-logged-in */}
            {user ? (
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2 btn-touch shimmer-bg text-white rounded-full hover:opacity-90 transition-all shadow-md hover:shadow-lg font-medium touch-feedback active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
            ) : (
              <Link
                href="/signup"
                className="hidden sm:flex items-center gap-2 px-5 py-2 shimmer-bg text-white rounded-full hover:opacity-90 transition-all shadow-md hover:shadow-lg font-medium active:scale-95"
              >
                Create Your Account
              </Link>
            )}

            {/* Conditional: Show user dropdown if logged in, otherwise show Login button */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium transition-all hover:opacity-90 active:scale-95 ${
                    COLOR_THEMES[user.color_theme as keyof typeof COLOR_THEMES] || 'bg-purple-600'
                  }`}
                >
                  {user.name}
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 dropdown-mobile bg-gray-50 dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link
                      href="/dashboard"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-[0.98]"
                    >
                      <UserIcon className="w-4 h-4" />
                      Dashboard
                    </Link>
                    <hr className="my-1 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-[0.98]"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-6 py-2 shimmer-bg text-white rounded-full hover:opacity-90 transition-all shadow-lg shadow-purple-500/30 active:scale-95"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
