'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowRight,
  CheckSquare,
  Calendar,
  Bell,
  MessageSquare,
  ShoppingBag,
  UtensilsCrossed,
  Target,
  Home,
  Receipt,
  FolderOpen,
  Users,
  Heart,
  CreditCard,
  Bot,
  Gift,
  BookOpen,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Search keywords map for natural language search
const documentationSearchKeywords: Record<string, string[]> = {
  tasks: ['task', 'chore', 'todo', 'to-do', 'assignment', 'duty', 'cleaning', 'housework'],
  calendar: ['calendar', 'event', 'schedule', 'appointment', 'meeting', 'date', 'time'],
  reminders: ['reminder', 'alert', 'notification', 'remind', 'notify', 'alarm'],
  messages: ['message', 'chat', 'communication', 'talk', 'conversation', 'partner'],
  shopping: ['shopping', 'grocery', 'groceries', 'list', 'buy', 'purchase', 'store'],
  meals: ['meal', 'planning', 'dinner', 'lunch', 'breakfast', 'food', 'cook', 'recipe'],
  recipes: ['recipe', 'cookbook', 'ingredient', 'cooking', 'dish', 'import', 'url'],
  goals: ['goal', 'milestone', 'target', 'objective', 'achievement', 'planning'],
  household: ['household', 'budget', 'bill', 'expense', 'home', 'utility', 'finance'],
  expenses: ['expense', 'receipt', 'scan', 'spending', 'money', 'track', 'cost', 'ai'],
  projects: ['project', 'budget', 'vendor', 'contractor', 'renovation', 'actual'],
  spaces: ['space', 'collaboration', 'team', 'invite', 'partner', 'share', 'family'],
  checkin: ['check-in', 'checkin', 'wellness', 'mood', 'emotion', 'feeling', 'daily'],
  subscriptions: ['subscription', 'billing', 'payment', 'plan', 'pricing', 'trial', 'pro', 'family', 'upgrade', 'cancel'],
  'ai-companion': ['ai', 'assistant', 'chat', 'rowan ai', 'companion', 'voice', 'briefing', 'suggestion', 'smart'],
};

interface DocumentationFeature {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  hoverBorder: string;
  hoverShadow: string;
  href: string;
  available: boolean;
}

const documentationFeatures: DocumentationFeature[] = [
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
  // Collaboration Features
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
  {
    id: 'ai-companion',
    name: 'AI Companion',
    description: 'Chat with Rowan AI — your household assistant for tasks, schedules, and more',
    icon: Bot,
    color: 'from-blue-500 to-purple-600',
    hoverBorder: 'hover:border-blue-500',
    hoverShadow: 'hover:shadow-blue-500/50',
    href: '/settings/documentation/ai-companion',
    available: true,
  },
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

const DocumentationTab = React.memo(() => {
  const [docSearchQuery, setDocSearchQuery] = useState('');

  // Filter features based on search query
  const filteredFeatures = useMemo(() => {
    if (!docSearchQuery.trim()) return documentationFeatures;

    const query = docSearchQuery.toLowerCase().trim();
    return documentationFeatures.filter((feature) => {
      // Check name and description
      if (feature.name.toLowerCase().includes(query)) return true;
      if (feature.description.toLowerCase().includes(query)) return true;
      // Check keywords
      const keywords = documentationSearchKeywords[feature.id] || [];
      return keywords.some(
        (keyword) => keyword.toLowerCase().includes(query) || query.includes(keyword.toLowerCase())
      );
    });
  }, [docSearchQuery]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-900/40 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Feature Manuals</h2>
          <p className="text-sm sm:text-base text-gray-400">
            Choose a feature to learn about. Comprehensive guides for all Rowan features.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search feature manuals... (e.g., 'expenses', 'billing', 'meal planning')"
          value={docSearchQuery}
          onChange={(e) => setDocSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-colors"
        />
        {docSearchQuery && (
          <button
            onClick={() => setDocSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Features Grid - Optimized for 14+ cards */}
      {filteredFeatures.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {filteredFeatures.map((feature) => {
            const Icon = feature.icon;
            const isAvailable = feature.available;

            if (isAvailable) {
              return (
                <Link
                  key={feature.id}
                  href={feature.href}
                  className={`btn-touch group relative p-6 bg-gray-800/80 border-2 border-gray-700/60 ${feature.hoverBorder} ${feature.hoverShadow} rounded-2xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:scale-105 active:scale-95`}
                >
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{feature.description}</p>
                  <div className="flex items-center text-sm font-semibold text-purple-400">
                    Read guides
                    <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-2 transition-transform duration-300" />
                  </div>
                </Link>
              );
            } else {
              return (
                <div
                  key={feature.id}
                  className="relative p-6 bg-gray-900/50 border border-gray-700/50 rounded-2xl opacity-60"
                >
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} opacity-50 flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.name}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed mb-4">{feature.description}</p>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
                    Coming Soon
                  </div>
                </div>
              );
            }
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No documentation found</h3>
          <p className="text-sm text-gray-400 text-center max-w-md">
            No feature manuals match your search. Try a different keyword or browse all features.
          </p>
          <button
            onClick={() => setDocSearchQuery('')}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
});

DocumentationTab.displayName = 'DocumentationTab';

export default DocumentationTab;
