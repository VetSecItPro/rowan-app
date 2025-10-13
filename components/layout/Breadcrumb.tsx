'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbProps {
  items?: {
    label: string;
    href?: string;
  }[];
}

export function Breadcrumb({ items = [] }: BreadcrumbProps) {
  return (
    <nav className="px-4 sm:px-8 py-4 max-w-7xl mx-auto">
      <ol className="flex items-center gap-2 text-sm">
        {/* Home Link */}
        <li>
          <Link
            href="/"
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Home
          </Link>
        </li>

        {/* Dynamic Items */}
        {items?.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={index} className="flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-gray-400" />
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-900 dark:text-white font-medium">
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
