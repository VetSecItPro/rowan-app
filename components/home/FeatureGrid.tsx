'use client';

import { motion, useInView, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';
import {
  CheckSquare,
  Calendar,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  Wallet,
  Target,
  Heart,
  Check,
  ChevronDown,
} from 'lucide-react';
import { TasksDemo } from './feature-demos/TasksDemo';
import { CalendarDemo } from './feature-demos/CalendarDemo';
import { ShoppingDemo } from './feature-demos/ShoppingDemo';
import { MealsDemo } from './feature-demos/MealsDemo';
import { ChoresDemo } from './feature-demos/ChoresDemo';

// ── Feature Definitions ─────────────────────────────────────────

interface Feature {
  name: string;
  slug: string;
  icon: typeof CheckSquare;
  gradient: string;
  color: string;
  description: string;
  bullets: string[];
}

// Primary 4 — full feature sections with demos
const primaryFeatures: Feature[] = [
  {
    name: 'Tasks & Chores',
    slug: 'tasks',
    icon: CheckSquare,
    gradient: 'from-blue-500 to-cyan-500',
    color: 'blue-500',
    description: 'Assign tasks and chores to family members, track progress, and keep everyone accountable.',
    bullets: [
      'Assign to family members with due dates',
      'Fair chore rotation with points system',
      'Track progress in real-time',
    ],
  },
  {
    name: 'Calendar',
    slug: 'calendar',
    icon: Calendar,
    gradient: 'from-purple-500 to-indigo-500',
    color: 'purple-500',
    description: "Keep everyone in sync with a family calendar that shows who's where, when.",
    bullets: [
      "See everyone's schedule at a glance",
      'Color-coded by family member',
      'Drag to reschedule instantly',
    ],
  },
  {
    name: 'Meals',
    slug: 'meals',
    icon: UtensilsCrossed,
    gradient: 'from-orange-500 to-amber-500',
    color: 'orange-500',
    description: 'Plan your meals for the week and stop asking "what\'s for dinner?"',
    bullets: [
      'Plan the whole week in minutes',
      'Save and reuse favorite recipes',
      'Auto-generate grocery lists',
    ],
  },
  {
    name: 'Shopping',
    slug: 'shopping',
    icon: ShoppingCart,
    gradient: 'from-emerald-500 to-teal-500',
    color: 'emerald-500',
    description: 'Collaborative shopping lists that sync in real-time across all devices.',
    bullets: [
      'Shared lists that update live',
      'Check items off in-store',
      'Auto-suggest frequent items',
    ],
  },
];

// Secondary 5 — compact cards
const secondaryFeatures = [
  {
    name: 'Budget',
    icon: Wallet,
    gradient: 'from-amber-500 to-yellow-500',
    oneLiner: 'Track spending, manage budgets, see where your money goes.',
  },
  {
    name: 'Goals',
    icon: Target,
    gradient: 'from-indigo-500 to-blue-500',
    oneLiner: 'Set family goals, track progress together, celebrate milestones.',
  },
  {
    name: 'Reminders',
    icon: Bell,
    gradient: 'from-pink-500 to-rose-500',
    oneLiner: 'Never miss a pickup, appointment, or important moment.',
  },
  {
    name: 'Messages',
    icon: MessageCircle,
    gradient: 'from-green-500 to-emerald-500',
    oneLiner: 'Private family chat. No more chaotic group texts.',
  },
  {
    name: 'Check-In',
    icon: Heart,
    gradient: 'from-yellow-500 to-rose-500',
    oneLiner: 'Quick daily mood and energy check to stay connected.',
  },
];

// Demo map for primary features
const demoMap: Record<string, React.ReactNode> = {
  tasks: (
    <div className="space-y-4">
      <TasksDemo />
      <ChoresDemo />
    </div>
  ),
  calendar: <CalendarDemo />,
  meals: <MealsDemo />,
  shopping: <ShoppingDemo />,
};

// ── Color lookups (Tailwind can't purge dynamic classes) ────────

const textColorMap: Record<string, string> = {
  'blue-500': 'text-blue-500',
  'purple-500': 'text-purple-500',
  'emerald-500': 'text-emerald-500',
  'orange-500': 'text-orange-500',
};

// ── Feature Section ─────────────────────────────────────────────

function FeatureSection({
  feature,
  index,
}: {
  feature: Feature;
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const Icon = feature.icon;
  const isOdd = index % 2 === 0;

  return (
    <section ref={ref} className="py-16 sm:py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Text Side */}
          <motion.div
            initial={{ opacity: 0, x: isOdd ? -30 : 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={`${isOdd ? 'md:order-1' : 'md:order-2'}`}
          >
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 mb-5`}
            >
              <div className="w-full h-full rounded-2xl bg-gray-900 flex items-center justify-center">
                <Icon className="w-7 h-7 text-white" />
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">{feature.name}</h3>
            <p className="text-base sm:text-lg text-gray-400 mb-5">{feature.description}</p>

            <ul className="space-y-2.5">
              {feature.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <Check
                    className={`w-4 h-4 ${textColorMap[feature.color] || 'text-blue-500'} flex-shrink-0 mt-0.5`}
                  />
                  <span className="text-sm text-gray-400">{bullet}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Demo Side */}
          <motion.div
            initial={{ opacity: 0, x: isOdd ? 30 : -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`${isOdd ? 'md:order-2' : 'md:order-1'}`}
          >
            {demoMap[feature.slug] || (
              <div className="aspect-video rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
                <span className="text-gray-600">Demo: {feature.name}</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Main Component ──────────────────────────────────────────────

/** Displays a responsive grid of feature cards on the landing page. */
export function FeatureGrid() {
  const [showAll, setShowAll] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  return (
    <section id="features" className="relative">
      {/* Section heading */}
      <div className="text-center py-12 sm:py-16 px-4">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
        >
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Everything Your Household Needs
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, delay: 0.2 }}
          className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto"
        >
          All the tools your family needs to stay organized, connected, and stress-free.
        </motion.p>
      </div>

      {/* Primary feature sections */}
      {primaryFeatures.map((feature, index) => (
        <FeatureSection key={feature.slug} feature={feature} index={index} />
      ))}

      {/* "See All Features" expandable */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <motion.button
          onClick={() => setShowAll(!showAll)}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 mx-auto px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
        >
          {showAll ? 'Show Less' : `See All ${primaryFeatures.length + secondaryFeatures.length} Features`}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-300 ${showAll ? 'rotate-180' : ''}`}
          />
        </motion.button>

        <AnimatePresence>
          {showAll && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.4 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                {secondaryFeatures.map((feature, i) => {
                  const Icon = feature.icon;
                  return (
                    <motion.div
                      key={feature.name}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: prefersReducedMotion ? 0.01 : 0.3,
                        delay: prefersReducedMotion ? 0 : i * 0.06,
                      }}
                      className="rounded-xl bg-gray-800/40 border border-gray-700/30 p-5 flex items-start gap-4"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.gradient} p-0.5 shrink-0`}
                      >
                        <div className="w-full h-full rounded-xl bg-gray-900 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-1">{feature.name}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed">{feature.oneLiner}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
