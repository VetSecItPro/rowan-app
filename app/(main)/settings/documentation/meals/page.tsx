'use client';

import Link from 'next/link';
import { ArrowLeft, UtensilsCrossed, BookOpen, Play, Eye, Plus, ChefHat, Globe, Sparkles, ShoppingBag, CheckSquare, Keyboard, Clock, Lightbulb, Search, Calendar, List as ListIcon, LayoutGrid } from 'lucide-react';

interface GuideSection {
  title: string;
  icon: any;
  color: string;
  articles: {
    title: string;
    description: string;
    readTime: string;
    href: string;
  }[];
}

const guideSections: GuideSection[] = [
  {
    title: 'Getting Started',
    icon: Play,
    color: 'from-green-500 to-green-600',
    articles: [
      {
        title: 'Introduction to Meal Planning',
        description: 'Learn the basics of meal planning and how Rowan can help you organize your meals',
        readTime: '3 min read',
        href: '#intro',
      },
      {
        title: 'Understanding the Three Views',
        description: 'Master Calendar, List, and Recipe views to plan meals your way',
        readTime: '4 min read',
        href: '#views',
      },
      {
        title: 'Quick Start Guide',
        description: 'Get up and running with your first meal plan in 5 minutes',
        readTime: '5 min read',
        href: '#quick-start',
      },
    ],
  },
  {
    title: 'Creating & Managing Meals',
    icon: Plus,
    color: 'from-orange-500 to-orange-600',
    articles: [
      {
        title: 'How to Create a New Meal',
        description: 'Step-by-step guide to planning a meal with date, time, and meal type',
        readTime: '5 min read',
        href: '#create-meal',
      },
      {
        title: 'Linking Recipes to Meals',
        description: 'Connect your saved recipes to planned meals for automatic ingredient tracking',
        readTime: '4 min read',
        href: '#link-recipes',
      },
      {
        title: 'Editing and Deleting Meals',
        description: 'Make changes to your meal plan and manage your schedule',
        readTime: '3 min read',
        href: '#edit-meals',
      },
      {
        title: 'Managing Past Meals',
        description: 'View meal history and understand completed meal indicators',
        readTime: '3 min read',
        href: '#past-meals',
      },
    ],
  },
  {
    title: 'Recipe Management',
    icon: ChefHat,
    color: 'from-red-500 to-red-600',
    articles: [
      {
        title: 'Adding Recipes Manually',
        description: 'Create custom recipes with ingredients, instructions, prep time, and more',
        readTime: '6 min read',
        href: '#add-recipe',
      },
      {
        title: 'Discovering Recipes from APIs',
        description: 'Browse 37+ cuisines and thousands of recipes from multiple sources',
        readTime: '5 min read',
        href: '#discover-recipes',
      },
      {
        title: 'Using AI Recipe Import',
        description: 'Automatically extract recipe data from text or images using AI',
        readTime: '4 min read',
        href: '#ai-import',
      },
      {
        title: 'Organizing Your Recipe Library',
        description: 'Search, filter, and manage your saved recipes',
        readTime: '4 min read',
        href: '#organize-recipes',
      },
      {
        title: 'Quick Meal Planning from Recipes',
        description: 'Use the "Plan Meal" button to schedule recipes instantly',
        readTime: '3 min read',
        href: '#plan-from-recipe',
      },
    ],
  },
  {
    title: 'Shopping Lists',
    icon: ShoppingBag,
    color: 'from-emerald-500 to-emerald-600',
    articles: [
      {
        title: 'Generating Shopping Lists from Meals',
        description: 'Automatically create shopping lists from recipe ingredients',
        readTime: '4 min read',
        href: '#generate-list',
      },
      {
        title: 'Reviewing and Customizing Ingredients',
        description: 'Select which ingredients to add to your shopping list',
        readTime: '3 min read',
        href: '#review-ingredients',
      },
      {
        title: 'Bulk Shopping List Generation',
        description: 'Combine multiple meals into one comprehensive shopping list',
        readTime: '4 min read',
        href: '#bulk-shopping',
      },
    ],
  },
  {
    title: 'Advanced Features',
    icon: Sparkles,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Using Keyboard Shortcuts',
        description: 'Speed up your workflow with keyboard commands (N, R, /, 1-3, ESC)',
        readTime: '5 min read',
        href: '#keyboard',
      },
      {
        title: 'Bulk Operations with Select Mode',
        description: 'Select multiple meals to delete or generate shopping lists in bulk',
        readTime: '4 min read',
        href: '#bulk-ops',
      },
      {
        title: 'Searching Meals and Recipes',
        description: 'Quickly find what you need with powerful search (Press / to search)',
        readTime: '3 min read',
        href: '#search',
      },
      {
        title: 'Calendar Navigation',
        description: 'Navigate between week, two-week, and month views efficiently',
        readTime: '3 min read',
        href: '#calendar-nav',
      },
    ],
  },
  {
    title: 'Tips & Best Practices',
    icon: Lightbulb,
    color: 'from-yellow-500 to-yellow-600',
    articles: [
      {
        title: 'Weekly Meal Planning Strategy',
        description: 'Best practices for planning a week of meals efficiently',
        readTime: '6 min read',
        href: '#weekly-strategy',
      },
      {
        title: 'Building a Recipe Collection',
        description: 'Tips for discovering and saving recipes you will love',
        readTime: '5 min read',
        href: '#build-collection',
      },
      {
        title: 'Meal Prep and Batch Cooking',
        description: 'How to use Rowan for efficient meal prep planning',
        readTime: '5 min read',
        href: '#meal-prep',
      },
      {
        title: 'Collaborative Meal Planning',
        description: 'Work together with your partner to plan meals',
        readTime: '4 min read',
        href: '#collaborative',
      },
    ],
  },
];

export default function MealPlanningDocumentation() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">Meal Planning Guide</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Everything you need to master meal planning in Rowan</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">27</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Guides</div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">~2h</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Reading</div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">6</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Topics</div>
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">All</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Skill Levels</div>
            </div>
          </div>
        </div>

        {/* Guide Sections */}
        <div className="space-y-8">
          {guideSections.map((section, sectionIndex) => {
            const Icon = section.icon;
            return (
              <div key={sectionIndex} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                {/* Section Header */}
                <div className={`p-6 bg-gradient-to-r ${section.color}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{section.title}</h2>
                  </div>
                </div>

                {/* Articles */}
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {section.articles.map((article, articleIndex) => (
                    <a
                      key={articleIndex}
                      href={article.href}
                      className="block p-6 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {article.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {article.readTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              Read article
                            </span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                            <span className="text-gray-600 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all">→</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Reference Card */}
        <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Quick Reference: Keyboard Shortcuts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white shadow-sm">N</kbd>
              <span className="text-sm text-gray-600 dark:text-gray-400">Create new meal</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white shadow-sm">R</kbd>
              <span className="text-sm text-gray-600 dark:text-gray-400">Create new recipe</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white shadow-sm">/</kbd>
              <span className="text-sm text-gray-600 dark:text-gray-400">Focus search</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white shadow-sm">1</kbd>
              <span className="text-sm text-gray-600 dark:text-gray-400">Calendar view</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white shadow-sm">2</kbd>
              <span className="text-sm text-gray-600 dark:text-gray-400">List view</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white shadow-sm">3</kbd>
              <span className="text-sm text-gray-600 dark:text-gray-400">Recipes view</span>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Still Have Questions?</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Can't find what you're looking for? Our support team is here to help you get the most out of meal planning.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Contact Support
            </Link>
            <Link
              href="/meals"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-lg transition-colors text-sm font-medium"
            >
              <UtensilsCrossed className="w-4 h-4" />
              Go to Meal Planning
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
