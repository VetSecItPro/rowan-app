'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
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

interface HeaderProps {
  onBetaClick?: () => void;
  onLaunchClick?: () => void;
  isPublicFeaturePage?: boolean;
  /** Use 'landing' for homepage with animations, 'default' for app pages */
  variant?: 'default' | 'landing';
}

export function Header({ onBetaClick, onLaunchClick, isPublicFeaturePage, variant = 'default' }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { currentSpace } = useSpaces();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const isLanding = variant === 'landing';

  // Mount check for portal
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
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
        const dropdownWidth = 224;
        const viewportWidth = window.innerWidth;

        let rightPos = viewportWidth - rect.right;

        if (rect.right - dropdownWidth < 8) {
          rightPos = viewportWidth - dropdownWidth - 8;
        }

        if (rightPos < 8) {
          rightPos = 8;
        }

        setDropdownPosition({
          top: rect.bottom + 8,
          right: rightPos,
        });
      };

      updatePosition();

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

  // Header styling based on variant
  const headerClassName = isLanding
    ? 'sticky top-0 z-50 bg-gray-900/90 backdrop-blur-xl border-b border-gray-800/50'
    : 'bg-black/80 backdrop-blur-lg border-b border-gray-800/50 sticky top-0 z-50';

  const headerContent = (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
      <div className={`flex items-center justify-between ${isLanding ? 'py-4' : 'py-2 sm:py-4'}`}>
        {/* Logo and Brand */}
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 sm:gap-3 group active:scale-95">
          {isLanding ? (
            // Landing page: animated logo
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
            // Default: responsive logo with scale on hover
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={48}
              height={48}
              sizes="(max-width: 640px) 32px, (max-width: 1024px) 40px, 48px"
              className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 transition-transform group-hover:scale-110"
              priority
            />
          )}

          {/* Brand text */}
          {isLanding ? (
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Rowan
            </span>
          ) : (
            <>
              <span className="hidden sm:inline text-2xl font-semibold gradient-text">Rowan</span>
              {/* Beta badge - only on default variant */}
              <span className="px-1.5 py-0.5 bg-purple-900/50 text-purple-300 text-[10px] sm:text-xs font-bold rounded uppercase tracking-wide">
                Beta
              </span>
            </>
          )}
        </Link>

        {/* Right side navigation */}
        <div className="flex items-center gap-1 sm:gap-4">
          {/* Default variant: show feedback and hamburger for all users */}
          {!isLanding && (
            <>
              <FeedbackButton />
              <HamburgerMenu />
            </>
          )}

          {/* Notifications - logged-in users only, default variant only */}
          {!isLanding && user && (
            <div title="Notifications">
              <ComprehensiveNotificationCenter userId={user.id} spaceId={currentSpace?.id} />
            </div>
          )}

          {/* Settings link - logged-in users only, default variant only */}
          {!isLanding && user && (
            <Link
              href="/settings"
              className="hidden sm:flex items-center justify-center w-10 h-10 hover:bg-gray-700 rounded-md transition-colors active:scale-95"
              aria-label="Settings"
              title="Settings"
            >
              <svg className="w-5 h-5 text-gray-400 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </Link>
          )}

          {/* Nav links - non-logged-in users on desktop */}
          {!user && (
            <>
              <a href="#features" className="hidden md:block text-gray-300 hover:text-white transition-colors">
                Features
              </a>
              <Link href="/articles" className="hidden md:block text-gray-300 hover:text-white transition-colors">
                Articles
              </Link>
              <Link href="/pricing" className="hidden md:block text-gray-300 hover:text-white transition-colors">
                Pricing
              </Link>
            </>
          )}

          {/* CTA buttons / User menu */}
          {user ? (
            <>
              {/* Dashboard button - desktop only */}
              <Link
                href="/dashboard"
                className="hidden md:flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-full transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>

              {/* Admin/Beta Badge - default variant only */}
              {!isLanding && (hasAdminAccess(user) || isBetaTester(user)) && (
                <div className="flex">
                  {hasAdminAccess(user) ? (
                    <Link
                      href="/admin/dashboard"
                      className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-900/30 border border-indigo-700 text-indigo-300 rounded-full text-xs font-medium hover:bg-indigo-900/50 transition-colors"
                    >
                      <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Link>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-amber-900/30 border border-amber-700 text-amber-300 rounded-full text-xs font-medium">
                      <TestTube className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>Beta</span>
                    </div>
                  )}
                </div>
              )}

              {/* User dropdown */}
              <div className="relative">
                <button
                  ref={buttonRef}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-white text-xs font-medium transition-all hover:opacity-90 active:scale-95 ${COLOR_THEMES[user.color_theme as keyof typeof COLOR_THEMES] || 'bg-emerald-600'}`}
                >
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={user.name || 'User'}
                      width={18}
                      height={18}
                      className="w-[18px] h-[18px] rounded-full object-cover border border-white/20"
                      sizes="18px"
                      priority
                    />
                  ) : (
                    <div className="w-[18px] h-[18px] rounded-full bg-white/20 flex items-center justify-center text-[9px] font-semibold">
                      {(user.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <ChevronDown className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && mounted && dropdownPosition.top > 0 && createPortal(
                  <div
                    ref={dropdownRef}
                    className="fixed w-56 bg-gray-800/95 backdrop-blur-xl rounded-lg shadow-xl border border-gray-700/50 py-1 animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{
                      top: `${dropdownPosition.top}px`,
                      right: `${dropdownPosition.right}px`,
                      zIndex: 10000,
                      maxHeight: 'calc(100vh - 100px)',
                      overflowY: 'auto',
                    }}
                  >
                    {/* Profile Section */}
                    <div className="px-4 py-3 border-b border-gray-700/50">
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${COLOR_THEMES[user.color_theme as keyof typeof COLOR_THEMES] || 'bg-purple-600'}`}>
                            {(user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Items */}
                    <Link
                      href="/settings"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors active:scale-[0.98]"
                    >
                      <UserIcon className="w-4 h-4" />
                      Settings
                    </Link>

                    <Link
                      href="/goals/badges"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors active:scale-[0.98]"
                    >
                      <Trophy className="w-4 h-4" />
                      Achievements
                    </Link>

                    {currentSpace && (
                      <Link
                        href="/dashboard?invite=true"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors active:scale-[0.98]"
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite Partner
                      </Link>
                    )}

                    {hasAdminAccess(user) && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-purple-400 hover:bg-purple-900/20 transition-colors active:scale-[0.98] border-t border-gray-700/50 mt-1 pt-3"
                      >
                        <Shield className="w-4 h-4" />
                        Admin Dashboard
                      </Link>
                    )}

                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 transition-colors active:scale-[0.98]"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>,
                  document.body
                )}
              </div>
            </>
          ) : isPublicFeaturePage ? (
            // Public feature page buttons
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onBetaClick}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-[10px] sm:text-xs font-bold rounded-full transition-all shadow-md active:scale-95 whitespace-nowrap"
              >
                Join Beta
              </button>
              <button
                onClick={onLaunchClick}
                className="hidden sm:block px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 text-[10px] sm:text-xs font-bold rounded-full transition-all shadow-sm active:scale-95 whitespace-nowrap"
              >
                Get Notified
              </button>
            </div>
          ) : (
            // Login button - style based on variant
            <Link
              href="/login"
              prefetch={true}
              className={isLanding
                ? "px-4 sm:px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-full font-semibold text-sm sm:text-base transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                : "px-4 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 text-white text-sm sm:text-base font-semibold rounded-full hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
              }
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  // Wrap in motion.header for landing variant, regular header otherwise
  if (isLanding) {
    return (
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className={headerClassName}
      >
        {headerContent}
      </motion.header>
    );
  }

  return (
    <header className={headerClassName}>
      {headerContent}
    </header>
  );
}
