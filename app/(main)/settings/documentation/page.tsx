'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { CheckSquare, Calendar, Bell, MessageSquare, ShoppingBag, UtensilsCrossed, Home, Target, BookOpen, ArrowLeft, Heart } from 'lucide-react';

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
    id: 'household',
    name: 'Household Management',
    description: 'Manage chores, maintenance, and household tasks',
    icon: Home,
    color: 'from-amber-500 to-amber-600',
    hoverBorder: 'hover:border-amber-500',
    hoverShadow: 'hover:shadow-amber-500/50',
    href: '/settings/documentation/household',
    available: false,
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
];

export default function DocumentationPage() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 dark:from-gray-950 dark:via-purple-950/20 dark:to-blue-950/20">
        <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0 shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Documentation</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Choose a feature to learn about</p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isAvailable = feature.available;

            if (isAvailable) {
              return (
                <Link
                  key={feature.id}
                  href={feature.href}
                  className={`group relative p-6 bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border-2 border-gray-200/50 dark:border-gray-700/50 ${feature.hoverBorder} ${feature.hoverShadow} rounded-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-200`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                  <div className="mt-4 flex items-center text-sm font-medium text-purple-600 dark:text-purple-400">
                    Read guides
                    <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </Link>
              );
            } else {
              return (
                <div
                  key={feature.id}
                  className="relative p-6 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl opacity-60"
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} opacity-50 flex items-center justify-center mb-4`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {feature.description}
                  </p>
                  <div className="mt-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      Coming Soon
                    </span>
                  </div>
                </div>
              );
            }
          })}
        </div>

        {/* Help Section */}
        <div className="mt-12 p-6 bg-purple-50/60 dark:bg-purple-900/40 backdrop-blur-md border border-purple-200/50 dark:border-purple-800/50 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Need More Help?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <Link
            href="/settings/support"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
    </>
  );
}
