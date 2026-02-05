'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect, type ReactNode } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Calendar,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  Wallet,
  Target,
  Sparkles,
  Heart,
  Check,
  ArrowRight,
} from 'lucide-react';

// ── Feature Definitions ───────────────────────────────────────────

const features = [
  {
    name: 'Tasks & To-Dos',
    slug: 'tasks',
    icon: CheckSquare,
    gradient: 'from-blue-500 to-cyan-500',
    color: 'blue-500',
    description: 'Assign tasks to family members, track progress, and never wonder who\'s doing what.',
    bullets: [
      'Assign to family members',
      'Set priorities and due dates',
      'Track progress in real-time',
    ],
  },
  {
    name: 'Shared Calendar',
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
    name: 'Smart Reminders',
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
    name: 'Family Messaging',
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
    name: 'Shopping Lists',
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
    name: 'Meal Planning',
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
    name: 'Budget & Expenses',
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
    name: 'Goals & Milestones',
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
    name: 'Household Chores',
    slug: 'household',
    icon: Sparkles,
    gradient: 'from-amber-500 to-orange-500',
    color: 'amber-500',
    description: 'Fair chore rotation with built-in accountability and rewards.',
    bullets: [
      'Fair rotation so nobody argues',
      'Points and rewards system',
      'Accountability without nagging',
    ],
  },
  {
    name: 'Daily Check-In',
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

// ── Mock UI Previews (reused from original) ──────────────────────

function TasksPreview() {
  const tasks = [
    { text: 'Pack school lunches', assignee: 'Mom', done: true, color: 'bg-pink-400' },
    { text: 'Take out recycling', assignee: 'Jake', done: false, color: 'bg-blue-400' },
    { text: 'Vacuum living room', assignee: 'Dad', done: false, color: 'bg-emerald-400' },
    { text: 'Walk the dog', assignee: 'Emma', done: true, color: 'bg-purple-400' },
  ];
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-2.5">
      {tasks.map((t) => (
        <div key={t.text} className="flex items-center gap-3">
          <div
            className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
              t.done ? 'bg-blue-500' : 'border-2 border-gray-600'
            }`}
          >
            {t.done && <Check className="w-3 h-3 text-white" />}
          </div>
          <span
            className={`text-sm flex-1 ${
              t.done ? 'text-gray-500 line-through' : 'text-gray-300'
            }`}
          >
            {t.text}
          </span>
          <span
            className={`w-7 h-7 rounded-full ${t.color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
          >
            {t.assignee[0]}
          </span>
        </div>
      ))}
    </div>
  );
}

function CalendarPreview() {
  const days = [
    { day: 'Mon', events: [{ text: 'Soccer', color: 'bg-blue-500' }] },
    { day: 'Tue', events: [{ text: 'PTA', color: 'bg-purple-500' }] },
    { day: 'Wed', events: [{ text: 'Dentist', color: 'bg-pink-500' }] },
    { day: 'Thu', events: [{ text: 'Date night', color: 'bg-emerald-500' }] },
    { day: 'Fri', events: [{ text: 'Movie', color: 'bg-amber-500' }] },
  ];
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
      <div className="flex gap-2">
        {days.map((d) => (
          <div key={d.day} className="flex-1 text-center">
            <div className="text-xs text-gray-500 mb-2">{d.day}</div>
            {d.events.map((e) => (
              <div
                key={e.text}
                className={`${e.color} rounded px-2 py-1 text-xs text-white font-medium truncate`}
              >
                {e.text}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function RemindersPreview() {
  const reminders = [
    { text: 'Pick up prescription', time: '2:30 PM', urgent: true },
    { text: 'Call plumber', time: 'Tomorrow 9 AM', urgent: false },
    { text: 'Renew car insurance', time: 'Feb 15', urgent: false },
  ];
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-2.5">
      {reminders.map((r) => (
        <div key={r.text} className="flex items-center gap-3">
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              r.urgent ? 'bg-pink-400' : 'bg-gray-600'
            }`}
          />
          <span className="text-sm text-gray-300 flex-1">{r.text}</span>
          <span className="text-xs text-gray-500">{r.time}</span>
        </div>
      ))}
    </div>
  );
}

function MessagesPreview() {
  const messages = [
    {
      sender: 'Sarah',
      text: 'Can someone grab milk on the way home?',
      color: 'bg-pink-400',
      align: 'left' as const,
    },
    { sender: 'Mike', text: 'On it!', color: 'bg-emerald-400', align: 'right' as const },
    {
      sender: 'Emma',
      text: 'Get OJ too please!',
      color: 'bg-purple-400',
      align: 'left' as const,
    },
  ];
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-2.5">
      {messages.map((m) => (
        <div
          key={m.text}
          className={`flex ${m.align === 'right' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-[85%] flex items-start gap-2 ${
              m.align === 'right' ? 'flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full ${m.color} flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5`}
            >
              {m.sender[0]}
            </div>
            <div
              className={`rounded-lg px-3 py-1.5 text-sm ${
                m.align === 'right'
                  ? 'bg-green-600/20 text-green-200'
                  : 'bg-gray-700/60 text-gray-300'
              }`}
            >
              {m.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ShoppingPreview() {
  const lists = [
    {
      name: 'Grocery',
      items: [
        { text: 'Milk (2%)', done: true },
        { text: 'Chicken breast', done: true },
        { text: 'Avocados (3)', done: false },
        { text: 'Greek yogurt', done: false },
      ],
    },
    {
      name: 'Target Run',
      items: [
        { text: 'Dish soap', done: false },
        { text: 'Paper towels', done: false },
        { text: 'Birthday card', done: false },
      ],
    },
  ];
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
      <div className="grid grid-cols-2 gap-4">
        {lists.map((list) => (
          <div key={list.name}>
            <div className="text-xs font-semibold text-emerald-400 mb-2">{list.name}</div>
            <div className="space-y-1.5">
              {list.items.map((item) => (
                <div key={item.text} className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 flex items-center justify-center ${
                      item.done ? 'bg-emerald-500/30' : 'border border-gray-600'
                    }`}
                  >
                    {item.done && <Check className="w-2.5 h-2.5 text-emerald-400" />}
                  </div>
                  <span
                    className={`text-xs ${
                      item.done ? 'text-gray-500 line-through' : 'text-gray-300'
                    }`}
                  >
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MealsPreview() {
  const meals = [
    { day: 'Mon', meal: 'Chicken stir-fry', emoji: '🍗' },
    { day: 'Tue', meal: 'Pasta carbonara', emoji: '🍝' },
    { day: 'Wed', meal: 'Fish tacos', emoji: '🌮' },
    { day: 'Thu', meal: 'Leftovers', emoji: '📦' },
    { day: 'Fri', meal: 'Pizza night', emoji: '🍕' },
  ];
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-2">
      {meals.map((m) => (
        <div key={m.day} className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-8 flex-shrink-0">{m.day}</span>
          <span className="text-base">{m.emoji}</span>
          <span className="text-sm text-gray-300">{m.meal}</span>
        </div>
      ))}
    </div>
  );
}

function BudgetPreview() {
  const categories = [
    { name: 'Groceries', spent: 420, budget: 600, color: 'bg-amber-500' },
    { name: 'Dining', spent: 180, budget: 250, color: 'bg-orange-500' },
    { name: 'Gas', spent: 95, budget: 150, color: 'bg-yellow-500' },
  ];
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
      {categories.map((c) => (
        <div key={c.name}>
          <div className="flex justify-between mb-1.5">
            <span className="text-sm text-gray-300">{c.name}</span>
            <span className="text-xs text-gray-500">
              ${c.spent} / ${c.budget}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${c.color} rounded-full`}
              style={{ width: `${(c.spent / c.budget) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GoalsPreview() {
  const goals = [
    { name: 'Family vacation fund', current: 2400, target: 5000, color: 'bg-indigo-500' },
    {
      name: 'Read 24 books',
      current: 7,
      target: 24,
      color: 'bg-blue-500',
      unit: 'books' as const,
    },
    {
      name: 'Run a 5K together',
      current: 6,
      target: 8,
      color: 'bg-cyan-500',
      unit: 'weeks' as const,
    },
  ];
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-3">
      {goals.map((g) => (
        <div key={g.name}>
          <div className="flex justify-between mb-1.5">
            <span className="text-sm text-gray-300">{g.name}</span>
            <span className="text-xs text-gray-500">
              {'unit' in g ? `${g.current}/${g.target}` : `$${g.current.toLocaleString()}`}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${g.color} rounded-full`}
              style={{ width: `${(g.current / g.target) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChoresPreview() {
  const chores = [
    { name: 'Dishes', assignee: 'Jake', day: 'Mon-Wed', color: 'bg-blue-400' },
    { name: 'Trash', assignee: 'Emma', day: 'Thu-Sat', color: 'bg-purple-400' },
    { name: 'Laundry', assignee: 'Mom', day: 'Sunday', color: 'bg-pink-400' },
  ];
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4 space-y-2.5">
      {chores.map((c) => (
        <div key={c.name} className="flex items-center gap-3">
          <span
            className={`w-7 h-7 rounded-full ${c.color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}
          >
            {c.assignee[0]}
          </span>
          <div className="flex-1">
            <div className="text-sm text-gray-300">{c.name}</div>
            <div className="text-xs text-gray-500">{c.day}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CheckInPreview() {
  return (
    <div className="rounded-xl bg-gray-800/60 border border-gray-700/50 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-gray-500 mb-1.5">Mood</div>
          <div className="flex items-center gap-2">
            <span className="text-xl">😊</span>
            <span className="text-sm text-gray-300">Feeling good</span>
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1.5">Energy</div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`w-5 h-2 rounded-full ${
                  i <= 3 ? 'bg-orange-400' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <div className="text-xs text-gray-500 mb-1.5">Today&apos;s priority</div>
          <div className="text-sm text-gray-300">
            Finish tax documents & Emma&apos;s recital at 6 PM
          </div>
        </div>
      </div>
    </div>
  );
}

const previewMap: Record<string, ReactNode> = {
  tasks: <TasksPreview />,
  calendar: <CalendarPreview />,
  reminders: <RemindersPreview />,
  messages: <MessagesPreview />,
  shopping: <ShoppingPreview />,
  meals: <MealsPreview />,
  budget: <BudgetPreview />,
  goals: <GoalsPreview />,
  household: <ChoresPreview />,
  'daily-check-in': <CheckInPreview />,
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

// ── Feature Navigation Strip ──────────────────────────────────────

function FeatureNav({ activeFeature }: { activeFeature: string }) {
  const scrollToFeature = (slug: string) => {
    const element = document.getElementById(`feature-${slug}`);
    if (element) {
      const offset = 100; // account for sticky nav + header
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
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-3 overflow-x-auto py-4 scrollbar-hide">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isActive = activeFeature === feature.slug;
            return (
              <button
                key={feature.slug}
                onClick={() => scrollToFeature(feature.slug)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300 flex-shrink-0 ${
                  isActive
                    ? `bg-gradient-to-r ${feature.gradient} text-white shadow-lg scale-105`
                    : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white hover:scale-105'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{feature.name}</span>
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
  const isOdd = index % 2 === 0; // 0-indexed, so first is "odd" (text left)

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
            {/* Icon in gradient circle */}
            <div
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-0.5 mb-6`}
            >
              <div className="w-full h-full rounded-2xl bg-gray-900 flex items-center justify-center">
                <Icon className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Feature name */}
            <h3 className="text-3xl font-bold text-white mb-4">{feature.name}</h3>

            {/* Description */}
            <p className="text-lg text-gray-400 mb-6">{feature.description}</p>

            {/* Bullet benefits */}
            <ul className="space-y-3 mb-8">
              {feature.bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3">
                  <Check className={`w-5 h-5 ${textColorMap[feature.color] || 'text-blue-500'} flex-shrink-0 mt-0.5`} />
                  <span className="text-gray-500">{bullet}</span>
                </li>
              ))}
            </ul>

            {/* Learn more link */}
            <Link
              href={`/features/${feature.slug}`}
              className={`inline-flex items-center gap-2 ${textColorMap[feature.color] || 'text-blue-500'} hover:gap-3 transition-all duration-300 font-medium`}
            >
              Learn more
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Demo Side */}
          <motion.div
            initial={{ opacity: 0, x: isOdd ? 30 : -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={`${isOdd ? 'md:order-2' : 'md:order-1'}`}
          >
            {previewMap[feature.slug] || (
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

// ── Main Component ────────────────────────────────────────────────

export function FeatureGrid() {
  const [activeFeature, setActiveFeature] = useState(features[0].slug);

  // Track which feature is in view
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
        rootMargin: '-120px 0px -60% 0px', // Adjust to trigger when feature is in upper portion
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
