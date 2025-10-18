'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAVIGATION_ITEMS } from '@/lib/navigation';

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when menu is open on mobile
  useEffect(() => {
    if (isOpen) {
      // Lock scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // Unlock scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Close menu when clicking outside (desktop only)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
      {/* Hamburger Button with Tooltip */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="btn-touch btn-icon-mobile rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors active:scale-95 cursor-pointer flex items-center justify-center"
          aria-label="Menu"
        >
          {isOpen ? (
            <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          )}
        </button>

        {/* Tooltip */}
        {showTooltip && !isOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap z-50 pointer-events-none">
            Menu
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
          </div>
        )}
      </div>

      {/* Mobile: Full-Screen Overlay | Desktop: Dropdown */}
      {isOpen && (
        <>
          {/* Mobile Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 sm:hidden animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu Panel */}
          <div className="fixed inset-y-0 right-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto overscroll-contain sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-2 sm:w-80 sm:max-w-none sm:rounded-xl sm:border sm:border-gray-200 sm:dark:border-gray-700 animate-in slide-in-from-right duration-300 sm:slide-in-from-top-2 sm:fade-in sm:duration-200">
            {/* Mobile Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 sm:hidden">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </button>
            </div>

            {/* Menu Content */}
            <div className="py-2">
              <div className="px-4 py-3 sm:py-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Features</p>
              </div>

              <nav className="space-y-1 sm:space-y-0">
                {NAVIGATION_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
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

              {/* Mobile: Safe Area Padding */}
              <div className="h-safe sm:hidden" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
