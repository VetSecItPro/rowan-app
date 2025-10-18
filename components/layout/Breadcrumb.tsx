'use client';

import Link from 'next/link';
import { ChevronRight, ChevronLeft } from 'lucide-react';

interface BreadcrumbProps {
  items?: {
    label: string;
    href?: string;
  }[];
}

export function Breadcrumb({ items = [] }: BreadcrumbProps) {
  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <nav className="px-4 sm:px-8 py-4">
      <ol className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {/* Mobile: Back Button (only show if we have items to navigate back to) */}
        {items.length > 1 && (
          <li className="sm:hidden flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleBack}
              className="btn-touch flex items-center gap-1 py-2 px-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95"
              aria-label="Go back"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </li>
        )}

        {/* Home Link - Hidden on mobile when there are multiple items */}
        <li className={items.length > 1 ? 'hidden sm:block flex-shrink-0' : 'flex-shrink-0'}>
          <Link
            href="/"
            className="btn-touch inline-block py-2 px-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95"
          >
            Home
          </Link>
        </li>

        {/* Dynamic Items */}
        {items?.map((item, index) => {
          const isLast = index === items.length - 1;
          const isSecondToLast = index === items.length - 2;

          // On mobile: only show last 2 items
          const shouldHideOnMobile = items.length > 2 && index < items.length - 2;

          return (
            <li
              key={index}
              className={`flex items-center gap-1 ${shouldHideOnMobile ? 'hidden sm:flex' : 'flex'}`}
            >
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="btn-touch inline-block py-2 px-3 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all truncate max-w-[120px] sm:max-w-[200px] active:scale-95"
                  title={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="text-sm text-gray-900 dark:text-white font-medium truncate max-w-[180px] sm:max-w-none"
                  title={item.label}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
