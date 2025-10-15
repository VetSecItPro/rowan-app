'use client';

import { useState, useRef, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { NAVIGATION_ITEMS } from '@/lib/navigation';

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
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
          className="btn-icon-mobile rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-72 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden animate-slide-down dropdown-mobile">
          <div className="py-2">
            <div className="px-4 py-3 sm:py-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">Features</p>
            </div>

            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 px-4 py-4 sm:py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors active:scale-[0.98] group"
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
          </div>
        </div>
      )}
    </div>
  );
}
