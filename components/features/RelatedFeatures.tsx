'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  Calendar,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  DollarSign,
  Target,
  Heart,
  ArrowRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Feature definitions — static data so Tailwind can purge safely.
// The `accent` hex is used in inline styles; the static Tailwind classes
// are listed individually so they survive purging.
// ---------------------------------------------------------------------------
interface FeatureEntry {
  slug: string;
  name: string;
  description: string;
  icon: React.ElementType;
  accent: string; // hex color for inline styles
  // Static Tailwind class tokens (safe for purging)
  borderHover: string;
  iconBg: string;
  iconText: string;
}

const ALL_FEATURES: FeatureEntry[] = [
  {
    slug: 'tasks',
    name: 'Tasks',
    description: 'Keep your family on track with shared tasks',
    icon: CheckSquare,
    accent: '#3b82f6',
    borderHover: 'hover:border-blue-500/40',
    iconBg: 'bg-blue-500/10',
    iconText: 'text-blue-500',
  },
  {
    slug: 'calendar',
    name: 'Calendar',
    description: 'One calendar for the whole family',
    icon: Calendar,
    accent: '#a855f7',
    borderHover: 'hover:border-purple-500/40',
    iconBg: 'bg-purple-500/10',
    iconText: 'text-purple-500',
  },
  {
    slug: 'reminders',
    name: 'Reminders',
    description: 'Never forget what matters',
    icon: Bell,
    accent: '#ec4899',
    borderHover: 'hover:border-pink-500/40',
    iconBg: 'bg-pink-500/10',
    iconText: 'text-pink-500',
  },
  {
    slug: 'messages',
    name: 'Messages',
    description: "Your family's private chat space",
    icon: MessageCircle,
    accent: '#22c55e',
    borderHover: 'hover:border-green-500/40',
    iconBg: 'bg-green-500/10',
    iconText: 'text-green-500',
  },
  {
    slug: 'shopping',
    name: 'Shopping',
    description: 'Smarter shopping lists, together',
    icon: ShoppingCart,
    accent: '#10b981',
    borderHover: 'hover:border-emerald-500/40',
    iconBg: 'bg-emerald-500/10',
    iconText: 'text-emerald-500',
  },
  {
    slug: 'meals',
    name: 'Meals',
    description: 'Plan meals and save time',
    icon: UtensilsCrossed,
    accent: '#f97316',
    borderHover: 'hover:border-orange-500/40',
    iconBg: 'bg-orange-500/10',
    iconText: 'text-orange-500',
  },
  {
    slug: 'budget',
    name: 'Budget',
    description: 'Track spending as a family',
    icon: DollarSign,
    accent: '#f59e0b',
    borderHover: 'hover:border-amber-500/40',
    iconBg: 'bg-amber-500/10',
    iconText: 'text-amber-500',
  },
  {
    slug: 'goals',
    name: 'Goals',
    description: 'Set and achieve family goals',
    icon: Target,
    accent: '#6366f1',
    borderHover: 'hover:border-indigo-500/40',
    iconBg: 'bg-indigo-500/10',
    iconText: 'text-indigo-500',
  },
  {
    slug: 'daily-checkin',
    name: 'Daily Check-in',
    description: 'Stay connected with how everyone feels',
    icon: Heart,
    accent: '#eab308',
    borderHover: 'hover:border-yellow-500/40',
    iconBg: 'bg-yellow-500/10',
    iconText: 'text-yellow-500',
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface RelatedFeaturesProps {
  /** The slug of the current feature page (will be excluded from suggestions). */
  currentFeature: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function RelatedFeatures({ currentFeature }: RelatedFeaturesProps) {
  // Exclude the current feature and pick up to 4
  const related = ALL_FEATURES.filter((f) => f.slug !== currentFeature).slice(
    0,
    4
  );

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Explore More Features
          </h2>
          <p className="text-gray-400 text-lg">
            Everything your family needs, in one place.
          </p>
        </motion.div>

        {/* Cards — horizontal scroll on mobile, 4-column grid on desktop */}
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-4 md:overflow-visible md:pb-0">
          {related.map((feature, index) => (
            <motion.div
              key={feature.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="flex-shrink-0 w-[280px] snap-start md:w-auto"
            >
              <Link
                href={`/features/${feature.slug}`}
                className={`group block h-full rounded-2xl border border-gray-800 bg-gray-900/80 p-6 transition-all duration-300 ${feature.borderHover} hover:bg-gray-800/60`}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl ${feature.iconBg} flex items-center justify-center mb-4`}
                >
                  <feature.icon className={`w-6 h-6 ${feature.iconText}`} />
                </div>

                {/* Name */}
                <h3 className="text-lg font-semibold text-white mb-1">
                  {feature.name}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                  {feature.description}
                </p>

                {/* Link arrow */}
                <div
                  className="inline-flex items-center gap-1 text-sm font-medium transition-colors"
                  style={{ color: feature.accent }}
                >
                  Learn more
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
