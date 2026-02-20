'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Users, X, UserPlus } from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rowan_invite_dismissed';

// ─── Helper Functions ─────────────────────────────────────────────────────────

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function setDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 300,
      duration: 0.4,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -10,
    transition: { duration: 0.2, ease: 'easeIn' as const },
  },
};

// ─── Component Props ───────────────────────────────────────────────────────────

interface InviteHouseholdPromptProps {
  /** Number of members in the current space */
  memberCount: number;
}

// ─── InviteHouseholdPrompt Component ───────────────────────────────────────────

/**
 * Displays a dismissible prompt encouraging single-user households to invite family members.
 * Only shows when:
 * - The space has exactly 1 member (just the user)
 * - The user hasn't previously dismissed it (tracked in localStorage)
 */
export function InviteHouseholdPrompt({ memberCount }: InviteHouseholdPromptProps) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissedState] = useState(true); // Start true to avoid flash

  // Hydration safety — one-time mount flag
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setHydrated(true);
    setDismissedState(isDismissed());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Determine if prompt should be visible
  const shouldShow = useMemo(
    () => hydrated && !dismissed && memberCount === 1,
    [hydrated, dismissed, memberCount]
  );

  const handleDismiss = () => {
    setDismissedState(true);
    setDismissed();
  };

  const handleInvite = () => {
    // Navigate to settings with hash to open the People section
    router.push('/settings#people');
  };

  // Don't render anything server-side or if dismissed or multiple members
  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative bg-gradient-to-br from-amber-900/10 via-orange-900/10 to-amber-900/5 rounded-xl border-2 border-amber-700/30 shadow-lg overflow-hidden hover:border-amber-600/40 transition-colors"
      >
        {/* Gradient accent bar */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />

        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                Better together
              </h3>
              <p className="text-sm text-gray-300 mb-3">
                Rowan works best when your whole family is on board. Share tasks, meals, and more.
              </p>

              {/* CTA Button */}
              <button
                onClick={handleInvite}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]"
              >
                <UserPlus className="w-4 h-4" />
                Invite Members
              </button>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-2 hover:bg-gray-700/50 rounded-lg transition-colors group"
              aria-label="Dismiss invite prompt"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
