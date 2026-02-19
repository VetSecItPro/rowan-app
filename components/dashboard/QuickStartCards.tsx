'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CheckSquare,
  UtensilsCrossed,
  DollarSign,
  Users,
  ArrowRight,
} from 'lucide-react';

interface QuickStartCard {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  iconColorClass: string;
  iconBgClass: string;
  glowClass: string;
}

const CARDS: QuickStartCard[] = [
  {
    title: 'Create your first task',
    description: 'Stay on top of what needs to get done',
    icon: CheckSquare,
    href: '/tasks',
    iconColorClass: 'text-blue-400',
    iconBgClass: 'bg-blue-900/30',
    glowClass: 'hover:shadow-blue-900/20',
  },
  {
    title: "Plan this week's meals",
    description: 'Organize recipes and meal prep',
    icon: UtensilsCrossed,
    href: '/meals',
    iconColorClass: 'text-orange-400',
    iconBgClass: 'bg-orange-900/30',
    glowClass: 'hover:shadow-orange-900/20',
  },
  {
    title: 'Set up your budget',
    description: 'Track spending and save more',
    icon: DollarSign,
    href: '/budget',
    iconColorClass: 'text-amber-400',
    iconBgClass: 'bg-amber-900/30',
    glowClass: 'hover:shadow-amber-900/20',
  },
  {
    title: 'Invite your family',
    description: 'Collaborate in real-time',
    icon: Users,
    href: '/settings?tab=members',
    iconColorClass: 'text-green-400',
    iconBgClass: 'bg-green-900/30',
    glowClass: 'hover:shadow-green-900/20',
  },
];

const CONTAINER_VIEWPORT = { once: true, margin: '-40px' } as const;

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut' as const,
    },
  },
};

/** Displays quick-start action cards for common tasks on the dashboard. */
export function QuickStartCards() {
  const router = useRouter();

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-white mb-4">
        Get Started
      </h3>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={CONTAINER_VIEWPORT}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {CARDS.map((card) => {
          const CardIcon = card.icon;
          return (
            <motion.button
              key={card.href}
              variants={cardVariants}
              onClick={() => router.push(card.href)}
              className={`group flex items-center gap-4 p-4 bg-gray-800/60 border border-gray-700/50 rounded-xl text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${card.glowClass} hover:border-gray-600 active:scale-[0.98]`}
            >
              {/* Icon */}
              <div
                className={`flex-shrink-0 w-11 h-11 ${card.iconBgClass} rounded-lg flex items-center justify-center`}
              >
                <CardIcon className={`w-5 h-5 ${card.iconColorClass}`} />
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {card.title}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {card.description}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-300 transition-colors flex-shrink-0" />
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
