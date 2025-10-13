'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { ArrowLeft, ShoppingCart, BookOpen, Play, Plus, List, Calendar, CheckSquare, Lightbulb, FileText, Grid3x3, Tags, Share2, Clock } from 'lucide-react';

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
    color: 'from-emerald-500 to-emerald-600',
    articles: [
      {
        title: 'Introduction to Shopping Lists',
        description: 'Learn how Rowan helps you organize shopping with smart categories and collaboration',
        readTime: '3 min read',
        href: '#intro',
      },
      {
        title: 'Creating Your First Shopping List',
        description: 'Quick guide to creating and managing shopping lists for your household',
        readTime: '4 min read',
        href: '#first-list',
      },
      {
        title: 'Understanding Categories',
        description: 'How automatic categorization organizes items by Produce, Dairy, Meat, and more',
        readTime: '3 min read',
        href: '#categories',
      },
    ],
  },
  {
    title: 'Creating & Managing Lists',
    icon: Plus,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'Adding Items to Your List',
        description: 'Add items manually with quantities, estimated prices, and category auto-detection',
        readTime: '4 min read',
        href: '#add-items',
      },
      {
        title: 'Organizing with Categories',
        description: 'Use 11 smart categories to organize shopping by store layout',
        readTime: '5 min read',
        href: '#organize-categories',
      },
      {
        title: 'Setting Budgets and Tracking Costs',
        description: 'Set spending limits and track estimated vs actual costs',
        readTime: '4 min read',
        href: '#budgets',
      },
      {
        title: 'Checking Off Items',
        description: 'Mark items as purchased and track progress with visual indicators',
        readTime: '2 min read',
        href: '#check-items',
      },
      {
        title: 'Visual Progress Tracking',
        description: 'Beautiful circular progress rings show completion status at a glance',
        readTime: '2 min read',
        href: '#progress-tracking',
      },
      {
        title: 'Drag & Drop Reordering',
        description: 'Rearrange items by dragging to match your store layout or priorities',
        readTime: '3 min read',
        href: '#drag-drop',
      },
      {
        title: 'Quick Add with Frequent Items',
        description: 'One-click add your most frequently purchased items to save time',
        readTime: '4 min read',
        href: '#frequent-items',
      },
    ],
  },
  {
    title: 'Templates & Reusability',
    icon: FileText,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'Creating Shopping Templates',
        description: 'Save frequently used lists as templates for quick reuse',
        readTime: '4 min read',
        href: '#create-templates',
      },
      {
        title: 'Using Templates',
        description: 'Start new shopping lists from your saved templates in seconds',
        readTime: '3 min read',
        href: '#use-templates',
      },
      {
        title: 'Managing Your Templates',
        description: 'Edit, update, and delete templates as your shopping needs change',
        readTime: '3 min read',
        href: '#manage-templates',
      },
    ],
  },
  {
    title: 'Integration with Other Features',
    icon: Grid3x3,
    color: 'from-indigo-500 to-indigo-600',
    articles: [
      {
        title: 'Scheduling Shopping Trips',
        description: 'Link shopping lists to calendar events with reminders',
        readTime: '5 min read',
        href: '#schedule-trips',
      },
      {
        title: 'Creating Tasks from Lists',
        description: 'Convert shopping lists into trackable tasks with due dates',
        readTime: '4 min read',
        href: '#create-tasks',
      },
      {
        title: 'Viewing Lists in Calendar & Tasks',
        description: 'See your shopping lists integrated across the app',
        readTime: '3 min read',
        href: '#view-integrations',
      },
    ],
  },
  {
    title: 'Collaboration & Sharing',
    icon: Share2,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Real-Time Collaboration',
        description: 'Work on shopping lists together with instant updates for all space members',
        readTime: '4 min read',
        href: '#collaboration',
      },
      {
        title: 'Assigning Store Locations',
        description: 'Tag lists with store names to plan shopping trips effectively',
        readTime: '2 min read',
        href: '#store-locations',
      },
    ],
  },
  {
    title: 'Tips & Best Practices',
    icon: Lightbulb,
    color: 'from-yellow-500 to-yellow-600',
    articles: [
      {
        title: 'Effective Shopping List Organization',
        description: 'Pro tips for creating efficient, well-organized shopping lists',
        readTime: '5 min read',
        href: '#tips-organization',
      },
      {
        title: 'Using Filters and Search',
        description: 'Quickly find lists by status, date, or search terms',
        readTime: '3 min read',
        href: '#filters-search',
      },
      {
        title: 'Maximizing Template Benefits',
        description: 'Best practices for creating reusable templates',
        readTime: '4 min read',
        href: '#tips-templates',
      },
    ],
  },
];

export default function ShoppingDocumentation() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Shopping Lists Guide</h1>
              <p className="text-white/90 text-lg">
                Master collaborative shopping with smart categories, templates, and integrations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {guideSections.map((section) => (
            <div
              key={section.title}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className={`bg-gradient-to-r ${section.color} p-6 text-white`}>
                <div className="flex items-center gap-3 mb-2">
                  <section.icon className="w-6 h-6" />
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {section.articles.map((article) => (
                  <a
                    key={article.title}
                    href={article.href}
                    className="block p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-100 dark:border-gray-700"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {article.description}
                    </p>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {article.readTime}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Detailed Content */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl shadow-lg p-8 space-y-12 border border-gray-200 dark:border-gray-700">
          {/* Getting Started */}
          <section id="intro" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
              <Play className="w-8 h-8 text-emerald-500" />
              Introduction to Shopping Lists
            </h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                Rowan's Shopping Lists feature helps you organize household shopping with powerful collaboration tools, smart categorization, and seamless integration with your calendar and tasks.
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Key Features</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Smart Categorization:</strong> Items are automatically organized into 11 categories (Produce, Dairy, Meat & Seafood, Bakery, Pantry, Frozen, Beverages, Snacks, Personal Care, Household, Other)</li>
                <li><strong>Real-Time Collaboration:</strong> All space members see updates instantly when items are added or checked off</li>
                <li><strong>Reusable Templates:</strong> Save frequently used lists as templates for quick reuse</li>
                <li><strong>Calendar Integration:</strong> Schedule shopping trips as calendar events with reminders</li>
                <li><strong>Task Integration:</strong> Create trackable tasks for shopping trips</li>
                <li><strong>Budget Tracking:</strong> Set spending limits and track estimated vs actual costs</li>
                <li><strong>Progress Indicators:</strong> Visual progress bars show completion status</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="first-list" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Creating Your First Shopping List</h2>
            <div className="prose dark:prose-invert max-w-none">
              <ol className="space-y-4 text-gray-700 dark:text-gray-300">
                <li>
                  <strong>Navigate to Shopping Lists:</strong> Click "Shopping Lists" in the main navigation
                </li>
                <li>
                  <strong>Click "Create Shopping List":</strong> You'll see two options:
                  <ul className="mt-2 space-y-1 ml-4">
                    <li><strong>Start with Empty List:</strong> Create a new list from scratch</li>
                    <li><strong>Choose a Template:</strong> Use a saved template as your starting point</li>
                  </ul>
                </li>
                <li>
                  <strong>Fill in Details:</strong>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li><strong>Title:</strong> Give your list a descriptive name (e.g., "Weekly Groceries", "Biryan Dinner")</li>
                    <li><strong>Description (optional):</strong> Add notes about the shopping trip</li>
                    <li><strong>Store (optional):</strong> Specify where you'll shop</li>
                    <li><strong>Budget (optional):</strong> Set a spending limit</li>
                  </ul>
                </li>
                <li>
                  <strong>Add Items:</strong> Click "Add Item" and enter:
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>Item name (e.g., "milk", "tomatoes", "chicken breast")</li>
                    <li>Quantity (defaults to 1)</li>
                    <li>Estimated price (optional)</li>
                    <li>Category is auto-detected but can be changed</li>
                  </ul>
                </li>
                <li>
                  <strong>Save Your List:</strong> Click "Create List" and you're done!
                </li>
              </ol>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="categories" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Understanding Categories</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Rowan automatically categorizes items to match typical store layouts, making shopping faster and more efficient:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="text-2xl mb-2">🥬</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Produce</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Fruits, vegetables, herbs</p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl mb-2">🥛</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Dairy</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Milk, cheese, yogurt, eggs</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="text-2xl mb-2">🥩</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Meat & Seafood</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Chicken, beef, fish, pork</p>
                </div>
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="text-2xl mb-2">🍞</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Bakery</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Bread, pastries, cakes</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                <strong>Auto-detection covers 100+ common items</strong> including milk, bread, chicken, tomatoes, and more. If the category isn't detected correctly, you can manually change it when adding or editing items.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="add-items" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Adding Items to Your List</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                You can add items when creating a new list or edit existing lists to add more items:
              </p>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li><strong>Click "Add Item"</strong> in the item section</li>
                <li><strong>Enter the item name</strong> - as you type common items like "milk" or "chicken", the category is automatically detected</li>
                <li><strong>Set quantity</strong> - specify how many you need (e.g., 2 liters, 3 pounds)</li>
                <li><strong>Add estimated price (optional)</strong> - helps track against your budget</li>
                <li><strong>Review the auto-detected category</strong> - change if needed</li>
                <li><strong>Click "Add"</strong> to add the item to your list</li>
              </ol>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mt-4">
                <p className="text-emerald-700 dark:text-emerald-300 text-sm">
                  <strong>💡 Pro Tip:</strong> When adding items, be specific (e.g., "2% milk" vs "milk") to make shopping easier for everyone in your household.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="organize-categories" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Organizing with Categories</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Items in your shopping lists are automatically grouped by category, matching typical store layouts:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>🥬 Produce:</strong> Fruits, vegetables, fresh herbs</li>
                <li><strong>🥛 Dairy:</strong> Milk, cheese, yogurt, butter, eggs</li>
                <li><strong>🥩 Meat & Seafood:</strong> Chicken, beef, pork, fish, shrimp</li>
                <li><strong>🍞 Bakery:</strong> Bread, rolls, bagels, pastries</li>
                <li><strong>🥫 Pantry:</strong> Canned goods, pasta, rice, spices, oils</li>
                <li><strong>🧊 Frozen:</strong> Ice cream, frozen vegetables, frozen meals</li>
                <li><strong>🥤 Beverages:</strong> Water, juice, soda, coffee, tea</li>
                <li><strong>🍿 Snacks:</strong> Chips, cookies, candy, crackers</li>
                <li><strong>🧴 Personal Care:</strong> Soap, shampoo, toothpaste</li>
                <li><strong>🧹 Household:</strong> Cleaning supplies, paper products</li>
                <li><strong>📦 Other:</strong> Anything that doesn't fit above categories</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                When viewing a list, items are displayed grouped by category with section headers, making it easy to navigate the store efficiently.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="budgets" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Setting Budgets and Tracking Costs</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Keep your spending on track by setting budgets and tracking costs:
              </p>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li><strong>Set a Budget:</strong> When creating or editing a list, enter your budget amount</li>
                <li><strong>Add Estimated Prices:</strong> As you add items, include estimated prices</li>
                <li><strong>Monitor Your Total:</strong> The list card shows "💰 $X.XX / $XX.XX" (estimated vs budget)</li>
                <li><strong>Get Visual Feedback:</strong> The budget display changes color if you're approaching or exceeding your limit</li>
              </ol>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  <strong>💰 Budget Tip:</strong> Set realistic budgets based on historical shopping trips. You can view your spending patterns in Settings > Analytics > Shopping.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="check-items" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Checking Off Items</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                As you shop, mark items as purchased to track your progress:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Individual Items:</strong> Click the checkbox next to any item to mark it as purchased (checked items show with a green checkmark and strikethrough)</li>
                <li><strong>Complete List:</strong> Click the checkbox at the top of the list card to mark all items as complete at once</li>
                <li><strong>Progress Bar:</strong> A visual progress bar shows how many items you've checked off</li>
                <li><strong>Item Count:</strong> The card displays "X of Y items" checked</li>
              </ul>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mt-4">
                <p className="text-emerald-700 dark:text-emerald-300 text-sm">
                  <strong>🛒 Shopping Tip:</strong> Use real-time collaboration! When shopping with your partner, you can each check off items as you go through different aisles.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="progress-tracking" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Visual Progress Tracking</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Every shopping list features a beautiful circular progress ring that shows your completion status at a glance:
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Progress Ring Features</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Real-Time Updates:</strong> The ring animates smoothly as you check off items</li>
                <li><strong>Percentage Display:</strong> Shows exact completion % inside the ring</li>
                <li><strong>Color-Coded:</strong> Emerald green matches your shopping list theme</li>
                <li><strong>Hover for Details:</strong> Tooltip shows "X of Y items checked"</li>
                <li><strong>Apple-Style Design:</strong> Smooth animations with perfect timing</li>
              </ul>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  <strong>💡 Pro Tip:</strong> The progress ring makes it easy to see which lists need attention. An empty ring (0%) means you haven't started, while a full ring (100%) means you're done!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="drag-drop" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Drag & Drop Reordering</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Rearrange your shopping list items by dragging them to match your store's layout or your personal priorities:
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">How to Reorder Items</h3>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li><strong>Look for the Grip Icon:</strong> Each item has a vertical grip icon (⋮⋮) on the left</li>
                <li><strong>Click and Hold:</strong> Click and hold the grip icon to start dragging</li>
                <li><strong>Drag to New Position:</strong> Move the item up or down to your desired position</li>
                <li><strong>Release to Drop:</strong> Let go to place the item in its new spot</li>
                <li><strong>Auto-Saves:</strong> Your new order is saved automatically</li>
              </ol>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Why Reorder?</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Match Store Layout:</strong> Arrange items in the order you encounter them in your store</li>
                <li><strong>Priority Items First:</strong> Put must-have items at the top so you don't forget them</li>
                <li><strong>Group Related Items:</strong> Keep similar items together even across categories</li>
                <li><strong>Personal Preference:</strong> Organize however makes sense for you!</li>
              </ul>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mt-4">
                <p className="text-purple-700 dark:text-purple-300 text-sm">
                  <strong>✨ Design Note:</strong> Dragging provides smooth visual feedback with shadows and scale effects, making reordering feel natural and responsive—just like Apple's interfaces.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="frequent-items" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Quick Add with Frequent Items</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Save time with the Quick Add panel that shows your most frequently purchased items based on your shopping history:
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">How It Works</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Analyzes Last 30 Days:</strong> Looks at your most recent shopping history</li>
                <li><strong>Shows Top 12 Items:</strong> Displays your most frequently added items</li>
                <li><strong>Purchase Count Badges:</strong> Small badges show how many times you've bought each item</li>
                <li><strong>One-Click Add:</strong> Click any item to instantly add it to your active list</li>
                <li><strong>Auto-Categorized:</strong> Items maintain their category for proper organization</li>
              </ul>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Smart Behavior</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Updates Dynamically:</strong> Your frequent items change as your shopping habits evolve</li>
                <li><strong>Fades Out Old Items:</strong> Items you stop buying gradually disappear after 30 days</li>
                <li><strong>Promotes New Habits:</strong> Items you start buying frequently will appear in the panel</li>
                <li><strong>Creates List if Needed:</strong> If you have no active lists, clicking an item creates a "Quick Add List"</li>
                <li><strong>Adds to Active List:</strong> If you have active lists, items are added to the first one</li>
              </ul>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Panel Features</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Collapsible:</strong> Click the ✕ button to collapse and save screen space</li>
                <li><strong>Category Icons:</strong> Each item shows its category icon for quick identification</li>
                <li><strong>Hover Effects:</strong> Items scale up slightly on hover with smooth animations</li>
                <li><strong>Responsive Grid:</strong> Adapts from 2 columns on mobile to 6 columns on wide screens</li>
              </ul>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mt-4">
                <p className="text-emerald-700 dark:text-emerald-300 text-sm">
                  <strong>⚡ Time Saver:</strong> The Quick Add panel is like having your shopping assistant remember what you buy regularly. It learns your habits and makes list creation effortless!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="create-templates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Creating Shopping Templates</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Save time by creating reusable templates for lists you shop regularly:
              </p>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li><strong>Create a complete shopping list</strong> with all the items you typically need</li>
                <li><strong>Open the list menu</strong> (⋮ button) on the list card</li>
                <li><strong>Click "Save as Template"</strong></li>
                <li><strong>Enter a template name</strong> (e.g., "Weekly Groceries", "Monthly Costco Run")</li>
                <li><strong>Add a description (optional)</strong> to help identify the template later</li>
                <li><strong>Click "Save Template"</strong></li>
              </ol>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                Your template will save all items with their categories and quantities, making it perfect for recurring shopping trips.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="use-templates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Using Templates</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Start new shopping lists from your saved templates in seconds:
              </p>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li><strong>Click "Create Shopping List"</strong></li>
                <li><strong>Choose "Choose a Template"</strong> instead of starting fresh</li>
                <li><strong>Browse your templates</strong> - each shows the number of items included</li>
                <li><strong>Click a template</strong> to create a new list with all those items pre-filled</li>
                <li><strong>Review and adjust</strong> the list (add/remove items, change quantities)</li>
                <li><strong>Save the list</strong> and start shopping!</li>
              </ol>
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mt-4">
                <p className="text-purple-700 dark:text-purple-300 text-sm">
                  <strong>⚡ Time Saver:</strong> Create templates for different scenarios: "Weekly Groceries", "Party Supplies", "Holiday Baking", "Camping Trip". You'll never start from scratch again!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="manage-templates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Managing Your Templates</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Templates can be updated or removed as your shopping needs change:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>View Templates:</strong> When creating a new list, you'll see all your saved templates</li>
                <li><strong>Update a Template:</strong> Create a new list from the template, modify it, and save it as a template again with the same name (it will replace the old one)</li>
                <li><strong>Delete a Template:</strong> Templates can be managed through the template picker modal</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                Templates are shared within your space, so all household members can use them!
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="schedule-trips" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Scheduling Shopping Trips</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Link your shopping lists to calendar events to plan trips ahead:
              </p>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li><strong>Open the list menu</strong> (⋮ button) on any shopping list</li>
                <li><strong>Click "📅 Schedule Shopping Trip"</strong></li>
                <li><strong>Fill in the details:</strong>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>Event title (defaults to "Shopping Trip: [List Name]")</li>
                    <li>Date and time for your shopping trip</li>
                    <li>Duration (how long you expect it to take)</li>
                    <li>Reminder (15 min, 30 min, 1 hour, etc. before the trip)</li>
                  </ul>
                </li>
                <li><strong>Click "Schedule Trip"</strong></li>
              </ol>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                The shopping trip will appear as a calendar event with your shopping list linked. If your list has a store name, it's automatically added as the event location!
              </p>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mt-4">
                <p className="text-indigo-700 dark:text-indigo-300 text-sm">
                  <strong>📅 Calendar Integration:</strong> Navigate to your Calendar to see all scheduled shopping trips. Click on the event to see the full shopping list with item count!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="create-tasks" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Creating Tasks from Lists</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Convert shopping lists into trackable tasks for better accountability:
              </p>
              <ol className="space-y-3 text-gray-700 dark:text-gray-300">
                <li><strong>Open the list menu</strong> (⋮ button) on any shopping list</li>
                <li><strong>Click "✓ Create Task"</strong></li>
                <li><strong>A task is instantly created</strong> titled "Complete shopping: [List Name]"</li>
                <li><strong>The task includes:</strong>
                  <ul className="mt-2 space-y-1 ml-4">
                    <li>Item count in the description</li>
                    <li>Store name (if specified)</li>
                    <li>Medium priority by default</li>
                    <li>Link to the shopping list</li>
                  </ul>
                </li>
              </ol>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                Navigate to your Tasks page to see the task. You can edit it to add a due date, change priority, or assign it to someone.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  <strong>✅ Task Integration:</strong> Tasks show the linked shopping list with a 🛒 icon. Click it to jump straight to the Shopping Lists page!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="view-integrations" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Viewing Lists in Calendar & Tasks</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Your shopping lists are seamlessly integrated throughout Rowan:
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">In Calendar</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>Scheduled shopping trips appear as calendar events</li>
                <li>Each event shows the linked shopping list with 🛒 icon and item count</li>
                <li>Click the shopping list link to view the full list</li>
                <li>The event location shows the store name (if specified)</li>
              </ul>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">In Tasks</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>Shopping-related tasks show the linked list below the task details</li>
                <li>The shopping list appears with 🛒 icon and item count</li>
                <li>Click the link to navigate to the full shopping list</li>
                <li>Mark the task complete when shopping is done</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="collaboration" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Real-Time Collaboration</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Shopping lists are shared with all members of your space, with instant updates:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Instant Updates:</strong> When anyone adds an item, checks something off, or modifies the list, everyone sees the change immediately</li>
                <li><strong>Concurrent Shopping:</strong> Multiple people can shop at the same time, checking off items as they go</li>
                <li><strong>No Conflicts:</strong> The real-time sync prevents duplicate purchases</li>
                <li><strong>Shared Templates:</strong> Templates created by any member are available to everyone</li>
              </ul>
              <div className="bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg p-4 mt-4">
                <p className="text-pink-700 dark:text-pink-300 text-sm">
                  <strong>👥 Collaboration Tip:</strong> One person can create the list and schedule the trip, while another can add items throughout the week. When shopping day arrives, both people can shop different sections and check items off in real-time!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="store-locations" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Assigning Store Locations</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Tag lists with store names to organize shopping trips:
              </p>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Add store name</strong> when creating or editing a list</li>
                <li><strong>Store badge</strong> appears on the list card with 🏪 icon</li>
                <li><strong>Calendar integration</strong> uses store name as event location</li>
                <li><strong>Filter by store</strong> to see which lists are for specific stores</li>
              </ul>
              <p className="text-gray-700 dark:text-gray-300 mt-4">
                Examples: "Whole Foods", "Costco", "Target", "Trader Joe's"
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="tips-organization" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Effective Shopping List Organization</h2>
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Best Practices</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Use descriptive titles:</strong> "Weekly Groceries - June 15" is better than "Shopping"</li>
                <li><strong>Include quantities:</strong> "2 gallons" instead of just "milk"</li>
                <li><strong>Add store names:</strong> Helps differentiate lists when you shop at multiple stores</li>
                <li><strong>Set realistic budgets:</strong> Review past lists to set appropriate spending limits</li>
                <li><strong>Add prices as you shop:</strong> Build a price database for better budgeting</li>
                <li><strong>Complete lists promptly:</strong> Mark lists complete after shopping to keep your view clean</li>
                <li><strong>Review before shopping:</strong> Check the list one more time before leaving</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="filters-search" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Using Filters and Search</h2>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Quickly find lists using the built-in filters and search:
              </p>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Filter Options</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>All:</strong> Shows all shopping lists</li>
                <li><strong>Active:</strong> Lists that are in progress</li>
                <li><strong>Completed:</strong> Lists where all items are checked off</li>
                <li><strong>This Week:</strong> Lists created in the past 7 days (highlighted with emerald gradient)</li>
              </ul>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6 mb-3">Search</h3>
              <p className="text-gray-700 dark:text-gray-300">
                Use the search box to find lists by title, description, or store name. Search is instant and works with partial matches.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="tips-templates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Maximizing Template Benefits</h2>
            <div className="prose dark:prose-invert max-w-none">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Template Ideas</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Weekly Groceries:</strong> Your standard weekly shopping items</li>
                <li><strong>Monthly Bulk Run:</strong> Costco/Sam's Club bulk items you buy monthly</li>
                <li><strong>Party Supplies:</strong> Standard items for hosting parties</li>
                <li><strong>Holiday Baking:</strong> Ingredients you need for holiday baking</li>
                <li><strong>Breakfast Restock:</strong> Weekly breakfast essentials</li>
                <li><strong>Kids' Lunch Items:</strong> School lunch supplies</li>
                <li><strong>Camping Trip:</strong> Everything you need for camping</li>
              </ul>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mt-4">
                <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                  <strong>💡 Pro Tip:</strong> Start with a basic template and refine it over time. After each shopping trip, note what was missing or unnecessary, then update your template accordingly.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 dark:text-gray-400">
          <p>Need more help? Check out other <Link href="/settings/documentation" className="text-emerald-600 dark:text-emerald-400 hover:underline">documentation guides</Link></p>
        </div>
      </div>
    </div>
    </>
  );
}
