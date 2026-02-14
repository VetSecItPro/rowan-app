'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { NAVIGATION_ITEMS } from '@/lib/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { useSpaces } from '@/lib/contexts/spaces-context';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import { useDevice } from '@/lib/contexts/DeviceContext';
import { prefetchFeatureData, prefetchCriticalData, ROUTE_TO_FEATURE_MAP } from '@/lib/services/prefetch-service';

/** Renders a hamburger menu with slide-out navigation drawer. */
export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const menuRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prefetchedDataRef = useRef<Set<string>>(new Set());
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: _user, signOut } = useAuth();
  const { currentSpace } = useSpaces();
  const { isDesktop } = useDevice();

  // Prefetch data for a feature on hover
  const prefetchData = (href: string) => {
    if (!currentSpace?.id || prefetchedDataRef.current.has(href)) return;

    const feature = ROUTE_TO_FEATURE_MAP[href];
    if (feature) {
      prefetchedDataRef.current.add(href);
      prefetchFeatureData(queryClient, feature, currentSpace.id).catch(console.error);
    }
  };

  // Prefetch all data when menu opens
  useEffect(() => {
    if (isOpen && currentSpace?.id) {
      // Prefetch all feature data for instant navigation
      prefetchCriticalData(queryClient, currentSpace.id).catch(console.error);
    }
  }, [isOpen, queryClient, currentSpace?.id]);

  // Mount check for portal
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Calculate menu position relative to button for desktop
  useEffect(() => {
    if (isOpen && buttonRef.current && isDesktop) {
      const rect = buttonRef.current.getBoundingClientRect();

      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 8, // 8px gap below button
        right: window.innerWidth - rect.right, // Align right edge with button's right edge
      });
    } else {

      setMenuStyle({});
    }
  }, [isOpen, isDesktop]);

  // Close menu when route changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOpen(false);
  }, [pathname]);

  // Lock scroll on the correct scroll container (main element)
  useScrollLock(isOpen);

  // Close menu when clicking outside - check both button container AND portal content
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isInsideButton = menuRef.current?.contains(target);
      const isInsidePortal = portalRef.current?.contains(target);

      // Only close if click is outside BOTH the button and the portal menu
      if (!isInsideButton && !isInsidePortal) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Hamburger Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-lg transition-colors active:scale-95 cursor-pointer flex items-center justify-center"
        aria-label="Menu"
        title="Menu"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-gray-300" />
        ) : (
          <Menu className="w-5 h-5 text-gray-300" />
        )}
      </button>

      {/* Mobile: Full-Screen Overlay | Desktop: Dropdown - Rendered via Portal */}
      {mounted && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div ref={portalRef}>
              {/* Mobile Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 z-[60] sm:hidden"
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
              />

              {/* Mobile Menu Panel - Full Screen Slide-in */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed inset-0 bg-gray-900 z-[60] flex flex-col sm:hidden"
              >
                {/* Mobile Header with Logo */}
                <div className="flex-shrink-0 flex items-center justify-between px-6 py-6 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <Image
                      src="/rowan-logo.png"
                      alt="Rowan Logo"
                      width={40}
                      height={40}
                      className="w-10 h-10"
                    />
                    <span className="text-xl font-semibold gradient-text">Rowan</span>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-800 transition-colors active:scale-95"
                    aria-label="Close menu"
                  >
                    <X className="w-6 h-6 text-gray-300" />
                  </button>
                </div>

                {/* Mobile Menu Content - Scrollable */}
                <div className="flex-1 overflow-y-auto overscroll-contain">
                  <nav className="px-4 py-6 space-y-1">
                    {NAVIGATION_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const hasHash = item.href.includes('#');

                      const handleClick = (e: React.MouseEvent) => {
                        setIsOpen(false);
                        if (hasHash) {
                          e.preventDefault();
                          const [path, hash] = item.href.split('#');
                          const targetPath = path || '/dashboard';
                          if (pathname === targetPath || (pathname === '/' && targetPath === '/dashboard')) {
                            setTimeout(() => {
                              const element = document.getElementById(hash);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }, 100);
                          } else {
                            router.push(item.href);
                          }
                        }
                      };

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          onClick={handleClick}
                          onTouchStart={() => prefetchData(item.href)}
                          className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors active:scale-[0.98] min-h-[48px]"
                        >
                          <div className={`w-10 h-10 rounded-lg ${item.gradient} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <span className="text-base font-medium text-white">
                            {item.name}
                          </span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>

                {/* Mobile Footer - Settings & Sign Out */}
                <div className="flex-shrink-0 border-t border-gray-800 px-4 py-4 space-y-1">
                  <Link
                    href="/settings"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors active:scale-[0.98] min-h-[48px]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <span className="text-base font-medium text-white">
                      Settings
                    </span>
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors active:scale-[0.98] min-h-[48px]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    </div>
                    <span className="text-base font-medium text-white">
                      Sign Out
                    </span>
                  </button>
                </div>
              </motion.div>

              {/* Desktop Menu Panel - Unchanged */}
              <div
                className={`hidden sm:flex shadow-2xl z-[60] flex-col animate-in bg-gray-900 w-80 max-h-[calc(100vh-5rem)] rounded-xl border border-gray-700 slide-in-from-top-2 fade-in duration-200`}
                style={menuStyle}
              >
                {/* Desktop Content - with data prefetching */}
                <div className="flex-1 overflow-y-auto overscroll-contain py-2">
                  <div className="px-4 py-3 sm:py-2">
                    <p className="text-sm font-semibold text-white">Features</p>
                  </div>

                  <nav className="space-y-0">
                    {NAVIGATION_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const hasHash = item.href.includes('#');

                      const handleClick = (e: React.MouseEvent) => {
                        setIsOpen(false);
                        if (hasHash) {
                          e.preventDefault();
                          const [path, hash] = item.href.split('#');
                          const targetPath = path || '/dashboard';
                          if (pathname === targetPath || (pathname === '/' && targetPath === '/dashboard')) {
                            setTimeout(() => {
                              const element = document.getElementById(hash);
                              if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }, 100);
                          } else {
                            router.push(item.href);
                          }
                        }
                      };

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={true}
                          onClick={handleClick}
                          onMouseEnter={() => prefetchData(item.href)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors active:scale-[0.98] group"
                        >
                          <div className={`w-10 h-10 rounded-lg ${item.gradient} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {item.description}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
