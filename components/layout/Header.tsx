'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { HamburgerMenu } from '@/components/navigation/HamburgerMenu';
import { ComprehensiveNotificationCenter } from '@/components/notifications/ComprehensiveNotificationCenter';
import { FeedbackButton } from '@/components/feedback/FeedbackButton';
import { useAuth } from '@/lib/contexts/auth-context';
import { useSpaces } from '@/lib/contexts/spaces-context';
import { LogOut, User as UserIcon, ChevronDown, Trophy, Shield, UserPlus, TestTube } from 'lucide-react';
import { hasAdminAccess } from '@/lib/utils/admin-utils';

// Beta period end date - Feb 15, 2026
const BETA_END_DATE = new Date('2026-02-15T23:59:59Z');

// Helper to check beta tester status
// All users created before Feb 15, 2026 are beta testers
const isBetaTester = (user: {
  is_beta_tester?: boolean;
  beta_status?: string;
  beta_invite_code_id?: string;
  beta_ends_at?: string;
  created_at?: string;
} | null) => {
  if (!user) return false;

  // BETA PERIOD: All users created before Feb 15, 2026 are beta testers
  if (user.created_at) {
    const createdAt = new Date(user.created_at);
    if (createdAt < BETA_END_DATE) return true;
  }

  // Legacy checks (for backward compatibility)
  if (user.is_beta_tester && user.beta_status === 'approved') return true;
  if (user.beta_invite_code_id && user.beta_ends_at) {
    const endsAt = new Date(user.beta_ends_at);
    return endsAt > new Date();
  }
  return false;
};

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
  const { currentSpace, spaces, switchSpace } = useSpaces();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Check if click is outside both the button and the dropdown
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        buttonRef.current && !buttonRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isDropdownOpen && buttonRef.current && mounted) {
      const updatePosition = () => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const dropdownWidth = 224; // w-56 = 14rem = 224px
        const viewportWidth = window.innerWidth;

        // Calculate right position, ensuring dropdown stays within viewport
        let rightPos = viewportWidth - rect.right;

        // On mobile, if dropdown would overflow left side, adjust position
        if (rect.right - dropdownWidth < 8) {
          rightPos = viewportWidth - dropdownWidth - 8; // 8px padding from edge
        }

        // Ensure right position doesn't push dropdown off right edge
        if (rightPos < 8) {
          rightPos = 8;
        }

        setDropdownPosition({
          top: rect.bottom + 8, // 8px gap (mt-2 equivalent)
          right: rightPos,
        });
      };

      // Initial calculation
      updatePosition();

      // Recalculate on resize/scroll
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isDropdownOpen, mounted]);

  const handleSignOut = async () => {
    await signOut();
    setIsDropdownOpen(false);
    router.push('/login');
  };

  return (
    <>
      <header className="bg-white/80 dark:bg-black/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-2 sm:py-4">
          {/* Logo and Brand - Clickable */}
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 sm:gap-3 group active:scale-95">
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={48}
              height={48}
              sizes="(max-width: 640px) 32px, (max-width: 1024px) 40px, 48px"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 transition-transform group-hover:scale-110"
              priority
            />
            <span className="hidden sm:inline text-2xl font-semibold gradient-text">Rowan</span>
            {/* Beta badge next to logo */}
            <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-[10px] sm:text-xs font-bold rounded uppercase tracking-wide">
              Beta
            </span>
          </Link>

          {/* Menu, Theme Toggle & Auth Buttons */}
          <div className="flex items-center gap-1 sm:gap-4">
            {/* Desktop only: Feedback button */}
            <div className="hidden sm:block">
              <FeedbackButton />
            </div>

            {/* Hamburger Menu - always visible */}
            <HamburgerMenu />

            {/* Only show Notifications for logged-in users */}
            {user && (
              <div title="Notifications">
                <ComprehensiveNotificationCenter userId={user.id} spaceId={currentSpace?.id} />
              </div>
            )}

            {/* Desktop only: Settings link */}
            {user && (
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
            )}

            {/* Desktop only: Theme toggle */}
            <div className="hidden sm:block" title="Toggle dark mode">
              <ThemeToggle />
            </div>

            {/* Features & Pricing Links - Only show for non-logged-in users on desktop */}
            {!user && (
              <>
                <a href="#features" className="hidden md:inline-block py-2 px-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95">
                  Features
                </a>
                <a href="#pricing" className="hidden md:inline-block py-2 px-3 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95">
                  Pricing
                </a>
              </>
            )}

            {/* Desktop: Show Dashboard button for logged-in users, Create Account for non-logged-in */}
            {user ? (
              <Link
                href="/dashboard"
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-full transition-all shadow-md hover:shadow-lg font-medium active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
            ) : (
              <Link
                href="/signup"
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-full transition-all shadow-md hover:shadow-lg font-medium active:scale-95"
              >
                Create Your Account
              </Link>
            )}

            {/* Admin/Beta Tester Badge - visible on all screen sizes */}
            {user && (hasAdminAccess(user) || isBetaTester(user)) && (
              <div className="flex">
                {hasAdminAccess(user) ? (
                  <Link
                    href="/admin/dashboard"
                    className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300 rounded-full text-[10px] sm:text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                  >
                    <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                ) : (
                  <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 rounded-full text-[10px] sm:text-xs font-medium">
                    <TestTube className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    <span>Beta</span>
                  </div>
                )}
              </div>
            )}

            {/* User dropdown (logged in) or Login button (not logged in) */}
            {user ? (
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-white font-medium transition-all hover:opacity-90 active:scale-95 ${
                    COLOR_THEMES[user.color_theme as keyof typeof COLOR_THEMES] || 'bg-emerald-600'
                  }`}
                >
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.name || 'User'}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full object-cover border border-white/20"
                      sizes="24px"
                      priority
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-semibold">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline text-sm truncate max-w-[100px]">{user.name}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu - Rendered via portal for proper positioning on mobile */}
                {isDropdownOpen && mounted && dropdownPosition.top > 0 && createPortal(
                  <div
                    ref={dropdownRef}
                    className="fixed w-56 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-lg shadow-xl border border-gray-200/50 dark:border-gray-700/50 py-1 animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{
                      top: `${dropdownPosition.top}px`,
                      right: `${dropdownPosition.right}px`,
                      zIndex: 10000,
                      maxHeight: 'calc(100vh - 100px)',
                      overflowY: 'auto',
                    }}
                  >
                    {/* Profile Section */}
                    <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.name || 'User'}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover"
                            sizes="32px"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                            COLOR_THEMES[user.color_theme as keyof typeof COLOR_THEMES] || 'bg-purple-600'
                          }`}>
                            {(user.name || 'U').charAt(0).toUpperCase()}
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

                    <Link
                      href="/goals/badges"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-[0.98]"
                    >
                      <Trophy className="w-4 h-4" />
                      Achievements
                    </Link>

                    {/* Invite Partner - Navigate to dashboard to trigger invite modal */}
                    {currentSpace && (
                      <Link
                        href="/dashboard?invite=true"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-[0.98]"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite Partner
                      </Link>
                    )}

                    {/* Admin Dashboard - Only show for admin users */}
                    {hasAdminAccess(user) && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors active:scale-[0.98] border-t border-gray-200/50 dark:border-gray-700/50 mt-1 pt-3"
                      >
                        <Shield className="w-4 h-4" />
                        Admin Dashboard
                      </Link>
                    )}

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-[0.98]"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 text-white text-sm sm:text-base font-semibold rounded-full hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
      </header>
    </>
  );
}
