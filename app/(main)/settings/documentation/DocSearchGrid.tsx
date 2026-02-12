'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface DocFeature {
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
  checkin: ['check-in', 'checkin', 'wellness', 'mood', 'emotion', 'feeling', 'daily'],
  subscriptions: ['subscription', 'billing', 'payment', 'plan', 'pricing', 'trial', 'pro', 'family', 'upgrade', 'cancel'],
  rewards: ['reward', 'points', 'redeem', 'earn', 'chore', 'incentive', 'prize', 'catalog', 'shop', 'kids', 'children'],
};

export function DocSearchGrid({ features }: { features: DocFeature[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFeatures = features.filter((feature) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    if (feature.name.toLowerCase().includes(query)) return true;
    if (feature.description.toLowerCase().includes(query)) return true;
    const keywords = documentationSearchKeywords[feature.id] || [];
    return keywords.some(keyword => keyword.toLowerCase().includes(query) || query.includes(keyword.toLowerCase()));
  });

  return (
    <>
      {/* Search Bar */}
      <div className="relative max-w-xl mx-auto mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search documentation... (e.g., 'expenses', 'billing', 'meal planning')"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-colors"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {filteredFeatures.map((feature) => {
          const Icon = feature.icon;
          const isAvailable = feature.available;

          if (isAvailable) {
            return (
              <Link
                key={feature.id}
                href={feature.href}
                className={`group relative p-6 bg-gray-800/80 border-2 border-gray-700/60 ${feature.hoverBorder} ${feature.hoverShadow} rounded-2xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:scale-105`}
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                  {feature.name}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  {feature.description}
                </p>
                <div className="flex items-center text-sm font-semibold text-purple-400">
                  Read guides
                  <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">&rarr;</span>
                </div>
              </Link>
            );
          } else {
            return (
              <div
                key={feature.id}
                className="relative p-6 bg-gray-900/50 border border-gray-700/50 rounded-2xl opacity-60"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} opacity-50 flex items-center justify-center mb-4`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {feature.name}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-4">
                  {feature.description}
                </p>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
                  Coming Soon
                </div>
              </div>
            );
          }
        })}
      </div>

      {/* No Results Message */}
      {filteredFeatures.length === 0 && searchQuery && (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            No documentation found for &ldquo;{searchQuery}&rdquo;
          </p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-4 text-purple-400 hover:underline"
          >
            Clear search
          </button>
        </div>
      )}
    </>
  );
}
