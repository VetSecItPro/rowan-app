'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NAVIGATION_ITEMS, type NavItem } from '@/lib/navigation';

const SIDEBAR_STORAGE_KEY = 'sidebar-expanded';

// Memoized nav item for performance
const NavItemComponent = memo(function NavItemComponent({
  item,
  isActive,
  isExpanded,
}: {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
}) {
  const Icon = item.icon;

  return (
    <li>
      <Link
        href={item.href}
        prefetch={true}
        className={`group relative flex items-center gap-3 px-2 py-2.5 rounded-xl transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-800/50 shadow-sm'
            : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
        }`}
      >
        {/* Icon with gradient background */}
        <div
          className={`relative flex-shrink-0 w-9 h-9 rounded-xl ${item.gradient} flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-105 ${
            isActive ? 'shadow-lg ring-2 ring-white/20' : ''
          }`}
        >
          <Icon className="w-[18px] h-[18px] text-white drop-shadow-sm" />
          {isActive && (
            <div className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />
          )}
        </div>

        {/* Label with smooth width transition */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isExpanded ? 'w-36 opacity-100' : 'w-0 opacity-0'
          }`}
        >
          <p
            className={`text-sm font-semibold truncate ${
              isActive
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
            }`}
          >
            {item.name}
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
            {item.description}
          </p>
        </div>

        {/* Tooltip - only show when collapsed */}
        {!isExpanded && (
          <div className="pointer-events-none absolute left-full ml-3 px-3 py-2 bg-gray-900/95 dark:bg-gray-800/95 backdrop-blur-sm text-white text-sm rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap z-50 shadow-xl border border-white/10">
            <p className="font-semibold">{item.name}</p>
            <p className="text-[11px] text-gray-400">{item.description}</p>
            <div className="absolute left-0 top-1/2 -translate-x-[5px] -translate-y-1/2 w-2.5 h-2.5 bg-gray-900/95 dark:bg-gray-800/95 rotate-45 border-l border-b border-white/10" />
          </div>
        )}

        {/* Active indicator bar */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-500 rounded-r-full shadow-lg shadow-blue-500/30" />
        )}
      </Link>
    </li>
  );
});

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(false); // Start collapsed for faster initial render
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Load saved state from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) {
      setIsExpanded(saved === 'true');
    }
  }, []);

  // Memoize toggle function
  const toggleSidebar = useMemo(() => () => {
    setIsExpanded(prev => {
      const newState = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(newState));
      return newState;
    });
  }, []);

  // Memoize active states
  const activeStates = useMemo(() => {
    return NAVIGATION_ITEMS.map(item =>
      pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
    );
  }, [pathname]);

  // Render placeholder during SSR to prevent layout shift
  if (!mounted) {
    return (
      <aside className="hidden md:flex flex-col h-screen sticky top-0 w-[60px] bg-white/60 dark:bg-gray-900/60 border-r border-gray-200/30 dark:border-gray-800/30" />
    );
  }

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-gradient-to-b from-white/90 via-white/80 to-gray-50/90 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-gray-950/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/30 transition-all duration-300 ease-out shadow-xl shadow-gray-200/20 dark:shadow-black/20 ${
        isExpanded ? 'w-56' : 'w-[60px]'
      }`}
    >
      {/* Header with subtle branding */}
      <div className={`flex items-center h-14 px-3 border-b border-gray-200/50 dark:border-gray-700/30 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
        {isExpanded && (
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Features
          </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
        <ul className="space-y-1 px-2">
          {NAVIGATION_ITEMS.map((item, index) => (
            <NavItemComponent
              key={item.href}
              item={item}
              isActive={activeStates[index]}
              isExpanded={isExpanded}
            />
          ))}
        </ul>
      </nav>

      {/* Footer gradient fade */}
      <div className="h-8 bg-gradient-to-t from-white/80 dark:from-gray-900/80 to-transparent pointer-events-none" />
    </aside>
  );
}
