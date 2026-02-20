'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  CheckSquare,
  Calendar,
  ShoppingCart,
  Users,
  X,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: React.ElementType;
  color: string;
}

interface OnboardingProgress {
  completedSteps: string[];
  dismissed: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'rowan_onboarding_progress';

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'create-task',
    title: 'Create your first task',
    description: 'Get organized with your to-do list',
    link: '/tasks',
    icon: CheckSquare,
    color: 'blue',
  },
  {
    id: 'setup-chore',
    title: 'Set up a chore rotation',
    description: 'Share the household workload',
    link: '/chores',
    icon: RotateCcw,
    color: 'amber',
  },
  {
    id: 'add-event',
    title: 'Add a calendar event',
    description: 'Keep your schedule in sync',
    link: '/calendar',
    icon: Calendar,
    color: 'purple',
  },
  {
    id: 'create-shopping-list',
    title: 'Create a shopping list',
    description: 'Never forget the groceries',
    link: '/shopping',
    icon: ShoppingCart,
    color: 'emerald',
  },
  {
    id: 'invite-household',
    title: 'Invite your household',
    description: 'Better together',
    link: '/settings',
    icon: Users,
    color: 'pink',
  },
];

// Color mappings for icons and backgrounds
const COLOR_CLASSES = {
  blue: {
    icon: 'text-blue-400',
    bg: 'bg-blue-900/20',
    border: 'border-blue-800/40',
    hover: 'hover:border-blue-700/60',
  },
  amber: {
    icon: 'text-amber-400',
    bg: 'bg-amber-900/20',
    border: 'border-amber-800/40',
    hover: 'hover:border-amber-700/60',
  },
  purple: {
    icon: 'text-purple-400',
    bg: 'bg-purple-900/20',
    border: 'border-purple-800/40',
    hover: 'hover:border-purple-700/60',
  },
  emerald: {
    icon: 'text-emerald-400',
    bg: 'bg-emerald-900/20',
    border: 'border-emerald-800/40',
    hover: 'hover:border-emerald-700/60',
  },
  pink: {
    icon: 'text-pink-400',
    bg: 'bg-pink-900/20',
    border: 'border-pink-800/40',
    hover: 'hover:border-pink-700/60',
  },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function loadProgress(): OnboardingProgress {
  if (typeof window === 'undefined') {
    return { completedSteps: [], dismissed: false };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { completedSteps: [], dismissed: false };
    return JSON.parse(stored);
  } catch {
    return { completedSteps: [], dismissed: false };
  }
}

function saveProgress(progress: OnboardingProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      damping: 25,
      stiffness: 300,
      staggerChildren: 0.08,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

// ─── OnboardingWidget Component ───────────────────────────────────────────────

/**
 * Displays a Quick Start checklist for new users with a 14-day Pro trial banner.
 * Shows a progress tracker and links to key features. Tracks completion state
 * in localStorage and can be dismissed permanently.
 */
export function OnboardingWidget() {
  const [progress, setProgress] = useState<OnboardingProgress>(() => loadProgress());
  const [isClient, setIsClient] = useState(false);

  // Hydration safety — one-time mount flag
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setIsClient(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const completedCount = progress.completedSteps.length;
  const totalSteps = ONBOARDING_STEPS.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  // Only show if:
  // 1. Not dismissed
  // 2. Client-side rendered (avoids hydration mismatch)
  // 3. User has completed fewer than 3 steps
  const shouldShow = useMemo(
    () => isClient && !progress.dismissed && completedCount < 3,
    [isClient, progress.dismissed, completedCount]
  );

  const handleDismiss = () => {
    const updated = { ...progress, dismissed: true };
    setProgress(updated);
    saveProgress(updated);
  };

  const handleStepClick = (stepId: string) => {
    // Mark step as completed when clicked
    if (!progress.completedSteps.includes(stepId)) {
      const updated = {
        ...progress,
        completedSteps: [...progress.completedSteps, stepId],
      };
      setProgress(updated);
      saveProgress(updated);
    }
  };

  // Don't render anything server-side or if dismissed
  if (!shouldShow) return null;

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="bg-gradient-to-br from-gray-800/60 via-purple-900/20 to-blue-900/20 rounded-xl border border-purple-700/30 shadow-lg overflow-hidden"
      >
        {/* Trial Banner */}
        <div className="bg-gradient-to-r from-purple-600/80 to-blue-600/80 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-300 flex-shrink-0" />
            <p className="text-sm sm:text-base font-semibold text-white">
              You&apos;re on your 14-day Pro trial! Explore all features.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-700/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                Quick Start
              </h3>
              <p className="text-sm text-gray-400">
                Get up and running in minutes
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors group"
              aria-label="Dismiss onboarding"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-300">
                {completedCount} of {totalSteps} complete
              </span>
              <span className="text-xs font-bold text-purple-400">
                {progressPercent}%
              </span>
            </div>
            <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Steps List */}
        <div className="p-4 sm:p-6 space-y-2">
          {ONBOARDING_STEPS.map((step) => {
            const isCompleted = progress.completedSteps.includes(step.id);
            const StepIcon = step.icon;
            const colors = COLOR_CLASSES[step.color as keyof typeof COLOR_CLASSES];

            return (
              <motion.div key={step.id} variants={itemVariants}>
                <Link
                  href={step.link}
                  onClick={() => handleStepClick(step.id)}
                  className={`group flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    isCompleted
                      ? 'bg-gray-700/40 border-gray-600/50'
                      : `${colors.bg} ${colors.border} ${colors.hover}`
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-gray-600/50'
                        : `${colors.bg} border ${colors.border}`
                    }`}
                  >
                    <StepIcon
                      className={`w-5 h-5 ${
                        isCompleted ? 'text-gray-400' : colors.icon
                      }`}
                    />
                  </div>

                  {/* Text Content */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={`text-sm font-semibold mb-0.5 ${
                        isCompleted ? 'text-gray-400 line-through' : 'text-white'
                      }`}
                    >
                      {step.title}
                    </h4>
                    <p
                      className={`text-xs ${
                        isCompleted ? 'text-gray-500' : 'text-gray-400'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>

                  {/* Completion Indicator */}
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-600 group-hover:text-gray-500 transition-colors" />
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
