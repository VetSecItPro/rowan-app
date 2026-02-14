'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Receipt,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react';

const budgetTabs = [
  {
    id: 'overview',
    label: 'Overview',
    href: '/budget',
    icon: LayoutDashboard,
  },
  {
    id: 'bills',
    label: 'Bills',
    href: '/budget/bills',
    icon: Receipt,
  },
  {
    id: 'recurring',
    label: 'Recurring',
    href: '/budget/recurring',
    icon: RefreshCw,
  },
  {
    id: 'goals',
    label: 'Goals',
    href: '/budget/goals',
    icon: Target,
  },
  {
    id: 'vendors',
    label: 'Vendors',
    href: '/budget/vendors',
    icon: Users,
  },
] as const;

/** Renders the tab navigation bar for switching between budget sub-views. */
export function BudgetTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab from the current pathname
  const activeTab = (() => {
    if (!pathname) return 'overview';
    if (pathname === '/budget') return 'overview';
    if (pathname.startsWith('/budget/bills')) return 'bills';
    if (pathname.startsWith('/budget/recurring')) return 'recurring';
    if (pathname.startsWith('/budget/goals')) return 'goals';
    if (pathname.startsWith('/budget/vendors')) return 'vendors';
    if (pathname.startsWith('/budget/projects')) return 'overview';
    return 'overview';
  })();

  return (
    <div className="w-full bg-gray-900/95 border-b border-gray-800/50 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4">
        <div
          className="flex gap-1 overflow-x-auto py-3 scrollbar-hide -mx-4 px-4"
          role="tablist"
          aria-label="Budget sections"
        >
          {budgetTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                aria-label={`${tab.label} section`}
                onClick={() => router.push(tab.href)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-lg whitespace-nowrap transition-colors duration-200 flex-shrink-0 min-h-[44px] text-sm font-medium ${
                  isActive
                    ? 'text-amber-400'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>

                {/* Active indicator with layoutId for smooth sliding */}
                {isActive && (
                  <motion.div
                    layoutId="budget-tab-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-full"
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 30,
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
