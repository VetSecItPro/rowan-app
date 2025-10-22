'use client';

import Link from 'next/link';
import { ChevronLeft, Home, LayoutDashboard, CheckSquare, Calendar, MessageCircle, ShoppingCart, UtensilsCrossed, Target, FolderOpen, Settings, BarChart3, Zap, Users, FileText, Bell } from 'lucide-react';

interface BreadcrumbProps {
  items?: {
    label: string;
    href?: string;
  }[];
}

// Icon mapping for different page types
const getIconForLabel = (label: string) => {
  const iconMap: { [key: string]: any } = {
    'Home': Home,
    'Dashboard': LayoutDashboard,
    'Tasks & Chores': CheckSquare,
    'Tasks': CheckSquare,
    'Chores': CheckSquare,
    'Calendar': Calendar,
    'Messages': MessageCircle,
    'Shopping': ShoppingCart,
    'Meals': UtensilsCrossed,
    'Goals': Target,
    'Projects': FolderOpen,
    'Settings': Settings,
    'Reports': BarChart3,
    'Analytics': BarChart3,
    'Reminders': Bell,
    'Recipes': UtensilsCrossed,
    'Budget': BarChart3,
    'Expenses': BarChart3,
    'Documentation': FileText,
    'Support': Users,
    'Privacy': Settings,
    'Data Privacy': Settings,
    'Audit Log': FileText,
  };

  return iconMap[label] || FileText; // Default to FileText if no match
};

export function Breadcrumb({ items = [] }: BreadcrumbProps) {
  const handleBack = () => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  };

  return (
    <nav className="px-4 sm:px-8 py-2">
      <ol className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {/* Mobile: Back Button (only show if we have items to navigate back to) */}
        {items.length > 1 && (
          <li className="sm:hidden flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleBack}
              className="btn-touch flex items-center gap-1 py-1 px-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95"
              aria-label="Go back"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-gray-400 text-sm">→</span>
          </li>
        )}

        {/* Home Link - Hidden on mobile when there are multiple items */}
        <li className={items.length > 1 ? 'hidden sm:flex flex-shrink-0' : 'flex flex-shrink-0'}>
          <Link
            href="/"
            className="inline-flex items-center gap-0.5 py-0 px-0 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all active:scale-95"
          >
            <Home className="w-4 h-4" />
            Home
          </Link>
        </li>

        {/* Dynamic Items */}
        {items?.map((item, index) => {
          const isLast = index === items.length - 1;
          const shouldHideOnMobile = items.length > 2 && index < items.length - 2;
          const IconComponent = getIconForLabel(item.label);

          return (
            <li
              key={index}
              className={`${shouldHideOnMobile ? 'hidden sm:flex' : 'flex'} items-center`}
            >
              <span className="text-gray-400 flex-shrink-0 text-sm">→</span>
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-0.5 py-0 px-0 ml-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all truncate max-w-[120px] sm:max-w-[200px] active:scale-95"
                  title={item.label}
                >
                  <IconComponent className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </Link>
              ) : (
                <span
                  className="inline-flex items-center gap-0.5 text-sm text-gray-900 dark:text-white font-medium truncate max-w-[180px] sm:max-w-none py-0 px-0 ml-1"
                  title={item.label}
                >
                  <IconComponent className="w-4 h-4 flex-shrink-0" />
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
