'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
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
} from 'lucide-react';
import { TasksDemo } from './feature-demos/TasksDemo';
import { CalendarDemo } from './feature-demos/CalendarDemo';
import { RemindersDemo } from './feature-demos/RemindersDemo';
import { MessagesDemo } from './feature-demos/MessagesDemo';
import { ShoppingDemo } from './feature-demos/ShoppingDemo';
import { MealsDemo } from './feature-demos/MealsDemo';
import { BudgetDemo } from './feature-demos/BudgetDemo';
import { GoalsDemo } from './feature-demos/GoalsDemo';
import { ChoresDemo } from './feature-demos/ChoresDemo';
import { CheckInDemo } from './feature-demos/CheckInDemo';

// ── Feature Definitions (dashboard names, consolidated) ─────────

const features = [
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
    description: 'Keep everyone in sync with a family calendar that shows who\'s where, when.',
    bullets: [
      'See everyone\'s schedule at a glance',
      'Color-coded by family member',
      'Drag to reschedule instantly',
    ],
  },
  {
    name: 'Reminders',
    slug: 'reminders',
    icon: Bell,
    gradient: 'from-pink-500 to-rose-500',
    color: 'pink-500',
    description: 'Never miss a pickup, appointment, or important moment with intelligent reminders.',
    bullets: [
      'Never miss a pickup or appointment',
      'Set one-time or recurring',
      'Notification to the right person',
    ],
  },
  {
    name: 'Messages',
    slug: 'messages',
    icon: MessageCircle,
    gradient: 'from-green-500 to-emerald-500',
    color: 'green-500',
    description: 'Keep family conversations in one place — no more chaotic group texts.',
    bullets: [
      'Private family chat built in',
      'Pin important messages',
      'No group text chaos',
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
    name: 'Budget',
    slug: 'budget',
    icon: Wallet,
    gradient: 'from-amber-500 to-yellow-500',
    color: 'amber-500',
    description: 'Track household spending, manage budgets, and see where your money goes.',
    bullets: [
      'Track spending by category',
      'See where money actually goes',
      'Bill reminders before due dates',
    ],
  },
  {
    name: 'Goals',
    slug: 'goals',
    icon: Target,
    gradient: 'from-indigo-500 to-blue-500',
    color: 'indigo-500',
    description: 'Set family goals, track progress together, and celebrate achievements.',
    bullets: [
      'Set family goals together',
      'Track progress with streaks',
      'Celebrate milestones as a team',
    ],
  },
  {
    name: 'Check-In',
    slug: 'daily-check-in',
    icon: Heart,
    gradient: 'from-yellow-500 to-rose-500',
    color: 'yellow-500',
    description: 'Quick daily mood and energy check to stay connected with your family.',
    bullets: [
      'Quick daily mood and energy check',
      'See how your family is doing',
      'Build connection through consistency',
    ],
  },
];

// ── Demo component map ────────────────────────────────────────────

const demoMap: Record<string, React.ReactNode> = {
  tasks: <TasksDemo />,
  calendar: <CalendarDemo />,
  reminders: <RemindersDemo />,
  messages: <MessagesDemo />,
  shopping: <ShoppingDemo />,
  meals: <MealsDemo />,
  budget: <BudgetDemo />,
  goals: <GoalsDemo />,
  'daily-check-in': <CheckInDemo />,
};

// ── Color class lookups (Tailwind can't purge dynamic classes) ────

const textColorMap: Record<string, string> = {
  'blue-500': 'text-blue-500',
  'purple-500': 'text-purple-500',
  'pink-500': 'text-pink-500',
  'green-500': 'text-green-500',
  'emerald-500': 'text-emerald-500',
  'orange-500': 'text-orange-500',
  'amber-500': 'text-amber-500',
  'indigo-500': 'text-indigo-500',
  'yellow-500': 'text-yellow-500',
};

// Brand color button styles (inactive state: subtle bg + colored text/icon)
const btnColorMap: Record<string, string> = {
  'blue-500': 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25',
  'purple-500': 'bg-purple-500/15 text-purple-400 border-purple-500/30 hover:bg-purple-500/25',
  'pink-500': 'bg-pink-500/15 text-pink-400 border-pink-500/30 hover:bg-pink-500/25',
  'green-500': 'bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25',
  'emerald-500': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25',
  'orange-500': 'bg-orange-500/15 text-orange-400 border-orange-500/30 hover:bg-orange-500/25',
  'amber-500': 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25',
  'indigo-500': 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25',
  'yellow-500': 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/25',
};

// ── Feature Navigation Strip ──────────────────────────────────────

function FeatureNav({ activeFeature }: { activeFeature: string }) {
  const scrollToFeature = (slug: string) => {
    const element = document.getElementById(`feature-${slug}`);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="sticky top-16 z-40 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-center gap-1.5 py-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isActive = activeFeature === feature.slug;
            return (
              <button
                key={feature.slug}
                onClick={() => scrollToFeature(feature.slug)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full whitespace-nowrap transition-all duration-300 border text-xs font-medium ${
                  isActive
                    ? `bg-gradient-to-r ${feature.gradient} text-white border-transparent shadow-lg`
                    : btnColorMap[feature.color] || 'bg-gray-800/50 text-gray-400 border-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{feature.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Feature Section ───────────────────────────────────────────────

function FeatureSection({
  feature,
  index,
}: {
  feature: (typeof features)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const Icon = feature.icon;
  const isOdd = index % 2 === 0;

  // For the consolidated Tasks & Chores section, show both demos
  const isTasksAndChores = feature.slug === 'tasks';

  return (
    <section
      id={`feature-${feature.slug}`}
      ref={ref}
      className="py-20 scroll-mt-32"
    >
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
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 mb-6`}
            >
              <div className="w-full h-full rounded-2xl bg-gray-900 flex items-center justify-center">
                <Icon className="w-8 h-8 text-white" />
              </div>
            </div>

            <h3 className="text-3xl font-bold text-white mb-4">{feature.name}</h3>
            <p className="text-lg text-gray-400 mb-6">{feature.description}</p>

            <ul className="space-y-3">
              {feature.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <Check className={`w-5 h-5 ${textColorMap[feature.color] || 'text-blue-500'} flex-shrink-0 mt-0.5`} />
                  <span className="text-gray-500">{bullet}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Demo Side */}
          <motion.div
            initial={{ opacity: 0, x: isOdd ? 30 : -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`${isOdd ? 'md:order-2' : 'md:order-1'} ${isTasksAndChores ? 'space-y-4' : ''}`}
          >
            {isTasksAndChores ? (
              <>
                <TasksDemo />
                <ChoresDemo />
              </>
            ) : (
              demoMap[feature.slug] || (
                <div className="aspect-video rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center">
                  <span className="text-gray-600">Demo: {feature.name}</span>
                </div>
              )
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ── Main Component ────────────────────────────────────────────────

export function FeatureGrid() {
  const [activeFeature, setActiveFeature] = useState(features[0].slug);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const slug = entry.target.id.replace('feature-', '');
            setActiveFeature(slug);
          }
        });
      },
      {
        rootMargin: '-120px 0px -60% 0px',
        threshold: 0,
      }
    );

    features.forEach((feature) => {
      const element = document.getElementById(`feature-${feature.slug}`);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="relative">
      {/* Section heading */}
      <div className="text-center py-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-4xl sm:text-5xl font-bold text-white mb-4"
        >
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Everything Your Household Needs
          </span>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl text-gray-400 max-w-2xl mx-auto px-4"
        >
          All the tools your family needs to stay organized, connected, and stress-free.
        </motion.p>
      </div>

      {/* Feature navigation strip */}
      <FeatureNav activeFeature={activeFeature} />

      {/* Feature sections */}
      <div className="relative">
        {features.map((feature, index) => (
          <FeatureSection key={feature.slug} feature={feature} index={index} />
        ))}
      </div>
    </section>
  );
}
