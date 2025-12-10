'use client';

import { useState, useEffect, useMemo, memo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import { NAVIGATION_ITEMS, type NavItem } from '@/lib/navigation';
import { useAdmin } from '@/hooks/useAdmin';
import { TrialBadge } from '@/components/subscription';

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
        className={`group relative flex items-center gap-3 px-2.5 py-3 rounded-lg transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-900/20 dark:to-indigo-900/10 shadow-sm border border-blue-100 dark:border-blue-800/30'
            : 'hover:bg-gray-100/60 dark:hover:bg-gray-800/50 hover:shadow-sm border border-transparent'
        }`}
      >
        {/* Icon with refined gradient background and shadow */}
        <div
          className={`relative flex-shrink-0 w-10 h-10 rounded-lg ${item.gradient} flex items-center justify-center shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl ${
            isActive ? 'shadow-2xl ring-2 ring-white/30 dark:ring-white/20 scale-105' : 'shadow-md'
          }`}
          style={{
            boxShadow: isActive
              ? '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(255, 255, 255, 0.1)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1), inset 0 2px 4px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          <Icon className="w-5 h-5 text-white drop-shadow-md" />
          {isActive && (
            <div className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />
          )}
        </div>

        {/* Label with smooth width transition */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-out ${
            isExpanded ? 'w-44 opacity-100' : 'w-0 opacity-0'
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

        {/* Active indicator bar - refined */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-600 via-indigo-600 to-purple-600 rounded-r-full shadow-lg" />
        )}
      </Link>
    </li>
  );
});

export function Sidebar() {
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded by default for new users
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { isAdmin } = useAdmin();

  // Load saved state from localStorage
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved !== null) {
      setIsExpanded(saved === 'true');
    } else {
      // First time user - default to expanded and save it
      setIsExpanded(true);
      localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true');
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
      pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href))
    );
  }, [pathname]);

  // Render placeholder during SSR to prevent layout shift
  if (!mounted) {
    return (
      <aside className="hidden md:flex flex-col h-screen sticky top-0 w-64 bg-white/60 dark:bg-gray-900/60 border-r border-gray-200/30 dark:border-gray-800/30" />
    );
  }

  return (
    <aside
      className={`hidden md:flex flex-col h-screen sticky top-0 bg-gradient-to-b from-white/90 via-white/80 to-gray-50/90 dark:from-gray-900/90 dark:via-gray-900/80 dark:to-gray-950/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/30 transition-all duration-300 ease-out shadow-xl shadow-gray-200/20 dark:shadow-black/20 ${
        isExpanded ? 'w-64' : 'w-[60px]'
      }`}
    >
      {/* Header with subtle branding */}
      <div className={`flex items-center h-14 px-3 border-b border-gray-200/50 dark:border-gray-700/30 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
        {isExpanded && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Features
            </span>
            <TrialBadge />
          </div>
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
        {/* Features Section with subtle background */}
        <div className="mx-2 mb-3 rounded-xl bg-gradient-to-b from-gray-50/40 to-transparent dark:from-gray-800/20 dark:to-transparent p-2">
          <ul className="space-y-1.5">
            {NAVIGATION_ITEMS.map((item, index) => (
              <NavItemComponent
                key={item.href}
                item={item}
                isActive={activeStates[index] ?? false}
                isExpanded={isExpanded}
              />
            ))}
          </ul>
        </div>
      </nav>

      {/* Admin Section - separate from features */}
      {isAdmin && (
        <div className="mx-2 mb-2 px-2 pt-2 pb-3 border-t border-gray-200/50 dark:border-gray-700/30">
          {isExpanded && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2.5 mb-2 block">
              Admin
            </span>
          )}
          <ul className="space-y-1.5">
            <NavItemComponent
              item={{
                name: 'Admin Dashboard',
                href: '/admin/dashboard',
                icon: LayoutDashboard,
                gradient: 'bg-gradient-to-r from-orange-500 to-amber-500',
                description: 'Analytics & metrics',
              }}
              isActive={pathname === '/admin/dashboard' || (pathname?.startsWith('/admin/dashboard') ?? false)}
              isExpanded={isExpanded}
            />
          </ul>
        </div>
      )}

      {/* Footer gradient fade */}
      <div className="h-8 bg-gradient-to-t from-white/80 dark:from-gray-900/80 to-transparent pointer-events-none" />
    </aside>
  );
}
