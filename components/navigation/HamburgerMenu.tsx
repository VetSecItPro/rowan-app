'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, Search, Command as CommandIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { NAVIGATION_ITEMS } from '@/lib/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
// import { useCommandPaletteTrigger } from '@/hooks/useCommandPalette'; // Temporarily disabled

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [isDesktop, setIsDesktop] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  // const { trigger } = useCommandPaletteTrigger(); // Temporarily disabled

  // Mount check for portal and detect desktop
  useEffect(() => {
    setMounted(true);
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 640);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => {
      setMounted(false);
      window.removeEventListener('resize', checkDesktop);
    };
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
          <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        ) : (
          <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {/* Mobile: Full-Screen Overlay | Desktop: Dropdown - Rendered via Portal */}
      {isOpen && mounted && createPortal(
        <div ref={portalRef}>
          {/* Mobile Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[9998] sm:hidden animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div
            className={`bg-white dark:bg-gray-900 shadow-2xl z-[9999] flex flex-col animate-in ${
              isDesktop
                ? 'w-80 max-h-[calc(100vh-5rem)] rounded-xl border border-gray-200 dark:border-gray-700 slide-in-from-top-2 fade-in duration-200'
                : 'fixed inset-y-0 right-0 w-full max-w-sm slide-in-from-right duration-300'
            }`}
            style={menuStyle}
          >
            {/* Mobile Header - Sticky at top */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sm:hidden pt-safe">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            {/* Menu Content - Scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain py-2">
              {/* Command Palette Trigger - Temporarily disabled */}
              {/*
              <div className="px-4 py-3 sm:py-2 border-b border-gray-200 dark:border-gray-800">
                <button
                  onClick={() => {
                    trigger();
                    setIsOpen(false);
                  }}
                  className="btn-touch w-full flex items-center gap-3 px-4 py-4 sm:py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.98] group rounded-lg"
                >
                  <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Search className="w-6 h-6 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-base sm:text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Command Palette
                    </p>
                    <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-400 truncate">
                      Quick access to all features
                    </p>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium text-gray-700 dark:text-gray-300">
                    <CommandIcon className="w-3 h-3" />
                    K
                  </div>
                </button>
              </div>
              */}

              <div className="px-4 py-3 sm:py-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Features</p>
              </div>

              <nav className="space-y-1 sm:space-y-0">
                {NAVIGATION_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const hasHash = item.href.includes('#');

                  const handleClick = (e: React.MouseEvent) => {
                    setIsOpen(false);

                    // Handle hash navigation specially
                    if (hasHash) {
                      e.preventDefault();
                      const [path, hash] = item.href.split('#');
                      const targetPath = path || '/dashboard';

                      // If we're already on the target page, scroll directly
                      if (pathname === targetPath || (pathname === '/' && targetPath === '/dashboard')) {
                        setTimeout(() => {
                          const element = document.getElementById(hash);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }
                        }, 100);
                      } else {
                        // Navigate to page first, then scroll
                        router.push(item.href);
                      }
                    }
                  };

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleClick}
                      className="btn-touch flex items-center gap-3 px-4 py-4 sm:py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.98] group"
                    >
                      <div className={`w-11 h-11 sm:w-10 sm:h-10 rounded-lg ${item.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-6 h-6 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base sm:text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {item.name}
                        </p>
                        <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-400 truncate">
                          {item.description}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </nav>

              {/* Settings Section - Mobile Only */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 sm:hidden">
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Settings</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className="btn-touch flex items-center gap-3 px-4 py-4 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-[0.98] group"
                >
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Settings
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      Manage preferences and account
                    </p>
                  </div>
                </Link>
              </div>

              {/* Mobile: Safe Area Padding for home bar */}
              <div className="pb-safe sm:hidden" />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
