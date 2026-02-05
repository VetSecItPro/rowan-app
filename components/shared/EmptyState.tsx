'use client';

import { type LucideIcon } from 'lucide-react';
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
} from 'lucide-react';

type FeatureKey =
  | 'tasks'
  | 'calendar'
  | 'reminders'
  | 'messages'
  | 'shopping'
  | 'meals'
  | 'budget'
  | 'goals'
  | 'checkin';

interface FeatureConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  colorKey: FeatureColorKey;
}

type FeatureColorKey =
  | 'blue'
  | 'purple'
  | 'pink'
  | 'green'
  | 'emerald'
  | 'orange'
  | 'amber'
  | 'indigo'
  | 'yellow';

const FEATURE_CONFIGS: Record<FeatureKey, FeatureConfig> = {
  tasks: {
    icon: CheckSquare,
    title: 'Your task list is empty',
    description: 'What needs to get done today?',
    primaryLabel: 'Create a Task',
    colorKey: 'blue',
  },
  calendar: {
    icon: Calendar,
    title: 'No events yet',
    description: "Start planning your family's schedule",
    primaryLabel: 'Add an Event',
    colorKey: 'purple',
  },
  reminders: {
    icon: Bell,
    title: 'No reminders set',
    description: 'Never forget what matters',
    primaryLabel: 'Set a Reminder',
    colorKey: 'pink',
  },
  messages: {
    icon: MessageCircle,
    title: 'No messages yet',
    description: 'Start a conversation with your household',
    primaryLabel: 'Send a Message',
    colorKey: 'green',
  },
  shopping: {
    icon: ShoppingCart,
    title: 'No shopping lists',
    description: 'Create a list for your next trip',
    primaryLabel: 'Create a List',
    colorKey: 'emerald',
  },
  meals: {
    icon: UtensilsCrossed,
    title: 'No meals planned yet',
    description: 'Browse recipes to get started',
    primaryLabel: 'Plan a Meal',
    secondaryLabel: 'Browse Recipes',
    colorKey: 'orange',
  },
  budget: {
    icon: DollarSign,
    title: 'Start tracking expenses',
    description: 'See where your money goes each month',
    primaryLabel: 'Add Expense',
    secondaryLabel: 'Set Up Budget',
    colorKey: 'amber',
  },
  goals: {
    icon: Target,
    title: 'No goals yet',
    description: 'What does your family want to achieve?',
    primaryLabel: 'Create a Goal',
    colorKey: 'indigo',
  },
  checkin: {
    icon: Heart,
    title: 'No check-ins yet',
    description: 'How is everyone feeling today?',
    primaryLabel: 'Check In Now',
    colorKey: 'yellow',
  },
};

// Static Tailwind class maps -- no dynamic class construction
const ICON_COLOR_CLASSES: Record<FeatureColorKey, string> = {
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  pink: 'text-pink-400',
  green: 'text-green-400',
  emerald: 'text-emerald-400',
  orange: 'text-orange-400',
  amber: 'text-amber-400',
  indigo: 'text-indigo-400',
  yellow: 'text-yellow-400',
};

const ICON_BG_FROM_CLASSES: Record<FeatureColorKey, string> = {
  blue: 'from-blue-900/40',
  purple: 'from-purple-900/40',
  pink: 'from-pink-900/40',
  green: 'from-green-900/40',
  emerald: 'from-emerald-900/40',
  orange: 'from-orange-900/40',
  amber: 'from-amber-900/40',
  indigo: 'from-indigo-900/40',
  yellow: 'from-yellow-900/40',
};

const ICON_BG_TO_CLASSES: Record<FeatureColorKey, string> = {
  blue: 'to-blue-800/20',
  purple: 'to-purple-800/20',
  pink: 'to-pink-800/20',
  green: 'to-green-800/20',
  emerald: 'to-emerald-800/20',
  orange: 'to-orange-800/20',
  amber: 'to-amber-800/20',
  indigo: 'to-indigo-800/20',
  yellow: 'to-yellow-800/20',
};

const BUTTON_CLASSES: Record<FeatureColorKey, string> = {
  blue: 'bg-blue-600 hover:bg-blue-500',
  purple: 'bg-purple-600 hover:bg-purple-500',
  pink: 'bg-pink-600 hover:bg-pink-500',
  green: 'bg-green-600 hover:bg-green-500',
  emerald: 'bg-emerald-600 hover:bg-emerald-500',
  orange: 'bg-orange-600 hover:bg-orange-500',
  amber: 'bg-amber-600 hover:bg-amber-500',
  indigo: 'bg-indigo-600 hover:bg-indigo-500',
  yellow: 'bg-yellow-600 hover:bg-yellow-500',
};

interface EmptyStateProps {
  feature?: FeatureKey;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  feature,
  icon: iconProp,
  title: titleProp,
  description: descriptionProp,
  action,
  primaryAction,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  const config = feature ? FEATURE_CONFIGS[feature] : null;

  // Resolve values: explicit props override feature defaults
  const Icon = iconProp || config?.icon;
  const title = titleProp || config?.title || '';
  const description = descriptionProp || config?.description || '';
  const colorKey = config?.colorKey;

  // Resolve primary action: explicit primaryAction > legacy action > feature default (label only)
  const resolvedPrimaryAction = primaryAction || action || (config ? { label: config.primaryLabel, onClick: () => {} } : undefined);
  const resolvedSecondaryAction = secondaryAction || (config?.secondaryLabel ? { label: config.secondaryLabel, onClick: () => {} } : undefined);

  // If we have a feature config, use the enhanced layout with animations
  if (config && colorKey) {
    const iconColorClass = ICON_COLOR_CLASSES[colorKey];
    const bgFromClass = ICON_BG_FROM_CLASSES[colorKey];
    const bgToClass = ICON_BG_TO_CLASSES[colorKey];
    const buttonClass = BUTTON_CLASSES[colorKey];

    return (
      <div
        className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
      >
        {/* Animated icon in gradient circle */}
        {Icon && (
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${bgFromClass} ${bgToClass} flex items-center justify-center mb-6 shadow-lg`}
          >
            <Icon className={`w-10 h-10 ${iconColorClass}`} />
          </motion.div>
        )}

        {/* Title */}
        <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>

        {/* Description */}
        <p className="text-sm text-gray-400 max-w-sm mb-8 leading-relaxed">
          {description}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {resolvedPrimaryAction && resolvedPrimaryAction.onClick !== undefined && (
            <button
              onClick={resolvedPrimaryAction.onClick}
              className={`px-6 py-3 ${buttonClass} text-white rounded-xl font-medium transition-all hover:shadow-lg active:scale-95`}
            >
              {resolvedPrimaryAction.label}
            </button>
          )}

          {resolvedSecondaryAction && resolvedSecondaryAction.onClick !== undefined && (
            <button
              onClick={resolvedSecondaryAction.onClick}
              className="px-6 py-3 text-gray-400 hover:text-white font-medium transition-colors"
            >
              {resolvedSecondaryAction.label}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Fallback: original layout for backward compatibility (no feature prop)
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {Icon && (
        <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-white" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 max-w-md mb-6">{description}</p>
      {resolvedPrimaryAction && (
        <button
          onClick={resolvedPrimaryAction.onClick}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
        >
          {resolvedPrimaryAction.label}
        </button>
      )}
    </div>
  );
}
