/**
 * BottomNav — Mobile bottom tab bar
 *
 * 5 tabs: Home, Tasks, Rowan (AI Chat, center), Calendar, More
 * Only visible on mobile (< md breakpoint).
 * Center AI tab is visually differentiated with a blue circle.
 * Haptic feedback on native platforms via Capacitor.
 */

'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Home,
  CheckSquare,
  Bot,
  Calendar,
  MoreHorizontal,
  Lock,
} from 'lucide-react';
import { useChatContextSafe } from '@/lib/contexts/chat-context';
import { triggerHaptic, ImpactStyle } from '@/lib/native/haptics';

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

interface BottomTab {
  id: string;
  label: string;
  icon: typeof Home;
  href: string | null; // null = action-based (not navigation)
  activeColor: string;
}

const TABS: BottomTab[] = [
  { id: 'home', label: 'Home', icon: Home, href: '/dashboard', activeColor: 'text-emerald-400' },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, href: '/tasks', activeColor: 'text-blue-400' },
  { id: 'rowan', label: 'Rowan', icon: Bot, href: null, activeColor: 'text-white' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/calendar', activeColor: 'text-purple-400' },
  { id: 'more', label: 'More', icon: MoreHorizontal, href: '/settings', activeColor: 'text-gray-300' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BottomNav() {
  const pathname = usePathname();
  const chatCtx = useChatContextSafe();

  function isActive(tab: BottomTab): boolean {
    if (!tab.href) return false;
    if (tab.href === '/dashboard') {
      return pathname === '/dashboard' || pathname === '/';
    }
    return pathname?.startsWith(tab.href) ?? false;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-gray-900/95 backdrop-blur-xl border-t border-gray-700/30 pb-safe"
      role="tablist"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around h-14 px-2">
        {TABS.map((tab) => {
          const active = isActive(tab);
          const isCenter = tab.id === 'rowan';
          const Icon = tab.icon;
          const showUnread = tab.id === 'rowan' && chatCtx?.hasUnread;
          const hasAIAccess = chatCtx?.canAccessAI ?? false;

          // Center AI tab — action button (not navigation)
          if (isCenter) {
            const isLocked = !hasAIAccess;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  triggerHaptic(ImpactStyle.Light);
                  if (isLocked) {
                    chatCtx?.promptUpgrade();
                  } else {
                    chatCtx?.toggleChat();
                  }
                }}
                className="relative flex flex-col items-center justify-center flex-1 h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-lg"
                role="tab"
                aria-label={isLocked ? 'Upgrade to Pro for AI' : 'Open AI chat'}
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className={`relative -mt-3 w-12 h-12 rounded-full flex items-center justify-center shadow-lg ${
                    isLocked
                      ? 'bg-gray-700 shadow-gray-700/20'
                      : 'bg-blue-600 shadow-blue-600/30'
                  }`}
                >
                  <Icon className={`w-6 h-6 ${isLocked ? 'text-gray-400' : 'text-white'}`} />

                  {/* Lock badge for free users */}
                  {isLocked && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-gray-600 rounded-full border-2 border-gray-900 flex items-center justify-center">
                      <Lock className="w-2.5 h-2.5 text-gray-300" />
                    </span>
                  )}

                  {/* Unread badge */}
                  {!isLocked && showUnread && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-gray-900 flex items-center justify-center"
                    >
                      <span className="w-1.5 h-1.5 bg-white rounded-full" />
                    </motion.span>
                  )}
                </motion.div>

                {isLocked && (
                  <span className="text-[8px] text-gray-500 mt-0.5">Pro</span>
                )}
              </button>
            );
          }

          // Navigation tabs use Link
          return (
            <Link
              key={tab.id}
              href={tab.href!}
              onClick={() => triggerHaptic(ImpactStyle.Light)}
              className="relative flex flex-col items-center justify-center flex-1 h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-lg"
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                className="flex flex-col items-center gap-0.5"
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    active ? tab.activeColor : 'text-gray-500'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors ${
                    active ? tab.activeColor : 'text-gray-500'
                  }`}
                >
                  {tab.label}
                </span>
              </motion.div>

              {/* Active indicator dot */}
              {active && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className={`absolute bottom-0.5 w-1 h-1 rounded-full ${tab.activeColor.replace('text-', 'bg-')}`}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
