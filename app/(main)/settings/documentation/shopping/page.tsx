'use client';

import Link from 'next/link';

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 from-gray-900 to-gray-800">
      {/* Header */}
      <div className="mb-8">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-emerald-400 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Shopping Lists Guide
              </h1>
              <p className="text-gray-400 mt-1">
                Complete guide to managing household shopping with smart features
              </p>
            </div>
          </div>

          <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-emerald-100 mb-2">
                  Welcome to Shopping Lists
                </h3>
                <p className="text-emerald-200 mb-3">
                  Rowan helps you organize household shopping with powerful collaboration features:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-emerald-300">
                  <div className="flex items-start gap-2">
                    <Tags className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Smart Categories</strong> - 11 auto-categorized sections</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Templates</strong> - Reusable lists for recurring shopping</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Real-time sync</strong> - Instant updates for all members</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <BookOpen className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Budget tracking</strong> - Set limits and track spending</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Grid3x3 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Drag & drop</strong> - Reorder items to match store layout</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Progress rings</strong> - Beautiful visual completion indicators</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Calendar sync</strong> - Schedule shopping trips with reminders</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <List className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Task integration</strong> - Convert lists to trackable tasks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {guideSections.map((section) => (
            <div
              key={section.title}
              className="bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-700"
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
                    className="block p-4 rounded-lg hover:bg-gray-700 transition-colors border border-gray-700"
                  >
                    <h3 className="font-semibold text-white mb-1">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">
                      {article.description}
                    </p>
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
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
        <div className="bg-gray-800 rounded-xl shadow-lg p-8 space-y-12 border border-gray-700">
          {/* Getting Started */}
          <section id="intro" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-3">
              <Play className="w-8 h-8 text-emerald-500" />
              Introduction to Shopping Lists
            </h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 leading-relaxed mb-4">
                Rowan's Shopping Lists feature helps you organize household shopping with powerful collaboration tools, smart categorization, and seamless integration with your calendar and tasks.
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Key Features</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Smart Categorization:</strong> Items are automatically organized into 11 categories (Produce, Dairy, Meat & Seafood, Bakery, Pantry, Frozen, Beverages, Snacks, Personal Care, Household, Other)</li>
                <li><strong>Real-Time Collaboration:</strong> All space members see updates instantly when items are added or checked off</li>
                <li><strong>Reusable Templates:</strong> Save frequently used lists as templates for quick reuse</li>
                <li><strong>Calendar Integration:</strong> Schedule shopping trips as calendar events with reminders</li>
                <li><strong>Task Integration:</strong> Create trackable tasks for shopping trips</li>
                <li><strong>Budget Tracking:</strong> Set spending limits and track estimated vs actual costs</li>
                <li><strong>Progress Indicators:</strong> Visual progress bars show completion status</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="first-list" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Creating Your First Shopping List</h2>
            <div className="prose prose-invert max-w-none">
              <ol className="space-y-4 text-gray-300">
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
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="categories" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Understanding Categories</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Rowan automatically categorizes items to match typical store layouts, making shopping faster and more efficient:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                <div className="p-4 bg-emerald-900/20 rounded-lg border border-emerald-800">
                  <div className="text-2xl mb-2">🥬</div>
                  <h4 className="font-semibold text-white">Produce</h4>
                  <p className="text-sm text-gray-400">Fruits, vegetables, herbs</p>
                </div>
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <div className="text-2xl mb-2">🥛</div>
                  <h4 className="font-semibold text-white">Dairy</h4>
                  <p className="text-sm text-gray-400">Milk, cheese, yogurt, eggs</p>
                </div>
                <div className="p-4 bg-red-900/20 rounded-lg border border-red-800">
                  <div className="text-2xl mb-2">🥩</div>
                  <h4 className="font-semibold text-white">Meat & Seafood</h4>
                  <p className="text-sm text-gray-400">Chicken, beef, fish, pork</p>
                </div>
                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-800">
                  <div className="text-2xl mb-2">🍞</div>
                  <h4 className="font-semibold text-white">Bakery</h4>
                  <p className="text-sm text-gray-400">Bread, pastries, cakes</p>
                </div>
              </div>
              <p className="text-gray-300 mt-4">
                <strong>Auto-detection covers 100+ common items</strong> including milk, bread, chicken, tomatoes, and more. If the category isn't detected correctly, you can manually change it when adding or editing items.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="add-items" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Adding Items to Your List</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                You can add items when creating a new list or edit existing lists to add more items:
              </p>
              <ol className="space-y-3 text-gray-300">
                <li><strong>Click "Add Item"</strong> in the item section</li>
                <li><strong>Enter the item name</strong> - as you type common items like "milk" or "chicken", the category is automatically detected</li>
                <li><strong>Set quantity</strong> - specify how many you need (e.g., 2 liters, 3 pounds)</li>
                <li><strong>Add estimated price (optional)</strong> - helps track against your budget</li>
                <li><strong>Review the auto-detected category</strong> - change if needed</li>
                <li><strong>Click "Add"</strong> to add the item to your list</li>
              </ol>
              <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 mt-4">
                <p className="text-emerald-300 text-sm">
                  <strong>💡 Pro Tip:</strong> When adding items, be specific (e.g., "2% milk" vs "milk") to make shopping easier for everyone in your household.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="organize-categories" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Organizing with Categories</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Items in your shopping lists are automatically grouped by category, matching typical store layouts:
              </p>
              <ul className="space-y-2 text-gray-300">
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
              <p className="text-gray-300 mt-4">
                When viewing a list, items are displayed grouped by category with section headers, making it easy to navigate the store efficiently.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="budgets" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Setting Budgets and Tracking Costs</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Keep your spending on track by setting budgets and tracking costs:
              </p>
              <ol className="space-y-3 text-gray-300">
                <li><strong>Set a Budget:</strong> When creating or editing a list, enter your budget amount</li>
                <li><strong>Add Estimated Prices:</strong> As you add items, include estimated prices</li>
                <li><strong>Monitor Your Total:</strong> The list card shows "💰 $X.XX / $XX.XX" (estimated vs budget)</li>
                <li><strong>Get Visual Feedback:</strong> The budget display changes color if you're approaching or exceeding your limit</li>
              </ol>
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-300 text-sm">
                  <strong>💰 Budget Tip:</strong> Set realistic budgets based on historical shopping trips. You can view your spending patterns in Settings {'>'}  Analytics {'>'} Shopping.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="check-items" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Checking Off Items</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                As you shop, mark items as purchased to track your progress:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Individual Items:</strong> Click the checkbox next to any item to mark it as purchased (checked items show with a green checkmark and strikethrough)</li>
                <li><strong>Complete List:</strong> Click the checkbox at the top of the list card to mark all items as complete at once</li>
                <li><strong>Progress Bar:</strong> A visual progress bar shows how many items you've checked off</li>
                <li><strong>Item Count:</strong> The card displays "X of Y items" checked</li>
              </ul>
              <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 mt-4">
                <p className="text-emerald-300 text-sm">
                  <strong>🛒 Shopping Tip:</strong> Use real-time collaboration! When shopping with your partner, you can each check off items as you go through different aisles.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="progress-tracking" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Visual Progress Tracking</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Every shopping list features a beautiful circular progress ring that shows your completion status at a glance:
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Progress Ring Features</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Real-Time Updates:</strong> The ring animates smoothly as you check off items</li>
                <li><strong>Percentage Display:</strong> Shows exact completion % inside the ring</li>
                <li><strong>Color-Coded:</strong> Emerald green matches your shopping list theme</li>
                <li><strong>Hover for Details:</strong> Tooltip shows "X of Y items checked"</li>
                <li><strong>Apple-Style Design:</strong> Smooth animations with perfect timing</li>
              </ul>
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-300 text-sm">
                  <strong>💡 Pro Tip:</strong> The progress ring makes it easy to see which lists need attention. An empty ring (0%) means you haven't started, while a full ring (100%) means you're done!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="drag-drop" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Drag & Drop Reordering</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Rearrange your shopping list items by dragging them to match your store's layout or your personal priorities:
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How to Reorder Items</h3>
              <ol className="space-y-3 text-gray-300">
                <li><strong>Look for the Grip Icon:</strong> Each item has a vertical grip icon (⋮⋮) on the left</li>
                <li><strong>Click and Hold:</strong> Click and hold the grip icon to start dragging</li>
                <li><strong>Drag to New Position:</strong> Move the item up or down to your desired position</li>
                <li><strong>Release to Drop:</strong> Let go to place the item in its new spot</li>
                <li><strong>Auto-Saves:</strong> Your new order is saved automatically</li>
              </ol>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Why Reorder?</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Match Store Layout:</strong> Arrange items in the order you encounter them in your store</li>
                <li><strong>Priority Items First:</strong> Put must-have items at the top so you don't forget them</li>
                <li><strong>Group Related Items:</strong> Keep similar items together even across categories</li>
                <li><strong>Personal Preference:</strong> Organize however makes sense for you!</li>
              </ul>
              <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mt-4">
                <p className="text-purple-300 text-sm">
                  <strong>✨ Design Note:</strong> Dragging provides smooth visual feedback with shadows and scale effects, making reordering feel natural and responsive—just like Apple's interfaces.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="frequent-items" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Quick Add with Frequent Items</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Save time with the Quick Add panel that shows your most frequently purchased items based on your shopping history:
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">How It Works</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Analyzes Last 30 Days:</strong> Looks at your most recent shopping history</li>
                <li><strong>Shows Top 12 Items:</strong> Displays your most frequently added items</li>
                <li><strong>Purchase Count Badges:</strong> Small badges show how many times you've bought each item</li>
                <li><strong>One-Click Add:</strong> Click any item to instantly add it to your active list</li>
                <li><strong>Auto-Categorized:</strong> Items maintain their category for proper organization</li>
              </ul>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Smart Behavior</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Updates Dynamically:</strong> Your frequent items change as your shopping habits evolve</li>
                <li><strong>Fades Out Old Items:</strong> Items you stop buying gradually disappear after 30 days</li>
                <li><strong>Promotes New Habits:</strong> Items you start buying frequently will appear in the panel</li>
                <li><strong>Creates List if Needed:</strong> If you have no active lists, clicking an item creates a "Quick Add List"</li>
                <li><strong>Adds to Active List:</strong> If you have active lists, items are added to the first one</li>
              </ul>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Panel Features</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Collapsible:</strong> Click the ✕ button to collapse and save screen space</li>
                <li><strong>Category Icons:</strong> Each item shows its category icon for quick identification</li>
                <li><strong>Hover Effects:</strong> Items scale up slightly on hover with smooth animations</li>
                <li><strong>Responsive Grid:</strong> Adapts from 2 columns on mobile to 6 columns on wide screens</li>
              </ul>
              <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 mt-4">
                <p className="text-emerald-300 text-sm">
                  <strong>⚡ Time Saver:</strong> The Quick Add panel is like having your shopping assistant remember what you buy regularly. It learns your habits and makes list creation effortless!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="create-templates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Creating Shopping Templates</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Save time by creating reusable templates for lists you shop regularly:
              </p>
              <ol className="space-y-3 text-gray-300">
                <li><strong>Create a complete shopping list</strong> with all the items you typically need</li>
                <li><strong>Open the list menu</strong> (⋮ button) on the list card</li>
                <li><strong>Click "Save as Template"</strong></li>
                <li><strong>Enter a template name</strong> (e.g., "Weekly Groceries", "Monthly Costco Run")</li>
                <li><strong>Add a description (optional)</strong> to help identify the template later</li>
                <li><strong>Click "Save Template"</strong></li>
              </ol>
              <p className="text-gray-300 mt-4">
                Your template will save all items with their categories and quantities, making it perfect for recurring shopping trips.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="use-templates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Using Templates</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Start new shopping lists from your saved templates in seconds:
              </p>
              <ol className="space-y-3 text-gray-300">
                <li><strong>Click "Create Shopping List"</strong></li>
                <li><strong>Choose "Choose a Template"</strong> instead of starting fresh</li>
                <li><strong>Browse your templates</strong> - each shows the number of items included</li>
                <li><strong>Click a template</strong> to create a new list with all those items pre-filled</li>
                <li><strong>Review and adjust</strong> the list (add/remove items, change quantities)</li>
                <li><strong>Save the list</strong> and start shopping!</li>
              </ol>
              <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4 mt-4">
                <p className="text-purple-300 text-sm">
                  <strong>⚡ Time Saver:</strong> Create templates for different scenarios: "Weekly Groceries", "Party Supplies", "Holiday Baking", "Camping Trip". You'll never start from scratch again!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="manage-templates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Managing Your Templates</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Templates can be updated or removed as your shopping needs change:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li><strong>View Templates:</strong> When creating a new list, you'll see all your saved templates</li>
                <li><strong>Update a Template:</strong> Create a new list from the template, modify it, and save it as a template again with the same name (it will replace the old one)</li>
                <li><strong>Delete a Template:</strong> Templates can be managed through the template picker modal</li>
              </ul>
              <p className="text-gray-300 mt-4">
                Templates are shared within your space, so all household members can use them!
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="schedule-trips" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Scheduling Shopping Trips</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Link your shopping lists to calendar events to plan trips ahead:
              </p>
              <ol className="space-y-3 text-gray-300">
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
              <p className="text-gray-300 mt-4">
                The shopping trip will appear as a calendar event with your shopping list linked. If your list has a store name, it's automatically added as the event location!
              </p>
              <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-4 mt-4">
                <p className="text-indigo-300 text-sm">
                  <strong>📅 Calendar Integration:</strong> Navigate to your Calendar to see all scheduled shopping trips. Click on the event to see the full shopping list with item count!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="create-tasks" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Creating Tasks from Lists</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Convert shopping lists into trackable tasks for better accountability:
              </p>
              <ol className="space-y-3 text-gray-300">
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
              <p className="text-gray-300 mt-4">
                Navigate to your Tasks page to see the task. You can edit it to add a due date, change priority, or assign it to someone.
              </p>
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mt-4">
                <p className="text-blue-300 text-sm">
                  <strong>✅ Task Integration:</strong> Tasks show the linked shopping list with a 🛒 icon. Click it to jump straight to the Shopping Lists page!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="view-integrations" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Viewing Lists in Calendar & Tasks</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Your shopping lists are seamlessly integrated throughout Rowan:
              </p>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">In Calendar</h3>
              <ul className="space-y-2 text-gray-300">
                <li>Scheduled shopping trips appear as calendar events</li>
                <li>Each event shows the linked shopping list with 🛒 icon and item count</li>
                <li>Click the shopping list link to view the full list</li>
                <li>The event location shows the store name (if specified)</li>
              </ul>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">In Tasks</h3>
              <ul className="space-y-2 text-gray-300">
                <li>Shopping-related tasks show the linked list below the task details</li>
                <li>The shopping list appears with 🛒 icon and item count</li>
                <li>Click the link to navigate to the full shopping list</li>
                <li>Mark the task complete when shopping is done</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="collaboration" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Real-Time Collaboration</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Shopping lists are shared with all members of your space, with instant updates:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Instant Updates:</strong> When anyone adds an item, checks something off, or modifies the list, everyone sees the change immediately</li>
                <li><strong>Concurrent Shopping:</strong> Multiple people can shop at the same time, checking off items as they go</li>
                <li><strong>No Conflicts:</strong> The real-time sync prevents duplicate purchases</li>
                <li><strong>Shared Templates:</strong> Templates created by any member are available to everyone</li>
              </ul>
              <div className="bg-pink-900/20 border border-pink-800 rounded-lg p-4 mt-4">
                <p className="text-pink-300 text-sm">
                  <strong>👥 Collaboration Tip:</strong> One person can create the list and schedule the trip, while another can add items throughout the week. When shopping day arrives, both people can shop different sections and check items off in real-time!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="store-locations" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Assigning Store Locations</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Tag lists with store names to organize shopping trips:
              </p>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Add store name</strong> when creating or editing a list</li>
                <li><strong>Store badge</strong> appears on the list card with 🏪 icon</li>
                <li><strong>Calendar integration</strong> uses store name as event location</li>
                <li><strong>Filter by store</strong> to see which lists are for specific stores</li>
              </ul>
              <p className="text-gray-300 mt-4">
                Examples: "Whole Foods", "Costco", "Target", "Trader Joe's"
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="tips-organization" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Effective Shopping List Organization</h2>
            <div className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold text-white mb-3">Best Practices</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Use descriptive titles:</strong> "Weekly Groceries - June 15" is better than "Shopping"</li>
                <li><strong>Include quantities:</strong> "2 gallons" instead of just "milk"</li>
                <li><strong>Add store names:</strong> Helps differentiate lists when you shop at multiple stores</li>
                <li><strong>Set realistic budgets:</strong> Review past lists to set appropriate spending limits</li>
                <li><strong>Add prices as you shop:</strong> Build a price database for better budgeting</li>
                <li><strong>Complete lists promptly:</strong> Mark lists complete after shopping to keep your view clean</li>
                <li><strong>Review before shopping:</strong> Check the list one more time before leaving</li>
              </ul>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="filters-search" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Using Filters and Search</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">
                Quickly find lists using the built-in filters and search:
              </p>
              <h3 className="text-xl font-semibold text-white mb-3">Filter Options</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>All:</strong> Shows all shopping lists</li>
                <li><strong>Active:</strong> Lists that are in progress</li>
                <li><strong>Completed:</strong> Lists where all items are checked off</li>
                <li><strong>This Week:</strong> Lists created in the past 7 days (highlighted with emerald gradient)</li>
              </ul>
              <h3 className="text-xl font-semibold text-white mt-6 mb-3">Search</h3>
              <p className="text-gray-300">
                Use the search box to find lists by title, description, or store name. Search is instant and works with partial matches.
              </p>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="tips-templates" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Maximizing Template Benefits</h2>
            <div className="prose prose-invert max-w-none">
              <h3 className="text-xl font-semibold text-white mb-3">Template Ideas</h3>
              <ul className="space-y-2 text-gray-300">
                <li><strong>Weekly Groceries:</strong> Your standard weekly shopping items</li>
                <li><strong>Monthly Bulk Run:</strong> Costco/Sam's Club bulk items you buy monthly</li>
                <li><strong>Party Supplies:</strong> Standard items for hosting parties</li>
                <li><strong>Holiday Baking:</strong> Ingredients you need for holiday baking</li>
                <li><strong>Breakfast Restock:</strong> Weekly breakfast essentials</li>
                <li><strong>Kids' Lunch Items:</strong> School lunch supplies</li>
                <li><strong>Camping Trip:</strong> Everything you need for camping</li>
              </ul>
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mt-4">
                <p className="text-yellow-300 text-sm">
                  <strong>💡 Pro Tip:</strong> Start with a basic template and refine it over time. After each shopping trip, note what was missing or unnecessary, then update your template accordingly.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          {/* New Enhanced Sections */}
          <section id="category-reference" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Complete Category Reference</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Here's your complete visual guide to all 11 shopping categories with common items in each:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
                {/* Produce */}
                <div className="p-5 bg-gradient-to-br from-emerald-50 from-emerald-900/30 to-green-900/30 rounded-xl border-2 border-emerald-800">
                  <div className="text-4xl mb-3">🥬</div>
                  <h4 className="font-bold text-xl text-white mb-2">Produce</h4>
                  <p className="text-sm text-gray-400 mb-3">Fresh fruits, vegetables, and herbs</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Vegetables:</strong> tomatoes, lettuce, carrots, broccoli, peppers, onions, garlic, potatoes</div>
                    <div><strong>Fruits:</strong> apples, bananas, oranges, berries, grapes, melons</div>
                    <div><strong>Herbs:</strong> basil, cilantro, parsley, mint</div>
                  </div>
                </div>

                {/* Dairy */}
                <div className="p-5 bg-gradient-to-br from-blue-50 from-blue-900/30 to-cyan-900/30 rounded-xl border-2 border-blue-800">
                  <div className="text-4xl mb-3">🥛</div>
                  <h4 className="font-bold text-xl text-white mb-2">Dairy</h4>
                  <p className="text-sm text-gray-400 mb-3">Milk products and eggs</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Milk:</strong> whole, 2%, skim, almond, oat, soy</div>
                    <div><strong>Cheese:</strong> cheddar, mozzarella, parmesan, cream cheese</div>
                    <div><strong>Other:</strong> yogurt, butter, eggs, sour cream, heavy cream</div>
                  </div>
                </div>

                {/* Meat & Seafood */}
                <div className="p-5 bg-gradient-to-br from-red-50 from-red-900/30 to-orange-900/30 rounded-xl border-2 border-red-800">
                  <div className="text-4xl mb-3">🥩</div>
                  <h4 className="font-bold text-xl text-white mb-2">Meat & Seafood</h4>
                  <p className="text-sm text-gray-400 mb-3">Fresh and frozen proteins</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Poultry:</strong> chicken breast, thighs, wings, ground turkey</div>
                    <div><strong>Beef:</strong> ground beef, steak, roast</div>
                    <div><strong>Seafood:</strong> salmon, shrimp, tuna, cod</div>
                    <div><strong>Pork:</strong> bacon, sausage, pork chops</div>
                  </div>
                </div>

                {/* Bakery */}
                <div className="p-5 bg-gradient-to-br from-amber-50 from-amber-900/30 to-yellow-900/30 rounded-xl border-2 border-amber-800">
                  <div className="text-4xl mb-3">🍞</div>
                  <h4 className="font-bold text-xl text-white mb-2">Bakery</h4>
                  <p className="text-sm text-gray-400 mb-3">Bread and baked goods</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Bread:</strong> whole wheat, white, sourdough, baguette</div>
                    <div><strong>Other:</strong> bagels, croissants, muffins, rolls, pita, tortillas</div>
                  </div>
                </div>

                {/* Pantry */}
                <div className="p-5 bg-gradient-to-br from-purple-50 from-purple-900/30 to-pink-900/30 rounded-xl border-2 border-purple-800">
                  <div className="text-4xl mb-3">🥫</div>
                  <h4 className="font-bold text-xl text-white mb-2">Pantry</h4>
                  <p className="text-sm text-gray-400 mb-3">Shelf-stable essentials</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Grains:</strong> rice, pasta, quinoa, oats, flour, cereal</div>
                    <div><strong>Canned:</strong> beans, tomatoes, soup, tuna</div>
                    <div><strong>Condiments:</strong> ketchup, mustard, mayo, soy sauce</div>
                    <div><strong>Oils & Spices:</strong> olive oil, vegetable oil, salt, pepper, spices</div>
                  </div>
                </div>

                {/* Frozen */}
                <div className="p-5 bg-gradient-to-br from-cyan-50 from-cyan-900/30 to-blue-900/30 rounded-xl border-2 border-cyan-800">
                  <div className="text-4xl mb-3">🧊</div>
                  <h4 className="font-bold text-xl text-white mb-2">Frozen</h4>
                  <p className="text-sm text-gray-400 mb-3">Frozen foods and treats</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Vegetables:</strong> peas, corn, mixed veggies, spinach</div>
                    <div><strong>Meals:</strong> pizza, burritos, frozen dinners</div>
                    <div><strong>Treats:</strong> ice cream, popsicles, frozen yogurt</div>
                  </div>
                </div>

                {/* Beverages */}
                <div className="p-5 bg-gradient-to-br from-indigo-50 from-indigo-900/30 to-purple-900/30 rounded-xl border-2 border-indigo-800">
                  <div className="text-4xl mb-3">🥤</div>
                  <h4 className="font-bold text-xl text-white mb-2">Beverages</h4>
                  <p className="text-sm text-gray-400 mb-3">Drinks and beverage supplies</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Non-Alcoholic:</strong> water, juice, soda, tea, coffee</div>
                    <div><strong>Alcoholic:</strong> beer, wine, spirits</div>
                    <div><strong>Supplies:</strong> coffee beans, tea bags</div>
                  </div>
                </div>

                {/* Snacks */}
                <div className="p-5 bg-gradient-to-br from-pink-50 from-pink-900/30 to-rose-900/30 rounded-xl border-2 border-pink-800">
                  <div className="text-4xl mb-3">🍿</div>
                  <h4 className="font-bold text-xl text-white mb-2">Snacks</h4>
                  <p className="text-sm text-gray-400 mb-3">Snack foods and treats</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Salty:</strong> chips, pretzels, popcorn, crackers, nuts</div>
                    <div><strong>Sweet:</strong> cookies, candy, chocolate, granola bars</div>
                  </div>
                </div>

                {/* Personal Care */}
                <div className="p-5 bg-gradient-to-br from-teal-50 from-teal-900/30 to-emerald-900/30 rounded-xl border-2 border-teal-800">
                  <div className="text-4xl mb-3">🧴</div>
                  <h4 className="font-bold text-xl text-white mb-2">Personal Care</h4>
                  <p className="text-sm text-gray-400 mb-3">Health and hygiene products</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Bath:</strong> soap, shampoo, conditioner, body wash</div>
                    <div><strong>Oral:</strong> toothpaste, toothbrush, mouthwash, floss</div>
                    <div><strong>Other:</strong> deodorant, lotion, sunscreen, razors</div>
                  </div>
                </div>

                {/* Household */}
                <div className="p-5 bg-gradient-to-br from-gray-100 from-gray-800 to-slate-800 rounded-xl border-2 border-gray-700">
                  <div className="text-4xl mb-3">🧹</div>
                  <h4 className="font-bold text-xl text-white mb-2">Household</h4>
                  <p className="text-sm text-gray-400 mb-3">Cleaning and household supplies</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div><strong>Cleaning:</strong> dish soap, laundry detergent, all-purpose cleaner</div>
                    <div><strong>Paper:</strong> toilet paper, paper towels, tissues</div>
                    <div><strong>Other:</strong> trash bags, aluminum foil, plastic wrap, light bulbs</div>
                  </div>
                </div>

                {/* Other */}
                <div className="p-5 bg-gradient-to-br from-stone-100 from-stone-800 to-zinc-800 rounded-xl border-2 border-stone-700">
                  <div className="text-4xl mb-3">📦</div>
                  <h4 className="font-bold text-xl text-white mb-2">Other</h4>
                  <p className="text-sm text-gray-400 mb-3">Miscellaneous items</p>
                  <div className="text-xs text-gray-300 space-y-1">
                    <div>Items that don't fit into other categories</div>
                    <div><strong>Examples:</strong> pet food, office supplies, batteries, gift wrap</div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-4 mt-6">
                <p className="text-emerald-300 text-sm">
                  <strong>🎯 Smart Detection:</strong> Rowan automatically categorizes 100+ common items. If something is miscategorized, you can manually change it when adding or editing the item!
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="budget-deep-dive" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Budget Management Deep Dive</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Understanding budget indicators and how to use them effectively:
              </p>

              <h3 className="text-xl font-semibold text-white mb-4">Visual Budget Indicators</h3>

              <div className="space-y-4 mb-6">
                {/* Under Budget */}
                <div className="p-4 bg-green-900/20 border-l-4 border-green-500 rounded-r-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-green-100">✓ Under Budget</h4>
                    <span className="text-sm font-mono text-green-300">💰 $45.50 / $100.00</span>
                  </div>
                  <p className="text-sm text-green-300">
                    You're well within budget! The green indicator means you have plenty of room for additional items. This is the ideal state—you're spending wisely.
                  </p>
                </div>

                {/* Approaching Budget */}
                <div className="p-4 bg-yellow-900/20 border-l-4 border-yellow-500 rounded-r-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-yellow-100">⚠ Approaching Budget (80-100%)</h4>
                    <span className="text-sm font-mono text-yellow-300">💰 $87.25 / $100.00</span>
                  </div>
                  <p className="text-sm text-yellow-300">
                    Yellow warning! You're getting close to your limit. Time to review your list and prioritize essential items. Consider removing or postponing nice-to-have items.
                  </p>
                </div>

                {/* Over Budget */}
                <div className="p-4 bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-red-100">✕ Over Budget</h4>
                    <span className="text-sm font-mono text-red-300">💰 $124.80 / $100.00</span>
                  </div>
                  <p className="text-sm text-red-300">
                    Red alert! You've exceeded your budget by $24.80. Review your list and either remove items or adjust your budget if the spending is necessary.
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mt-8 mb-4">Budget Strategy Tips</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                  <h4 className="font-semibold text-blue-100 mb-2">📊 Track Your Averages</h4>
                  <p className="text-sm text-blue-300">
                    After 3-4 shopping trips, calculate your average spending. Use this as your baseline budget for future trips. Add 10-15% buffer for flexibility.
                  </p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-purple-100 mb-2">🎯 Separate by Store</h4>
                  <p className="text-sm text-purple-300">
                    Create separate lists with different budgets for different stores. Costco trips typically need higher budgets than quick grocery runs.
                  </p>
                </div>

                <div className="p-4 bg-pink-900/20 rounded-lg border border-pink-800">
                  <h4 className="font-semibold text-pink-100 mb-2">💡 Price It Right</h4>
                  <p className="text-sm text-pink-300">
                    As you shop, update estimated prices with actual costs. Over time, you'll build a personal price database that makes budgeting more accurate.
                  </p>
                </div>

                <div className="p-4 bg-indigo-900/20 rounded-lg border border-indigo-800">
                  <h4 className="font-semibold text-indigo-100 mb-2">🏷️ Include Sales</h4>
                  <p className="text-sm text-indigo-300">
                    Review store circulars before shopping. Adjust your budget down if you're planning to take advantage of major sales or coupons.
                  </p>
                </div>
              </div>

              <div className="bg-emerald-900/20 border border-emerald-800 rounded-lg p-5 mt-6">
                <h4 className="font-semibold text-emerald-100 mb-2">🏡 Household Budgeting Tip</h4>
                <p className="text-emerald-300 text-sm mb-3">
                  For families, try setting weekly or monthly shopping budgets and track them consistently. After 2-3 months, you'll have valuable data to optimize spending:
                </p>
                <ul className="text-emerald-300 text-sm space-y-1 ml-4">
                  <li>• Identify expensive patterns (eating out vs. cooking)</li>
                  <li>• Find cheaper alternatives for frequently purchased items</li>
                  <li>• Adjust budgets seasonally (holidays, back-to-school, etc.)</li>
                  <li>• Set spending goals and celebrate when you stay under budget</li>
                </ul>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="template-gallery" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Template Gallery & Examples</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Get inspired by these real-world template examples for common shopping scenarios:
              </p>

              <div className="space-y-6">
                {/* Weekly Groceries Template */}
                <div className="bg-gradient-to-r from-emerald-50 from-emerald-900/20 to-teal-900/20 rounded-xl p-6 border-2 border-emerald-800">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🛒</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Weekly Groceries</h3>
                      <p className="text-sm text-gray-400 mb-3">Your standard weekly shopping run • Budget: $120-150</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-300">
                        <div><strong>Produce:</strong> lettuce, tomatoes, bananas, apples</div>
                        <div><strong>Dairy:</strong> milk, eggs, yogurt, cheese</div>
                        <div><strong>Meat:</strong> chicken breast, ground beef</div>
                        <div><strong>Bakery:</strong> bread, bagels</div>
                        <div><strong>Pantry:</strong> pasta, rice, cereal</div>
                        <div><strong>Household:</strong> paper towels, dish soap</div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-emerald-700">
                        <p className="text-xs text-emerald-300">
                          <strong>💡 Use Case:</strong> Perfect for families doing regular weekly shopping. Adjust quantities based on household size.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Bulk Run Template */}
                <div className="bg-gradient-to-r from-blue-50 from-blue-900/20 to-cyan-900/20 rounded-xl p-6 border-2 border-blue-800">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">📦</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Monthly Bulk Run (Costco/Sam's)</h3>
                      <p className="text-sm text-gray-400 mb-3">Stock up on bulk items • Budget: $250-350</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-300">
                        <div><strong>Pantry:</strong> 20lb rice, 10lb pasta, olive oil</div>
                        <div><strong>Frozen:</strong> frozen vegetables, frozen fruit</div>
                        <div><strong>Household:</strong> toilet paper (36 rolls), paper towels (12 rolls)</div>
                        <div><strong>Snacks:</strong> chips variety pack, granola bars</div>
                        <div><strong>Beverages:</strong> water cases, juice boxes</div>
                        <div><strong>Personal Care:</strong> shampoo 2-pack, body wash 3-pack</div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-blue-700">
                        <p className="text-xs text-blue-300">
                          <strong>💡 Use Case:</strong> Monthly warehouse club runs to stock up on bulk items. Saves money long-term and reduces shopping frequency.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Party Supplies Template */}
                <div className="bg-gradient-to-r from-purple-50 from-purple-900/20 to-pink-900/20 rounded-xl p-6 border-2 border-purple-800">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🎉</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Party Supplies</h3>
                      <p className="text-sm text-gray-400 mb-3">Hosting a gathering • Budget: $100-200</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-300">
                        <div><strong>Beverages:</strong> soda 2L (6), beer, wine</div>
                        <div><strong>Snacks:</strong> chips (3 bags), pretzels, dip</div>
                        <div><strong>Produce:</strong> veggie tray ingredients, lemons</div>
                        <div><strong>Meat:</strong> burger patties, hot dogs</div>
                        <div><strong>Bakery:</strong> buns (2 packs), rolls</div>
                        <div><strong>Other:</strong> paper plates, cups, napkins, ice</div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-purple-700">
                        <p className="text-xs text-purple-300">
                          <strong>💡 Use Case:</strong> BBQs, game nights, birthday parties. Adjust quantities based on guest count (plan for 20-30% extra).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Holiday Baking Template */}
                <div className="bg-gradient-to-r from-amber-50 from-amber-900/20 to-orange-900/20 rounded-xl p-6 border-2 border-amber-800">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🎄</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Holiday Baking Supplies</h3>
                      <p className="text-sm text-gray-400 mb-3">Everything for holiday baking • Budget: $60-80</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-300">
                        <div><strong>Pantry:</strong> flour (10lb), sugar (5lb), brown sugar</div>
                        <div><strong>Dairy:</strong> butter (4 sticks), eggs (2 dozen), heavy cream</div>
                        <div><strong>Baking:</strong> vanilla extract, chocolate chips, cocoa powder</div>
                        <div><strong>Spices:</strong> cinnamon, nutmeg, ginger, cloves</div>
                        <div><strong>Other:</strong> baking powder, baking soda, powdered sugar</div>
                        <div><strong>Extras:</strong> sprinkles, food coloring, cookie cutters</div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-amber-700">
                        <p className="text-xs text-amber-300">
                          <strong>💡 Use Case:</strong> Thanksgiving, Christmas, or any baking marathon. Stock up once and bake all season!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Breakfast Restock Template */}
                <div className="bg-gradient-to-r from-yellow-50 from-yellow-900/20 to-amber-900/20 rounded-xl p-6 border-2 border-yellow-800">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">☕</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Breakfast Restock</h3>
                      <p className="text-sm text-gray-400 mb-3">Weekly breakfast essentials • Budget: $30-45</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-300">
                        <div><strong>Dairy:</strong> milk, eggs, yogurt, butter</div>
                        <div><strong>Bakery:</strong> bagels, muffins, bread</div>
                        <div><strong>Pantry:</strong> cereal (2 boxes), oatmeal, coffee</div>
                        <div><strong>Produce:</strong> bananas, oranges, berries</div>
                        <div><strong>Frozen:</strong> waffles, breakfast sausage</div>
                        <div><strong>Other:</strong> orange juice, maple syrup</div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-yellow-700">
                        <p className="text-xs text-yellow-300">
                          <strong>💡 Use Case:</strong> Perfect for families with kids. Run this weekly to ensure breakfast is always stocked and mornings are smooth.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meal Prep Sunday Template */}
                <div className="bg-gradient-to-r from-green-50 from-green-900/20 to-teal-900/20 rounded-xl p-6 border-2 border-green-800">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">🥗</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">Meal Prep Sunday</h3>
                      <p className="text-sm text-gray-400 mb-3">Weekly meal prep ingredients • Budget: $70-90</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-300">
                        <div><strong>Protein:</strong> chicken breast (5lbs), ground turkey (2lbs)</div>
                        <div><strong>Produce:</strong> broccoli, peppers, onions, spinach, sweet potatoes</div>
                        <div><strong>Grains:</strong> brown rice (3lbs), quinoa</div>
                        <div><strong>Prep:</strong> meal prep containers (20-pack)</div>
                        <div><strong>Pantry:</strong> olive oil, garlic, spices, soy sauce</div>
                        <div><strong>Snacks:</strong> Greek yogurt, almonds, protein bars</div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-green-700">
                        <p className="text-xs text-green-300">
                          <strong>💡 Use Case:</strong> For fitness-focused individuals or busy professionals. Prep 5-7 days of healthy meals in one shopping trip.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-900/20 border border-indigo-800 rounded-lg p-5 mt-8">
                <h4 className="font-semibold text-indigo-100 mb-2">✨ Template Pro Tips</h4>
                <ul className="text-indigo-300 text-sm space-y-2">
                  <li><strong>Start Simple:</strong> Begin with 1-2 templates and refine them based on actual shopping trips</li>
                  <li><strong>Update Regularly:</strong> Review templates quarterly to add new favorites and remove items you no longer buy</li>
                  <li><strong>Share with Household:</strong> Templates are shared in your space—create templates for different family members' shopping responsibilities</li>
                  <li><strong>Combine Templates:</strong> Start with a template, then add items from another. Perfect for "Weekly Groceries + Party Supplies"</li>
                  <li><strong>Seasonal Templates:</strong> Create specific templates for seasons: "Summer BBQ", "Back to School", "Winter Comfort Foods"</li>
                </ul>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="mobile-shopping" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Mobile Shopping Experience</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Rowan is designed for in-store shopping on your mobile device. Here's how to make the most of it:
              </p>

              <h3 className="text-xl font-semibold text-white mb-4">Before You Leave Home</h3>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-lg">
                  <div className="text-2xl">1️⃣</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Review Your List</h4>
                    <p className="text-sm text-gray-300">
                      On desktop or mobile, finalize your shopping list. Make sure all items are added, categories are correct, and nothing is missing.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-lg">
                  <div className="text-2xl">2️⃣</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Reorder by Store Layout</h4>
                    <p className="text-sm text-gray-300">
                      Use drag-and-drop to arrange items in the order you'll encounter them at your store. This prevents backtracking and saves time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-900/20 rounded-lg">
                  <div className="text-2xl">3️⃣</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Check Your Budget</h4>
                    <p className="text-sm text-gray-300">
                      Verify your budget is set correctly. Add estimated prices to items if you want accurate tracking while shopping.
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-4">At the Store</h3>
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 p-4 bg-emerald-900/20 rounded-lg">
                  <div className="text-2xl">📱</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Open Your List</h4>
                    <p className="text-sm text-gray-300">
                      Navigate to Shopping Lists and tap on your active list. The mobile view is optimized for one-handed operation with large touch targets.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-emerald-900/20 rounded-lg">
                  <div className="text-2xl">✓</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Check Off Items as You Shop</h4>
                    <p className="text-sm text-gray-300">
                      Tap the checkbox next to each item as you add it to your cart. Checked items show with strikethrough and move to the bottom automatically.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-emerald-900/20 rounded-lg">
                  <div className="text-2xl">👫</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Shop Together</h4>
                    <p className="text-sm text-gray-300">
                      If shopping with a partner, you can split up! One person takes Produce/Dairy, another takes Meat/Frozen. Each person checks off items on their phone in real-time.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-emerald-900/20 rounded-lg">
                  <div className="text-2xl">➕</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Add Forgotten Items</h4>
                    <p className="text-sm text-gray-300">
                      Spotted something you forgot? Tap "Add Item" right from your phone. It syncs instantly to all devices, so your partner sees it too.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-emerald-900/20 rounded-lg">
                  <div className="text-2xl">💰</div>
                  <div>
                    <h4 className="font-semibold text-white mb-1">Track Your Spending</h4>
                    <p className="text-sm text-gray-300">
                      Glance at the budget indicator at the top of your list. If it turns yellow (80%) or red (100%+), consider which items to skip or postpone.
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-4">Mobile-Optimized Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-purple-100 mb-2">👆 Large Touch Targets</h4>
                  <p className="text-sm text-purple-300">
                    Checkboxes, buttons, and interactive elements are sized for easy tapping—even with gloves or in a hurry.
                  </p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-purple-100 mb-2">🔄 Real-Time Sync</h4>
                  <p className="text-sm text-purple-300">
                    Changes sync instantly across all devices. Start on desktop, shop on mobile, review at home—seamlessly.
                  </p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-purple-100 mb-2">🌙 Dark Mode</h4>
                  <p className="text-sm text-purple-300">
                    Automatic dark mode support means comfortable viewing in any lighting condition—bright stores or dim parking lots.
                  </p>
                </div>

                <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-800">
                  <h4 className="font-semibold text-purple-100 mb-2">📶 Offline Tolerance</h4>
                  <p className="text-sm text-purple-300">
                    The app handles spotty store Wi-Fi gracefully. Your checks queue up and sync when connection returns.
                  </p>
                </div>
              </div>

              <div className="bg-pink-900/20 border border-pink-800 rounded-lg p-5">
                <h4 className="font-semibold text-pink-100 mb-2">🏡 Household Shopping Tip</h4>
                <p className="text-pink-300 text-sm mb-3">
                  For families, here's a pro workflow:
                </p>
                <ul className="text-pink-300 text-sm space-y-1 ml-4">
                  <li><strong>Monday-Thursday:</strong> Anyone in the household adds items to "This Week's Shopping" as they run out</li>
                  <li><strong>Friday Morning:</strong> Review the list together, add forgotten items, set budget</li>
                  <li><strong>Saturday:</strong> Shop together or split up. Each person checks off items on their phone</li>
                  <li><strong>After Shopping:</strong> Update actual prices for better budgeting next time</li>
                </ul>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="smart-tips" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Smart Tips & Common Mistakes</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Learn from these common mistakes and time-saving hacks to become a shopping list pro:
              </p>

              <h3 className="text-xl font-semibold text-white mb-4">❌ Common Mistakes to Avoid</h3>
              <div className="space-y-4 mb-8">
                <div className="p-4 bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <h4 className="font-semibold text-red-100 mb-2">Not Being Specific Enough</h4>
                  <div className="text-sm text-red-300">
                    <p className="mb-2"><strong>❌ Wrong:</strong> "milk", "cheese", "chips"</p>
                    <p><strong>✓ Right:</strong> "2% milk - gallon", "sharp cheddar - 8oz block", "Doritos nacho cheese - family size"</p>
                    <p className="mt-2 italic">Why: Specific descriptions prevent confusion and ensure you get exactly what you need, especially when someone else is shopping.</p>
                  </div>
                </div>

                <div className="p-4 bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <h4 className="font-semibold text-red-100 mb-2">Creating Too Many Small Lists</h4>
                  <div className="text-sm text-red-300">
                    <p className="mb-2"><strong>❌ Wrong:</strong> "Tuesday List", "Wednesday Items", "Thursday Shopping" (all for same store)</p>
                    <p><strong>✓ Right:</strong> One "This Week - Whole Foods" list that you add to throughout the week</p>
                    <p className="mt-2 italic">Why: Consolidating items into one weekly list gives you a complete picture and prevents multiple trips to the same store.</p>
                  </div>
                </div>

                <div className="p-4 bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <h4 className="font-semibold text-red-100 mb-2">Ignoring Categories</h4>
                  <div className="text-sm text-red-300">
                    <p className="mb-2"><strong>❌ Wrong:</strong> Letting everything fall into "Other" category</p>
                    <p><strong>✓ Right:</strong> Reviewing and correcting miscategorized items before shopping</p>
                    <p className="mt-2 italic">Why: Proper categories organize your list by store layout, making shopping significantly faster and preventing forgotten items in different sections.</p>
                  </div>
                </div>

                <div className="p-4 bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <h4 className="font-semibold text-red-100 mb-2">Setting Unrealistic Budgets</h4>
                  <div className="text-sm text-red-300">
                    <p className="mb-2"><strong>❌ Wrong:</strong> $50 budget for 30 items including meat and produce</p>
                    <p><strong>✓ Right:</strong> $120-150 budget based on past shopping trips for similar items</p>
                    <p className="mt-2 italic">Why: Unrealistic budgets cause stress while shopping. After 2-3 trips, you'll know your average spend—use that as your baseline.</p>
                  </div>
                </div>

                <div className="p-4 bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
                  <h4 className="font-semibold text-red-100 mb-2">Not Using Templates for Recurring Shopping</h4>
                  <div className="text-sm text-red-300">
                    <p className="mb-2"><strong>❌ Wrong:</strong> Typing the same 25 items every week from memory</p>
                    <p><strong>✓ Right:</strong> Creating a "Weekly Groceries" template and starting from there</p>
                    <p className="mt-2 italic">Why: Templates save 10-15 minutes per list. You start with 80% of what you need, then just add unique items for that week.</p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-4">✅ Time-Saving Hacks</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-green-100 mb-2">⚡ Quick Add Panel</h4>
                  <p className="text-sm text-green-300 mb-2">
                    The Quick Add panel shows your 12 most frequently purchased items. Use it to build lists in seconds!
                  </p>
                  <p className="text-xs text-green-400 italic">
                    Time Saved: 5-7 minutes per list
                  </p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-green-100 mb-2">🎯 Store-Specific Lists</h4>
                  <p className="text-sm text-green-300 mb-2">
                    Create separate lists for different stores (Whole Foods, Target, Costco). This prevents "Oh, I should have gotten that at Costco" moments.
                  </p>
                  <p className="text-xs text-green-400 italic">
                    Saves money and prevents extra trips
                  </p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-green-100 mb-2">🔄 Reorder Before Shopping</h4>
                  <p className="text-sm text-green-300 mb-2">
                    Take 2 minutes to drag items into store order before you leave. You'll shop 30-40% faster by not backtracking through aisles.
                  </p>
                  <p className="text-xs text-green-400 italic">
                    Time Saved: 10-15 minutes at store
                  </p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-green-100 mb-2">📅 Calendar + Task Combo</h4>
                  <p className="text-sm text-green-300 mb-2">
                    Schedule shopping trips in your calendar AND create a task. The calendar event reminds you, the task tracks completion.
                  </p>
                  <p className="text-xs text-green-400 italic">
                    Never forget shopping day again
                  </p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-green-100 mb-2">👥 Split Shopping</h4>
                  <p className="text-sm text-green-300 mb-2">
                    When shopping with a partner, assign categories: one person does Produce/Dairy/Meat, the other does Pantry/Frozen/Household. Check items off in real-time.
                  </p>
                  <p className="text-xs text-green-400 italic">
                    Time Saved: 50% faster shopping
                  </p>
                </div>

                <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                  <h4 className="font-semibold text-green-100 mb-2">💾 Update Prices Post-Shop</h4>
                  <p className="text-sm text-green-300 mb-2">
                    Spend 3 minutes after shopping to update estimated prices with actual costs. After 3-4 trips, you'll have a personal price database for accurate budgets.
                  </p>
                  <p className="text-xs text-green-400 italic">
                    Better budgeting long-term
                  </p>
                </div>
              </div>

              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-5">
                <h4 className="font-semibold text-yellow-100 mb-2">💡 Pro Shopper Strategy</h4>
                <p className="text-yellow-300 text-sm mb-3">
                  Follow this workflow for maximum efficiency:
                </p>
                <ol className="text-yellow-300 text-sm space-y-2 ml-4">
                  <li><strong>1. Use templates:</strong> Start with your "Weekly Groceries" template (saves 5-7 min)</li>
                  <li><strong>2. Add from Quick Add:</strong> Click items from your frequent panel (saves 3-4 min)</li>
                  <li><strong>3. Add unique items:</strong> Manually add any one-off needs for this week</li>
                  <li><strong>4. Reorder by store layout:</strong> Drag items to match your store (saves 10-15 min while shopping)</li>
                  <li><strong>5. Schedule it:</strong> Add to calendar with reminder so you don't forget</li>
                  <li><strong>6. Shop efficiently:</strong> Use mobile app, check off as you go</li>
                  <li><strong>7. Update prices:</strong> Quick review after shopping for better budgets next time</li>
                </ol>
                <p className="text-yellow-300 text-sm mt-3 font-semibold">
                  Total time saved per week: 20-30 minutes! Plus less stress and fewer forgotten items.
                </p>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>

          <section id="integration-workflows" className="scroll-mt-24">
            <h2 className="text-3xl font-bold text-white mb-4">Integration Workflows</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-6">
                Shopping Lists seamlessly integrate with Meal Planning, Calendar, and Tasks. Here are powerful workflows that connect everything:
              </p>

              <h3 className="text-xl font-semibold text-white mb-4">Complete Workflow: Recipe → Meal Plan → Shopping → Task</h3>

              <div className="space-y-4 mb-8">
                {/* Step 1 */}
                <div className="relative pl-8 pb-8 border-l-4 border-orange-700">
                  <div className="absolute -left-4 top-0 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    1
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 from-orange-900/20 to-red-900/20 rounded-lg p-5 border-2 border-orange-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">🍳</div>
                      <h4 className="text-lg font-bold text-white">Find & Save Recipes (Meal Planning)</h4>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      Start by building your recipe library. Add recipes using:
                    </p>
                    <ul className="text-sm text-gray-300 space-y-1 ml-4">
                      <li>• <strong>AI Import:</strong> Paste recipe URLs from any cooking site</li>
                      <li>• <strong>API Discovery:</strong> Browse 37+ cuisine types for inspiration</li>
                      <li>• <strong>Manual Entry:</strong> Type your family recipes</li>
                    </ul>
                    <p className="text-xs text-orange-300 mt-3 italic">
                      📍 Navigate to: Meal Planning → Recipes → Add New Recipe
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative pl-8 pb-8 border-l-4 border-purple-700">
                  <div className="absolute -left-4 top-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    2
                  </div>
                  <div className="bg-gradient-to-r from-purple-50 from-purple-900/20 to-pink-900/20 rounded-lg p-5 border-2 border-purple-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">📅</div>
                      <h4 className="text-lg font-bold text-white">Plan Your Week (Meal Planning)</h4>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      Schedule meals for the week:
                    </p>
                    <ul className="text-sm text-gray-300 space-y-1 ml-4">
                      <li>• View calendar and pick dates (Monday dinner, Wednesday lunch, etc.)</li>
                      <li>• Select recipes from your library or browse API recipes</li>
                      <li>• Plan 5-7 days ahead for full week coverage</li>
                      <li>• Each meal links to its recipe with full ingredients</li>
                    </ul>
                    <p className="text-xs text-purple-300 mt-3 italic">
                      📍 Navigate to: Meal Planning → Calendar View → Click date → Add Meal
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative pl-8 pb-8 border-l-4 border-emerald-700">
                  <div className="absolute -left-4 top-0 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    3
                  </div>
                  <div className="bg-gradient-to-r from-emerald-50 from-emerald-900/20 to-teal-900/20 rounded-lg p-5 border-2 border-emerald-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">🛒</div>
                      <h4 className="text-lg font-bold text-white">Generate Shopping List (Meal Planning → Shopping)</h4>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      Automatically create shopping list from your meal plan:
                    </p>
                    <ul className="text-sm text-gray-300 space-y-1 ml-4">
                      <li>• Click "Generate Shopping List from Meals"</li>
                      <li>• Select date range (e.g., Monday-Sunday)</li>
                      <li>• System extracts ALL ingredients from selected meals</li>
                      <li>• Items are auto-categorized and quantities are calculated</li>
                      <li>• Review, adjust, add household items (milk, bread, etc.)</li>
                    </ul>
                    <p className="text-xs text-emerald-300 mt-3 italic">
                      📍 Navigate to: Meal Planning → Actions → Generate Shopping List
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative pl-8 pb-8 border-l-4 border-blue-700">
                  <div className="absolute -left-4 top-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    4
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 from-blue-900/20 to-cyan-900/20 rounded-lg p-5 border-2 border-blue-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">📆</div>
                      <h4 className="text-lg font-bold text-white">Schedule Shopping Trip (Shopping → Calendar)</h4>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      Add your shopping list to the calendar:
                    </p>
                    <ul className="text-sm text-gray-300 space-y-1 ml-4">
                      <li>• Open shopping list menu (⋮ button)</li>
                      <li>• Click "📅 Schedule Shopping Trip"</li>
                      <li>• Pick date/time (e.g., Saturday 10:00 AM)</li>
                      <li>• Set duration and reminder</li>
                      <li>• Calendar event is created with shopping list linked</li>
                    </ul>
                    <p className="text-xs text-blue-300 mt-3 italic">
                      📍 Navigate to: Shopping Lists → List Menu → Schedule Shopping Trip
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="relative pl-8 pb-8 border-l-4 border-indigo-700">
                  <div className="absolute -left-4 top-0 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    5
                  </div>
                  <div className="bg-gradient-to-r from-indigo-50 from-indigo-900/20 to-purple-900/20 rounded-lg p-5 border-2 border-indigo-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">✅</div>
                      <h4 className="text-lg font-bold text-white">Create Task (Shopping → Tasks)</h4>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      Track shopping as a task for accountability:
                    </p>
                    <ul className="text-sm text-gray-300 space-y-1 ml-4">
                      <li>• Open shopping list menu (⋮ button)</li>
                      <li>• Click "✓ Create Task"</li>
                      <li>• Task is created: "Complete shopping: [List Name]"</li>
                      <li>• Includes item count and shopping list link</li>
                      <li>• Assign to household member and set priority</li>
                    </ul>
                    <p className="text-xs text-indigo-300 mt-3 italic">
                      📍 Navigate to: Shopping Lists → List Menu → Create Task
                    </p>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="relative pl-8">
                  <div className="absolute -left-4 top-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    6
                  </div>
                  <div className="bg-gradient-to-r from-green-50 from-green-900/20 to-emerald-900/20 rounded-lg p-5 border-2 border-green-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">🎯</div>
                      <h4 className="text-lg font-bold text-white">Complete Everything</h4>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      On shopping day:
                    </p>
                    <ul className="text-sm text-gray-300 space-y-1 ml-4">
                      <li>• <strong>Calendar</strong> sends reminder 30 min before trip</li>
                      <li>• <strong>Shopping List</strong> on mobile—check off items as you shop</li>
                      <li>• When done shopping, mark <strong>Task</strong> as completed</li>
                      <li>• Shopping list automatically marked complete</li>
                      <li>• Start cooking your planned meals!</li>
                    </ul>
                    <p className="text-xs text-green-300 mt-3 italic">
                      ✨ Everything is connected and tracked—nothing falls through the cracks!
                    </p>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-white mb-4">Other Powerful Integration Patterns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-amber-900/20 rounded-lg border-2 border-amber-800">
                  <h4 className="font-semibold text-amber-100 mb-2">🎂 Event Shopping</h4>
                  <p className="text-sm text-amber-300 mb-2">
                    <strong>Scenario:</strong> Planning a birthday party next Saturday
                  </p>
                  <ol className="text-xs text-amber-300 space-y-1 ml-4">
                    <li>1. Create "Birthday Party Shopping" list</li>
                    <li>2. Schedule calendar event: "Birthday Party Prep"</li>
                    <li>3. Link shopping list to calendar event</li>
                    <li>4. Create task: "Shop for party - due Friday"</li>
                    <li>5. Get reminders, shop Friday, mark complete</li>
                  </ol>
                </div>

                <div className="p-4 bg-teal-900/20 rounded-lg border-2 border-teal-800">
                  <h4 className="font-semibold text-teal-100 mb-2">🏠 Household Chore Integration</h4>
                  <p className="text-sm text-teal-300 mb-2">
                    <strong>Scenario:</strong> Regular household restocking
                  </p>
                  <ol className="text-xs text-teal-300 space-y-1 ml-4">
                    <li>1. Create template: "Household Essentials"</li>
                    <li>2. Set up recurring task: "Check household supplies - every Sunday"</li>
                    <li>3. When task pops up, create list from template</li>
                    <li>4. Schedule shopping trip for Monday</li>
                    <li>5. Complete task when items are restocked</li>
                  </ol>
                </div>

                <div className="p-4 bg-rose-900/20 rounded-lg border-2 border-rose-800">
                  <h4 className="font-semibold text-rose-100 mb-2">🎄 Holiday Planning</h4>
                  <p className="text-sm text-rose-300 mb-2">
                    <strong>Scenario:</strong> Thanksgiving dinner preparation
                  </p>
                  <ol className="text-xs text-rose-300 space-y-1 ml-4">
                    <li>1. Plan Thanksgiving meals in Meal Planning (turkey, sides, desserts)</li>
                    <li>2. Generate comprehensive shopping list from all meals</li>
                    <li>3. Split into two lists: "Thanksgiving - 1 week early" and "Thanksgiving - fresh items"</li>
                    <li>4. Schedule both shopping trips in calendar</li>
                    <li>5. Create tasks for each trip assigned to different family members</li>
                  </ol>
                </div>

                <div className="p-4 bg-cyan-900/20 rounded-lg border-2 border-cyan-800">
                  <h4 className="font-semibold text-cyan-100 mb-2">💪 Meal Prep Integration</h4>
                  <p className="text-sm text-cyan-300 mb-2">
                    <strong>Scenario:</strong> Sunday meal prep for the week
                  </p>
                  <ol className="text-xs text-cyan-300 space-y-1 ml-4">
                    <li>1. Plan 5 meal prep recipes in Meal Planning</li>
                    <li>2. Generate shopping list (includes bulk proteins, veggies)</li>
                    <li>3. Schedule "Grocery Shopping" Saturday 9 AM</li>
                    <li>4. Schedule "Meal Prep Session" Sunday 2 PM (3 hours)</li>
                    <li>5. Create tasks: "Shop for meal prep" and "Complete meal prep"</li>
                  </ol>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-50 from-purple-900/20 to-pink-900/20 border-2 border-purple-800 rounded-xl p-6">
                <h4 className="font-semibold text-purple-100 mb-3 text-lg">✨ Why Integration Matters</h4>
                <p className="text-purple-300 text-sm mb-4">
                  By connecting Shopping Lists with Meal Planning, Calendar, and Tasks, you create a complete household management system:
                </p>
                <ul className="text-purple-300 text-sm space-y-2">
                  <li><strong>⏱️ Save Time:</strong> Generate shopping lists automatically from meal plans—no manual copying</li>
                  <li><strong>📅 Never Forget:</strong> Calendar reminders ensure you shop on time</li>
                  <li><strong>✓ Accountability:</strong> Tasks track who's responsible for shopping</li>
                  <li><strong>🔄 Real-Time Sync:</strong> Changes anywhere update everywhere instantly</li>
                  <li><strong>🏡 Family Coordination:</strong> Everyone sees the same info—no miscommunication</li>
                </ul>
              </div>
            </div>
            <a href="#" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 text-sm font-medium mt-6">
              ↑ Back to top
            </a>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-400">
          <p>Need more help? Check out other <Link href="/settings/documentation" className="inline-block py-2 px-3 text-emerald-400 hover:underline">documentation guides</Link></p>
        </div>
      </div>
    </div>
  );
}
