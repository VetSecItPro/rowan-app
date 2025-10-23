'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';
import { ComprehensiveNotificationCenter } from '@/components/notifications/ComprehensiveNotificationCenter';
import { useAuth } from '@/lib/contexts/auth-context';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { SpaceSelector } from '@/components/spaces/SpaceSelector';

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
  const { user, signOut, currentSpace, spaces, switchSpace } = useAuth();
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
    <header className="bg-white/80 dark:bg-black/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Logo and Brand - Clickable */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3 group active:scale-95">
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
            {/* Grouped: Hamburger Menu, Notifications, Settings, and Theme */}
            <div className="flex items-center space-x-0.5">
              <HamburgerMenu />

              {/* Only show Settings and Notifications for logged-in users */}
              {user && (
                <>
                  <div title="Notifications">
                    <ComprehensiveNotificationCenter userId={user.id} spaceId={currentSpace?.id} />
                  </div>
                  <Link
                    href="/settings"
                    className="hidden sm:flex items-center justify-center w-10 h-10 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors active:scale-95"
                    aria-label="Settings"
                    title="Settings"
                  >
                    <svg className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </Link>
                </>
              )}

              <div title="Toggle dark mode">
                <ThemeToggle />
              </div>
            </div>

            {/* Pricing Link */}
            <a href="#pricing" className="hidden md:block inline-block py-2 px-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95">Pricing</a>

            {/* Show Dashboard only for logged-in users, Create Account for non-logged-in */}
            {user ? (
              <Link
                href="/dashboard"
                className="hidden sm:flex items-center gap-2 px-4 py-2 shimmer-bg text-white rounded-full hover:opacity-90 transition-all shadow-md hover:shadow-lg font-medium active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
            ) : (
              <Link
                href="/signup"
                className="hidden sm:flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-full hover:opacity-90 transition-all shadow-md hover:shadow-lg font-medium active:scale-95"
              >
                Create Your Account
              </Link>
            )}

            {/* Space Selector for logged-in users */}
            {user && currentSpace && spaces.length > 0 && (
              <div className="hidden sm:block">
                <SpaceSelector
                  spaces={spaces}
                  currentSpace={currentSpace}
                  onSpaceChange={switchSpace}
                  onCreateSpace={() => router.push('/dashboard')} // Navigate to dashboard for modal
                  onInvitePartner={() => router.push('/dashboard')} // Navigate to dashboard for modal
                  userColorTheme={user.color_theme}
                  variant="header"
                />
              </div>
            )}

            {/* Conditional: Show user dropdown if logged in, otherwise show Login button */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-white font-medium transition-all hover:opacity-90 active:scale-95 min-w-[90px] ${
                    COLOR_THEMES[user.color_theme as keyof typeof COLOR_THEMES] || 'bg-purple-600'
                  }`}
                >
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.name}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full object-cover border border-white/20"
                      sizes="24px"
                      priority
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1">{user.name}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 dropdown-mobile bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Profile Section */}
                    <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                            COLOR_THEMES[user.color_theme as keyof typeof COLOR_THEMES] || 'bg-purple-600'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <Link
                      href="/settings"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-[0.98]"
                    >
                      <UserIcon className="w-4 h-4" />
                      Settings
                    </Link>

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
                className="px-6 py-2 bg-purple-600 text-white rounded-full hover:opacity-90 transition-all shadow-lg active:scale-95"
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
