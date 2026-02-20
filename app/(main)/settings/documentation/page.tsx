import Link from 'next/link';
import { CheckSquare, Calendar, Bell, MessageSquare, ShoppingBag, UtensilsCrossed, Home, Target, ArrowLeft, Heart, Receipt, FolderOpen, CreditCard, Gift, Bot, Scale } from 'lucide-react';
import { DocSearchGrid } from './DocSearchGrid';

const features = [
  // AI & Intelligence
  {
    id: 'ai-companion',
    name: 'Rowan AI Companion',
    description: 'Your personal household assistant — manage tasks, meals, and more through conversation',
    icon: Bot,
    color: 'from-blue-500 to-purple-600',
    hoverBorder: 'hover:border-blue-500',
    hoverShadow: 'hover:shadow-blue-500/50',
    href: '/settings/documentation/ai-companion',
    available: true,
  },
  {
    id: 'household-balance',
    name: 'Household Balance',
    description: 'See who does what — fairness tracking for tasks and chores across your household',
    icon: Scale,
    color: 'from-teal-500 to-cyan-600',
    hoverBorder: 'hover:border-teal-500',
    hoverShadow: 'hover:shadow-teal-500/50',
    href: '/settings/documentation/household-balance',
    available: true,
  },
  // Core Daily Features
  {
    id: 'tasks',
    name: 'Tasks & Chores',
    description: 'Manage daily tasks and household chores with smart features',
    icon: CheckSquare,
    color: 'from-blue-500 to-blue-600',
    hoverBorder: 'hover:border-blue-500',
    hoverShadow: 'hover:shadow-blue-500/50',
    href: '/settings/documentation/tasks-chores',
    available: true,
  },
  {
    id: 'calendar',
    name: 'Calendar & Events',
    description: 'Master your schedule with shared calendar features',
    icon: Calendar,
    color: 'from-purple-500 to-purple-600',
    hoverBorder: 'hover:border-purple-500',
    hoverShadow: 'hover:shadow-purple-500/50',
    href: '/settings/documentation/calendar',
    available: true,
  },
  {
    id: 'reminders',
    name: 'Reminders',
    description: 'Set up and manage reminders for important tasks',
    icon: Bell,
    color: 'from-pink-500 to-pink-600',
    hoverBorder: 'hover:border-pink-500',
    hoverShadow: 'hover:shadow-pink-500/50',
    href: '/settings/documentation/reminders',
    available: true,
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Communicate effectively with your partner',
    icon: MessageSquare,
    color: 'from-green-500 to-green-600',
    hoverBorder: 'hover:border-green-500',
    hoverShadow: 'hover:shadow-green-500/50',
    href: '/settings/documentation/messages',
    available: true,
  },
  {
    id: 'shopping',
    name: 'Shopping Lists',
    description: 'Create and share shopping lists with ease',
    icon: ShoppingBag,
    color: 'from-emerald-500 to-emerald-600',
    hoverBorder: 'hover:border-emerald-500',
    hoverShadow: 'hover:shadow-emerald-500/50',
    href: '/settings/documentation/shopping',
    available: true,
  },
  // Meal & Recipe Features
  {
    id: 'meals',
    name: 'Meal Planning',
    description: 'Plan meals, discover recipes, and generate shopping lists',
    icon: UtensilsCrossed,
    color: 'from-orange-500 to-orange-600',
    hoverBorder: 'hover:border-orange-500',
    hoverShadow: 'hover:shadow-orange-500/50',
    href: '/settings/documentation/meals',
    available: true,
  },
  {
    id: 'recipes',
    name: 'Recipe Library & Discovery',
    description: 'Browse, save, and discover new recipes with AI-powered import',
    icon: UtensilsCrossed,
    color: 'from-yellow-500 to-yellow-600',
    hoverBorder: 'hover:border-yellow-500',
    hoverShadow: 'hover:shadow-yellow-500/50',
    href: '/settings/documentation/recipes',
    available: true,
  },
  // Planning & Goals
  {
    id: 'goals',
    name: 'Goals & Planning',
    description: 'Set and track your shared goals and milestones',
    icon: Target,
    color: 'from-indigo-500 to-indigo-600',
    hoverBorder: 'hover:border-indigo-500',
    hoverShadow: 'hover:shadow-indigo-500/50',
    href: '/settings/documentation/goals',
    available: true,
  },
  // Financial Features
  {
    id: 'household',
    name: 'Household & Budget',
    description: 'Manage household chores, bills, and budget tracking',
    icon: Home,
    color: 'from-amber-500 to-amber-600',
    hoverBorder: 'hover:border-amber-500',
    hoverShadow: 'hover:shadow-amber-500/50',
    href: '/settings/documentation/household',
    available: true,
  },
  {
    id: 'expenses',
    name: 'Expenses & Receipt Scanning',
    description: 'AI-powered expense tracking and receipt scanning',
    icon: Receipt,
    color: 'from-red-500 to-red-600',
    hoverBorder: 'hover:border-red-500',
    hoverShadow: 'hover:shadow-red-500/50',
    href: '/settings/documentation/expenses',
    available: true,
  },
  {
    id: 'projects',
    name: 'Projects & Budgets',
    description: 'Project management, budget vs actual tracking, vendor management',
    icon: FolderOpen,
    color: 'from-cyan-500 to-cyan-600',
    hoverBorder: 'hover:border-cyan-500',
    hoverShadow: 'hover:shadow-cyan-500/50',
    href: '/settings/documentation/projects',
    available: true,
  },
  {
    id: 'checkin',
    name: 'Daily Check-In',
    description: 'Track emotional wellness and connect with your partner',
    icon: Heart,
    color: 'from-pink-500 to-purple-500',
    hoverBorder: 'hover:border-pink-500',
    hoverShadow: 'hover:shadow-pink-500/50',
    href: '/settings/documentation/checkin',
    available: true,
  },
  // Account & Billing
  {
    id: 'subscriptions',
    name: 'Subscriptions & Billing',
    description: 'Plans, pricing, free trials, billing, and managing your subscription',
    icon: CreditCard,
    color: 'from-emerald-500 to-teal-500',
    hoverBorder: 'hover:border-emerald-500',
    hoverShadow: 'hover:shadow-emerald-500/50',
    href: '/settings/documentation/subscriptions',
    available: true,
  },
  // Family Features
  {
    id: 'rewards',
    name: 'Rewards Shop',
    description: 'Motivate with points, browse rewards catalog, and redeem prizes',
    icon: Gift,
    color: 'from-amber-500 to-orange-500',
    hoverBorder: 'hover:border-amber-500',
    hoverShadow: 'hover:shadow-amber-500/50',
    href: '/settings/documentation/rewards',
    available: true,
  },
];

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Link>
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Documentation
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Choose a feature to learn about. Comprehensive guides for all Rowan features.
              </p>
            </div>
          </div>

          <DocSearchGrid features={features} />
        </div>
      </div>
  );
}
