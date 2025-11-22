'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { CheckSquare, Calendar, Bell, MessageSquare, ShoppingBag, UtensilsCrossed, Home, Target, ArrowLeft, Heart, Users, Receipt, DollarSign, FolderOpen } from 'lucide-react';

const features = [
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
  {
    id: 'spaces',
    name: 'Space & Collaboration',
    description: 'Master space management, invitations, and team collaboration',
    icon: Users,
    color: 'from-teal-500 to-teal-600',
    hoverBorder: 'hover:border-teal-500',
    hoverShadow: 'hover:shadow-teal-500/50',
    href: '/settings/documentation/spaces',
    available: true,
  },
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
];

export default function DocumentationPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 dark:from-gray-950 dark:via-purple-950/20 dark:to-blue-950/20">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Link>
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Documentation
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Choose a feature to learn about. Comprehensive guides for all Rowan features.
              </p>
            </div>
          </div>

          {/* Features Grid - Optimized for 13 cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isAvailable = feature.available;

              if (isAvailable) {
                return (
                  <Link
                    key={feature.id}
                    href={feature.href}
                    className={`group relative p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-2 border-gray-200/60 dark:border-gray-700/60 ${feature.hoverBorder} ${feature.hoverShadow} rounded-2xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:scale-105`}
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      {feature.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                      {feature.description}
                    </p>
                    <div className="flex items-center text-sm font-semibold text-purple-600 dark:text-purple-400">
                      Read guides
                      <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                    </div>
                  </Link>
                );
              } else {
                return (
                  <div
                    key={feature.id}
                    className="relative p-6 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl opacity-60"
                  >
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} opacity-50 flex items-center justify-center mb-4`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                      {feature.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                      {feature.description}
                    </p>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      Coming Soon
                    </div>
                  </div>
                );
              }
            })}
          </div>

        </div>
      </div>
    </>
  );
}