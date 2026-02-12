import Link from 'next/link';

import { type LucideIcon, ArrowLeft, UtensilsCrossed, BookOpen, Play, Eye, Plus, ChefHat, Globe, Sparkles, ShoppingBag, Keyboard, Clock, Lightbulb, LayoutGrid } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface GuideSection {
  title: string;
  icon: LucideIcon;
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
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="mb-8">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Link
            href="/settings/documentation"
            className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-orange-400 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">
                Meal Planning Guide
              </h1>
              <p className="text-gray-400 mt-1">
                Complete guide to planning meals with recipes, shopping, and collaboration
              </p>
            </div>
          </div>

          <div className="bg-orange-900/20 border border-orange-800 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-orange-100 mb-2">
                  Welcome to Meal Planning
                </h3>
                <p className="text-orange-200 mb-3">
                  Rowan helps you plan meals efficiently with powerful recipe and shopping integration:
                </p>
                <div className="grid sm:grid-cols-2 gap-2 text-sm text-orange-300">
                  <div className="flex items-start gap-2">
                    <LayoutGrid className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Three views</strong> - Calendar, List, and Recipe views</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>AI import</strong> - Extract recipes from text or images</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShoppingBag className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Auto shopping</strong> - Generate lists from meal plans</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Globe className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>37+ cuisines</strong> - Discover recipes from multiple APIs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Keyboard className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Shortcuts</strong> - Fast keyboard navigation (N, R, /)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ChefHat className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Recipe library</strong> - Save and organize your favorites</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Meal history</strong> - Track past meals with completion status</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Eye className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span><strong>Collaboration</strong> - Plan meals together in real-time</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="max-w-6xl mx-auto px-6 pb-12">
        <div className="space-y-8">
          {guideSections.map((section, sectionIndex) => {
            const Icon = section.icon;
            return (
              <div key={sectionIndex} className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                {/* Section Header */}
                <div className={`p-6 bg-gradient-to-r ${section.color}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white">{section.title}</h2>
                  </div>
                </div>

                {/* Articles */}
                <div className="divide-y divide-gray-700">
                  {section.articles.map((article, articleIndex) => (
                    <a
                      key={articleIndex}
                      href={article.href}
                      className="block p-6 hover:bg-gray-900/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-orange-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-400 mb-3">
                            {article.description}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
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
                          <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center group-hover:bg-orange-900/30 transition-colors">
                            <span className="text-gray-400 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all">→</span>
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

        {/* Detailed Guide Content */}
        <div className="mt-12 space-y-12 scroll-smooth">
          {/* Getting Started Section */}
          <section id="intro" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Introduction to Meal Planning</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Welcome to meal planning in Rowan. This guide will help you understand how to organize your meals, discover recipes, and create shopping lists.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">What is Meal Planning?</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Meal planning helps you organize what you will eat throughout the week</li>
                <li>You can schedule meals for breakfast, lunch, dinner, or snacks</li>
                <li>Each meal can be linked to a recipe from your collection</li>
                <li>Rowan automatically tracks ingredients from your recipes</li>
                <li>You can generate shopping lists based on your planned meals</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Benefits of Using Rowan for Meal Planning</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Save time by planning meals in advance</li>
                <li>Reduce food waste by knowing exactly what to buy</li>
                <li>Discover new recipes from over 37 different cuisines</li>
                <li>Share meal plans with your partner</li>
                <li>Track your meal history and see what you enjoyed</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="views" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Understanding the Three Views</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Rowan offers three different ways to view and manage your meals. Each view is designed for different tasks.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Calendar View</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the Calendar button at the top of the page or press the 1 key</li>
                <li>See your meals organized by date on a calendar grid</li>
                <li>Switch between week, two-week, or month views using the buttons</li>
                <li>Each day shows all meals scheduled for that date</li>
                <li>Click on any meal card to view details or edit it</li>
                <li>Use the left and right arrows to navigate between time periods</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">List View</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the List button at the top of the page or press the 2 key</li>
                <li>See all your meals in a vertical list format</li>
                <li>Meals are organized by date from earliest to latest</li>
                <li>Each meal shows the date, time, meal type, and recipe name</li>
                <li>This view is best for quickly scanning all upcoming meals</li>
                <li>Click the Show Past button to include completed meals from previous dates</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Recipes View</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the Recipes button at the top of the page or press the 3 key</li>
                <li>See all recipes saved in your collection</li>
                <li>Browse recipes you have created or discovered</li>
                <li>Click on any recipe card to view full details</li>
                <li>Use the Plan Meal button on any recipe to quickly schedule it</li>
                <li>This view is best for managing your recipe library</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="quick-start" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Start Guide</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Get started with meal planning in just 5 minutes by following these simple steps.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Planning Your First Meal</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the New Meal button at the top of the page or press the N key</li>
                <li>Enter a name for your meal in the Meal Name field</li>
                <li>Click the Date field and select when you want to eat this meal</li>
                <li>Click the Time field and choose the time</li>
                <li>Click the Meal Type dropdown and select Breakfast, Lunch, Dinner, or Snack</li>
                <li>Click the Create Meal button at the bottom</li>
                <li>Your meal now appears on the calendar or list</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Adding a Recipe to Your Meal</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click on the meal you just created</li>
                <li>Click the Edit button in the meal details</li>
                <li>Click the Link Recipe button</li>
                <li>Select a recipe from your saved recipes or click Discover Recipes to find new ones</li>
                <li>Click on the recipe you want to link</li>
                <li>Click Save Changes to update the meal</li>
                <li>The recipe is now connected to your meal</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Creating a Shopping List</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the Select button at the top of the page</li>
                <li>Check the boxes next to meals you want to shop for</li>
                <li>Click the Generate Shopping List button</li>
                <li>Review the ingredients from your selected meals</li>
                <li>Check or uncheck items you want on your shopping list</li>
                <li>Click Add to Shopping List</li>
                <li>Visit the Shopping page to see your complete list</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          {/* Creating & Managing Meals Section */}
          <section id="create-meal" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">How to Create a New Meal</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Creating a meal in Rowan is simple and only takes a few clicks. Follow these steps to schedule your meals.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Opening the New Meal Form</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Look at the top of the meal planning page</li>
                <li>Find the green New Meal button next to the search bar</li>
                <li>Click the New Meal button</li>
                <li>Alternatively, press the N key on your keyboard as a shortcut</li>
                <li>A form will appear on your screen</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Filling Out Meal Details</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>In the Meal Name field, type what you plan to eat</li>
                <li>Examples: Pasta Dinner, Morning Smoothie, Chicken Salad</li>
                <li>Click the Date field to open the calendar picker</li>
                <li>Click on the date when you want to eat this meal</li>
                <li>Click the Time field to open the time picker</li>
                <li>Select the hour and minute when you will eat</li>
                <li>Click the Meal Type dropdown menu</li>
                <li>Choose Breakfast, Lunch, Dinner, or Snack</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Linking a Recipe (Optional)</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the Link Recipe button in the form</li>
                <li>You will see your saved recipes appear</li>
                <li>Scroll through to find a recipe you want to use</li>
                <li>Click on the recipe card to select it</li>
                <li>If you do not have recipes yet, click Discover Recipes</li>
                <li>The recipe name will appear in the meal form</li>
                <li>You can skip this step and add a recipe later</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Saving Your Meal</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Review all the information you entered</li>
                <li>Make sure the date, time, and meal type are correct</li>
                <li>Click the Create Meal button at the bottom of the form</li>
                <li>The form will close automatically</li>
                <li>Your new meal now appears on the calendar or list view</li>
                <li>If you made a mistake, you can edit the meal later</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="link-recipes" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Linking Recipes to Meals</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Linking recipes to your meals allows Rowan to track ingredients automatically and generate accurate shopping lists.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Why Link Recipes?</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Rowan remembers all ingredients needed for the recipe</li>
                <li>You can generate shopping lists automatically</li>
                <li>View cooking instructions directly from your meal plan</li>
                <li>Track prep time and cook time for each meal</li>
                <li>See nutritional information if available</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Linking When Creating a Meal</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the New Meal button or press N</li>
                <li>Fill in the meal name, date, time, and type</li>
                <li>Click the Link Recipe button in the form</li>
                <li>Browse your saved recipes that appear</li>
                <li>Click on any recipe to select it</li>
                <li>The recipe becomes attached to your meal</li>
                <li>Click Create Meal to save everything</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Linking to an Existing Meal</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Find the meal you want to update in calendar or list view</li>
                <li>Click on the meal card to open details</li>
                <li>Click the Edit button in the meal details window</li>
                <li>Click the Link Recipe button</li>
                <li>Select a recipe from your collection</li>
                <li>Click Save Changes to update the meal</li>
                <li>The meal now shows the recipe name and details</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Changing a Linked Recipe</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Open the meal that already has a recipe</li>
                <li>Click the Edit button</li>
                <li>Click the Unlink Recipe button to remove the current recipe</li>
                <li>Click the Link Recipe button to choose a new one</li>
                <li>Select the new recipe you want</li>
                <li>Click Save Changes</li>
                <li>The meal now uses the new recipe</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="edit-meals" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Editing and Deleting Meals</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Plans change, and Rowan makes it easy to update or remove meals from your schedule.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Editing a Meal</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Find the meal you want to change in your calendar or list</li>
                <li>Click on the meal card to open the details</li>
                <li>Click the Edit button at the bottom of the details window</li>
                <li>Change any field you need: name, date, time, or meal type</li>
                <li>Click Link Recipe or Unlink Recipe to update the recipe</li>
                <li>Click Save Changes when you are done</li>
                <li>The meal updates immediately in your view</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Deleting a Single Meal</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click on the meal you want to remove</li>
                <li>Look for the Delete button in the meal details</li>
                <li>Click the Delete button</li>
                <li>A confirmation message will appear</li>
                <li>Click Confirm Delete to permanently remove the meal</li>
                <li>Click Cancel if you change your mind</li>
                <li>The meal disappears from your plan immediately</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Deleting Multiple Meals</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the Select button at the top of the page</li>
                <li>Checkboxes appear next to each meal</li>
                <li>Click the checkbox on each meal you want to delete</li>
                <li>Selected meals show a checkmark</li>
                <li>Click the Delete Selected button at the top</li>
                <li>Confirm you want to delete all selected meals</li>
                <li>All selected meals are removed at once</li>
                <li>Click Cancel Selection to exit without deleting</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Undoing a Delete</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>After deleting a meal, look for the Undo notification</li>
                <li>The notification appears at the bottom of the screen</li>
                <li>Click the Undo button within a few seconds</li>
                <li>The deleted meal returns to your plan</li>
                <li>This only works immediately after deleting</li>
                <li>After the notification disappears, the delete is permanent</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="past-meals" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Managing Past Meals</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Rowan tracks your meal history so you can review what you ate and plan similar meals in the future.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Understanding Past Meal Indicators</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Meals scheduled before today are considered past meals</li>
                <li>Past meals appear with slightly faded colors</li>
                <li>A small indicator shows the meal is completed</li>
                <li>Past meals are still saved in your history</li>
                <li>You can view details of any past meal</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Showing Past Meals in List View</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Switch to List view by clicking the List button or pressing 2</li>
                <li>By default, only future meals are shown</li>
                <li>Look for the Show Past button at the top of the list</li>
                <li>Click Show Past to include completed meals</li>
                <li>Past meals now appear above your upcoming meals</li>
                <li>Click Hide Past to show only future meals again</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Viewing Past Meals in Calendar View</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Switch to Calendar view by clicking Calendar or pressing 1</li>
                <li>Use the left arrow to navigate to previous weeks or months</li>
                <li>Past meals appear on their scheduled dates</li>
                <li>Click on any past meal to see full details</li>
                <li>You can edit or delete past meals if needed</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Reusing Past Meals</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Find a past meal you enjoyed</li>
                <li>Click on the meal to view details</li>
                <li>Note the recipe that was used</li>
                <li>Click the New Meal button to create a new meal</li>
                <li>Enter a new date and time for the future</li>
                <li>Link the same recipe to the new meal</li>
                <li>You have now planned the same meal again</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          {/* Recipe Management Section */}
          <section id="add-recipe" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Adding Recipes Manually</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Create custom recipes by entering all the details yourself. Perfect for family recipes or personal favorites.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Opening the Recipe Form</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the Recipes button at the top or press the 3 key</li>
                <li>You are now in the Recipes view</li>
                <li>Click the green New Recipe button</li>
                <li>Alternatively, press the R key on your keyboard</li>
                <li>The recipe creation form opens</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Entering Basic Recipe Information</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Type the recipe name in the Recipe Name field</li>
                <li>Enter the number of servings this recipe makes</li>
                <li>Type the prep time in minutes</li>
                <li>Type the cook time in minutes</li>
                <li>Click the Cuisine dropdown to select a cuisine type</li>
                <li>Add a description of the recipe if you want</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Adding Ingredients</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Find the Ingredients section in the form</li>
                <li>Type the first ingredient with amount in the text field</li>
                <li>Example: 2 cups flour or 1 pound chicken breast</li>
                <li>Click the Add Ingredient button</li>
                <li>The ingredient appears in the list below</li>
                <li>Repeat steps 2-5 for each ingredient</li>
                <li>Click the X button next to any ingredient to remove it</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Adding Instructions</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Scroll down to the Instructions section</li>
                <li>Type the first step in the instruction field</li>
                <li>Be specific and clear about what to do</li>
                <li>Click the Add Step button</li>
                <li>The step appears numbered in the list</li>
                <li>Add each step in order</li>
                <li>Click the X button to remove any step</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Saving Your Recipe</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Review all the information you entered</li>
                <li>Make sure ingredients and steps are correct</li>
                <li>Click the Save Recipe button at the bottom</li>
                <li>The recipe is now saved to your collection</li>
                <li>You can now link this recipe to meals</li>
                <li>Find your recipe in the Recipes view</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="discover-recipes" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Discovering Recipes from APIs</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Explore thousands of recipes from over 37 cuisines. Rowan connects to recipe databases to help you find new meals to try.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Opening Recipe Discovery</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the Recipes button at the top or press 3</li>
                <li>Look for the Discover Recipes tab</li>
                <li>Click on the Discover Recipes tab</li>
                <li>You will see a search bar and recipe suggestions</li>
                <li>Random recipes appear automatically to inspire you</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Searching for Specific Recipes</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Type what you want to cook in the search box</li>
                <li>Examples: chicken pasta, chocolate cake, vegetarian curry</li>
                <li>Press Enter or click the Search button</li>
                <li>Recipes matching your search appear below</li>
                <li>Scroll through the results to find recipes you like</li>
                <li>Each recipe shows a photo, name, prep time, and servings</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Browsing by Cuisine</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Find the cuisine dropdown menu near the search bar</li>
                <li>Click the dropdown to see all 37 cuisines</li>
                <li>Cuisines are listed with their flag icons</li>
                <li>Click on any cuisine to see recipes from that region</li>
                <li>Examples: Italian, Mexican, Japanese, Indian, Thai</li>
                <li>Recipe results update to show only that cuisine</li>
                <li>Click Random Recipes to see a mix of all cuisines again</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Viewing Recipe Details</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click on any recipe card you find interesting</li>
                <li>A detailed view opens showing all information</li>
                <li>Read the ingredient list to see what you need</li>
                <li>Review the cooking instructions step by step</li>
                <li>Check prep time and cook time to plan accordingly</li>
                <li>Look at nutritional information if available</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Saving Discovered Recipes</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>While viewing a recipe you like, find the Save button</li>
                <li>Click Save Recipe to add it to your collection</li>
                <li>The recipe is now saved permanently</li>
                <li>You can find it later in the Your Recipes tab</li>
                <li>Saved recipes can be linked to meals</li>
                <li>You can save as many recipes as you want</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="ai-import" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Using AI Recipe Import</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Let artificial intelligence extract recipe information from text or images. Perfect for converting recipes from websites, cookbooks, or recipe cards.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">When to Use AI Import</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>You have a recipe on a website you want to save</li>
                <li>You have a recipe written on paper or in a cookbook</li>
                <li>You received a recipe via email or text message</li>
                <li>You want to avoid typing all ingredients manually</li>
                <li>The recipe is in a photo or document</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Importing from Text</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the New Recipe button or press R</li>
                <li>Look for the Import with AI option</li>
                <li>Click Import with AI</li>
                <li>Copy the recipe text from wherever you found it</li>
                <li>Paste the text into the text box that appears</li>
                <li>Click the Analyze Recipe button</li>
                <li>Wait a few seconds while AI reads the recipe</li>
                <li>The form fills automatically with extracted information</li>
                <li>Review and edit any details that need correction</li>
                <li>Click Save Recipe when everything looks correct</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Importing from an Image</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Take a clear photo of the recipe</li>
                <li>Make sure all text is readable in the photo</li>
                <li>Click the New Recipe button or press R</li>
                <li>Click Import with AI</li>
                <li>Click the Upload Image button</li>
                <li>Select your recipe photo from your device</li>
                <li>Click the Analyze Image button</li>
                <li>Wait while AI reads the text from your image</li>
                <li>The recipe information fills in automatically</li>
                <li>Check all fields and fix any mistakes</li>
                <li>Click Save Recipe to add it to your collection</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Reviewing AI Results</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>AI is helpful but not perfect</li>
                <li>Always review the recipe name for accuracy</li>
                <li>Check that all ingredients were captured correctly</li>
                <li>Verify amounts and measurements make sense</li>
                <li>Read through instructions to ensure they are in order</li>
                <li>Add any missing steps or ingredients manually</li>
                <li>Edit prep time and cook time if they look wrong</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="organize-recipes" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Organizing Your Recipe Library</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                As your recipe collection grows, these tools help you find exactly what you need quickly.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Viewing All Your Recipes</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the Recipes button or press the 3 key</li>
                <li>Make sure you are on the Your Recipes tab</li>
                <li>All saved recipes appear as cards</li>
                <li>Each card shows recipe name, cuisine, and prep time</li>
                <li>Scroll down to see more recipes</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Searching Your Recipe Collection</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Look for the search bar at the top of the Recipes view</li>
                <li>Click in the search bar or press the / key</li>
                <li>Type any word from the recipe name</li>
                <li>Results filter automatically as you type</li>
                <li>Only matching recipes remain visible</li>
                <li>Clear the search box to see all recipes again</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Viewing Recipe Details</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click on any recipe card to open full details</li>
                <li>See the complete ingredient list</li>
                <li>Read all cooking instructions</li>
                <li>View prep time, cook time, and servings</li>
                <li>Check nutritional information if available</li>
                <li>Click the X to close the details and return to the list</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Editing Recipes</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Open the recipe you want to change</li>
                <li>Click the Edit button at the bottom</li>
                <li>Change any field you need to update</li>
                <li>Add or remove ingredients by clicking the X or Add buttons</li>
                <li>Edit instruction steps the same way</li>
                <li>Click Save Changes when done</li>
                <li>Your recipe updates immediately</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Deleting Recipes</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Open the recipe you no longer want</li>
                <li>Click the Delete button at the bottom</li>
                <li>Confirm you want to permanently delete it</li>
                <li>The recipe is removed from your collection</li>
                <li>If this recipe was linked to meals, those meals become unlinked</li>
                <li>Deleting a recipe does not delete meals that used it</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="plan-from-recipe" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Meal Planning from Recipes</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Skip multiple steps by planning a meal directly from any recipe in your collection.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Using the Plan Meal Button</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Go to the Recipes view by clicking Recipes or pressing 3</li>
                <li>Find a recipe you want to schedule</li>
                <li>Click on the recipe card to open details</li>
                <li>Look for the Plan Meal button at the bottom</li>
                <li>Click the Plan Meal button</li>
                <li>The new meal form opens with the recipe already linked</li>
                <li>Fill in the date, time, and meal type</li>
                <li>Click Create Meal to add it to your schedule</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Planning While Discovering Recipes</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Go to the Discover Recipes tab</li>
                <li>Search or browse for recipes you want to try</li>
                <li>Click on a recipe to view details</li>
                <li>Click Save Recipe first to add it to your collection</li>
                <li>Then click the Plan Meal button</li>
                <li>Choose when you want to cook this recipe</li>
                <li>The meal and recipe are both saved together</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Planning Multiple Meals from One Recipe</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Open any recipe you want to use multiple times</li>
                <li>Click Plan Meal and schedule the first meal</li>
                <li>Open the same recipe again</li>
                <li>Click Plan Meal again</li>
                <li>Choose a different date for the second meal</li>
                <li>Repeat as many times as you want</li>
                <li>The same recipe can be used for unlimited meals</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          {/* Shopping Lists Section */}
          <section id="generate-list" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Generating Shopping Lists from Meals</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Rowan automatically creates shopping lists based on ingredients from your planned meals.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Generating a List from One Meal</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Find a meal that has a recipe linked to it</li>
                <li>Click on the meal to open details</li>
                <li>Look for the Generate Shopping List button</li>
                <li>Click Generate Shopping List</li>
                <li>A list appears showing all ingredients from the recipe</li>
                <li>Each ingredient is checked by default</li>
                <li>Review the list in the next step</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Understanding What Gets Added</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Only meals with linked recipes can generate lists</li>
                <li>Every ingredient from the recipe appears on the list</li>
                <li>Amounts are included exactly as written in the recipe</li>
                <li>Rowan does not check what you already have at home</li>
                <li>You will choose which items to add in the next step</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">What Happens to Meals Without Recipes</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Meals without recipes cannot generate shopping lists</li>
                <li>First link a recipe to the meal</li>
                <li>Then you can generate a shopping list for it</li>
                <li>Or manually add items to your shopping list later</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="review-ingredients" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Reviewing and Customizing Ingredients</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Before adding ingredients to your shopping list, you can review and customize what gets added.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Reviewing the Ingredient List</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>After clicking Generate Shopping List, a preview appears</li>
                <li>All ingredients from your selected meals are listed</li>
                <li>Each ingredient shows the amount needed</li>
                <li>Ingredients are grouped by meal if multiple meals were selected</li>
                <li>Checkboxes next to each ingredient are checked by default</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Selecting Which Ingredients to Add</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Look through the list of ingredients</li>
                <li>If you already have an ingredient at home, uncheck it</li>
                <li>Click the checkbox to uncheck items you do not need</li>
                <li>Leave checked any items you need to buy</li>
                <li>You can uncheck as many items as you want</li>
                <li>Only checked items will be added to your shopping list</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Adding Selected Items to Shopping List</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>After reviewing and unchecking items you do not need</li>
                <li>Click the Add to Shopping List button at the bottom</li>
                <li>Only checked ingredients are added</li>
                <li>A confirmation message appears</li>
                <li>The ingredients now appear in your Shopping page</li>
                <li>Visit the Shopping page to view your complete list</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Canceling Without Adding</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>If you change your mind, click Cancel</li>
                <li>No ingredients are added to your shopping list</li>
                <li>You can generate the list again later</li>
                <li>Nothing is lost or deleted</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="bulk-shopping" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Bulk Shopping List Generation</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Generate one comprehensive shopping list from multiple meals at once, perfect for weekly grocery shopping.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Entering Selection Mode</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Look at the top of the meal planning page</li>
                <li>Find the Select button near the search bar</li>
                <li>Click the Select button</li>
                <li>Checkboxes appear next to every meal</li>
                <li>The page is now in selection mode</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Selecting Multiple Meals</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the checkbox next to each meal you want to include</li>
                <li>Selected meals show a checkmark</li>
                <li>You can select as many meals as you want</li>
                <li>Select meals for the whole week to plan one shopping trip</li>
                <li>Only select meals that have recipes linked</li>
                <li>Meals without recipes will not add ingredients</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Generating the Combined List</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>After selecting all desired meals</li>
                <li>Look for the Generate Shopping List button at the top</li>
                <li>Click Generate Shopping List</li>
                <li>All ingredients from all selected meals combine into one list</li>
                <li>Ingredients from multiple meals appear together</li>
                <li>Review the combined ingredient list</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Handling Duplicate Ingredients</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>If multiple recipes use the same ingredient, it appears multiple times</li>
                <li>Each instance shows which meal it came from</li>
                <li>You can uncheck duplicates if you will use one ingredient for multiple recipes</li>
                <li>Or keep all checked to buy enough for each meal</li>
                <li>Rowan shows all instances so you can decide</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Exiting Selection Mode</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>After generating your shopping list, click Cancel Selection</li>
                <li>Or press the Escape key on your keyboard</li>
                <li>Checkboxes disappear from all meals</li>
                <li>The page returns to normal view</li>
                <li>Your shopping list is saved even after exiting</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          {/* Advanced Features Section */}
          <section id="keyboard" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Using Keyboard Shortcuts</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Speed up your meal planning workflow with these keyboard shortcuts that work throughout the application.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Creating and Adding Content</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Press N to open the New Meal form from anywhere</li>
                <li>Press R to open the New Recipe form from anywhere</li>
                <li>These shortcuts work no matter which view you are in</li>
                <li>The form opens immediately without clicking buttons</li>
                <li>This saves time when planning multiple meals</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Switching Between Views</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Press 1 to switch to Calendar view instantly</li>
                <li>Press 2 to switch to List view</li>
                <li>Press 3 to switch to Recipes view</li>
                <li>You do not need to click the buttons at the top</li>
                <li>Your fingers can stay on the keyboard</li>
                <li>This is faster when you switch views frequently</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Searching Quickly</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Press the forward slash key (/) from anywhere</li>
                <li>The search bar activates immediately</li>
                <li>Your cursor appears in the search box</li>
                <li>Start typing to search meals or recipes</li>
                <li>This is faster than clicking in the search box</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Closing Modals and Dialogs</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Press Escape (ESC) to close any open form or dialog</li>
                <li>This works for meal forms, recipe forms, and detail views</li>
                <li>No need to find and click the X button</li>
                <li>Press ESC multiple times to close multiple dialogs</li>
                <li>This helps you navigate quickly</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Keyboard Shortcut Tips</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Shortcuts work even when forms are open</li>
                <li>You can press 1, 2, or 3 to switch views without closing forms first</li>
                <li>Combine shortcuts to work faster</li>
                <li>Example: Press 3 to go to recipes, then R to create a new one</li>
                <li>Practice using shortcuts to build muscle memory</li>
                <li>After a few uses, shortcuts become second nature</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="bulk-ops" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Bulk Operations with Select Mode</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Select Mode allows you to perform actions on multiple meals at once, saving time when managing your meal plan.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">What is Select Mode?</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Select Mode lets you choose multiple meals at once</li>
                <li>You can then delete all selected meals together</li>
                <li>Or generate one shopping list from all selected meals</li>
                <li>This is much faster than doing meals one by one</li>
                <li>Use it when planning weekly shopping or cleaning up old meals</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Activating Select Mode</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Find the Select button at the top of the page</li>
                <li>Click the Select button</li>
                <li>Small checkboxes appear next to every meal</li>
                <li>The button changes to show Cancel Selection</li>
                <li>You are now in Select Mode</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Selecting Meals</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the checkbox next to any meal to select it</li>
                <li>A checkmark appears when selected</li>
                <li>Click again to unselect a meal</li>
                <li>Select as many or as few meals as you need</li>
                <li>Selected meals work in both Calendar and List views</li>
                <li>The number of selected meals shows at the top</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Deleting Multiple Meals</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Select all meals you want to delete</li>
                <li>Look for the Delete Selected button at the top</li>
                <li>Click Delete Selected</li>
                <li>A confirmation dialog asks if you are sure</li>
                <li>Click Confirm to delete all selected meals</li>
                <li>All selected meals are removed at once</li>
                <li>An undo notification appears if you made a mistake</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Generating Shopping Lists in Bulk</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Select all meals you want to shop for</li>
                <li>Click Generate Shopping List at the top</li>
                <li>Ingredients from all selected meals combine</li>
                <li>Review the combined ingredient list</li>
                <li>Uncheck any items you already have</li>
                <li>Click Add to Shopping List</li>
                <li>One complete shopping list is created for all meals</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Exiting Select Mode</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the Cancel Selection button at the top</li>
                <li>Or press the Escape key on your keyboard</li>
                <li>All checkboxes disappear</li>
                <li>The page returns to normal viewing mode</li>
                <li>You can activate Select Mode again anytime</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="search" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Searching Meals and Recipes</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Quickly find specific meals or recipes in your collection using the built-in search feature.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Using the Search Bar</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Look at the top of the meal planning page</li>
                <li>Find the search bar that says Search meals or recipes</li>
                <li>Click in the search bar to activate it</li>
                <li>Or press the forward slash key (/) as a shortcut</li>
                <li>Your cursor appears in the search box</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Searching in Calendar and List Views</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Type any part of a meal name</li>
                <li>Results filter automatically as you type</li>
                <li>Only meals matching your search remain visible</li>
                <li>You can search for the meal type like breakfast or dinner</li>
                <li>Or search for a recipe name linked to meals</li>
                <li>Clear the search to see all meals again</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Searching in Recipes View</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Switch to Recipes view by clicking Recipes or pressing 3</li>
                <li>Click in the search bar or press /</li>
                <li>Type any part of a recipe name</li>
                <li>Only matching recipes appear</li>
                <li>Search works on both Your Recipes and Discover Recipes tabs</li>
                <li>This helps when you have a large recipe collection</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Search Tips</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>You do not need to type the complete name</li>
                <li>Partial matches work just fine</li>
                <li>Search is not case sensitive</li>
                <li>Typing chicken finds Chicken Pasta and Grilled Chicken</li>
                <li>Search updates instantly as you type</li>
                <li>Press Escape to clear the search quickly</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Clearing Search Results</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Click the X button in the search bar</li>
                <li>Or select all text and delete it</li>
                <li>Or press Escape to clear and exit search</li>
                <li>All meals or recipes reappear immediately</li>
                <li>The page returns to showing everything</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="calendar-nav" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Calendar Navigation</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Master the calendar view to efficiently navigate through your meal plans across different time periods.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Switching Calendar Modes</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Make sure you are in Calendar view by clicking Calendar or pressing 1</li>
                <li>Look for the view mode buttons above the calendar</li>
                <li>Click Week to see one week at a time</li>
                <li>Click 2 Weeks to see a two-week view</li>
                <li>Click Month to see an entire month</li>
                <li>The calendar updates immediately to show your selection</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Navigating Forward and Backward</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Find the left and right arrow buttons</li>
                <li>The arrows appear on both sides of the calendar</li>
                <li>Click the left arrow to go to the previous period</li>
                <li>Click the right arrow to go to the next period</li>
                <li>How far you move depends on your view mode</li>
                <li>Week view moves by one week</li>
                <li>Two-week view moves by two weeks</li>
                <li>Month view moves by one month</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Jumping to Today</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>If you navigate far into the past or future</li>
                <li>Look for the Today button above the calendar</li>
                <li>Click Today to return to the current week or month</li>
                <li>The calendar centers on today's date</li>
                <li>This helps you reorient quickly</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Understanding the Calendar Display</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Each day shows its date at the top</li>
                <li>Today's date is highlighted with a special color</li>
                <li>Meals appear as cards under their scheduled date</li>
                <li>Multiple meals on one day stack vertically</li>
                <li>Each meal card shows time, type, and name</li>
                <li>Click any meal card to see full details</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Choosing the Right View Mode</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Use Week view for detailed daily planning</li>
                <li>Use 2 Weeks view to see the current and next week together</li>
                <li>Use Month view to get an overview of all meals</li>
                <li>Month view is best for long-term planning</li>
                <li>Week view is best for day-to-day meal details</li>
                <li>Switch between views as needed</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          {/* Tips & Best Practices Section */}
          <section id="weekly-strategy" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Weekly Meal Planning Strategy</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Learn the best approach to planning an entire week of meals efficiently and effectively.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">When to Plan Your Week</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Choose one day each week as your planning day</li>
                <li>Sunday evening or Saturday morning work well for many people</li>
                <li>Set aside 20-30 minutes for meal planning</li>
                <li>Review your schedule for the upcoming week first</li>
                <li>Note which days are busy and need quick meals</li>
                <li>Identify days when you have more time to cook</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Planning Your Meals</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Start by planning dinners for the whole week</li>
                <li>Choose 5-7 dinner recipes depending on your schedule</li>
                <li>Mix quick meals with more complex recipes</li>
                <li>Plan simpler meals for busy weeknights</li>
                <li>Save elaborate recipes for weekends</li>
                <li>Then plan breakfasts and lunches if needed</li>
                <li>Consider leftovers from dinner for next day's lunch</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Creating Your Shopping List</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>After planning all meals for the week</li>
                <li>Click the Select button to enter selection mode</li>
                <li>Select all meals for the upcoming week</li>
                <li>Click Generate Shopping List</li>
                <li>Review the combined ingredient list</li>
                <li>Uncheck items you already have at home</li>
                <li>Add the remaining items to your shopping list</li>
                <li>Do one grocery trip for the entire week</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Balancing Your Meal Plan</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Vary cuisines throughout the week</li>
                <li>Do not plan Italian food every night</li>
                <li>Mix different proteins: chicken, beef, fish, vegetarian</li>
                <li>Include at least one or two vegetarian meals</li>
                <li>Plan one comfort food meal you know everyone enjoys</li>
                <li>Try one new recipe each week to expand your collection</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Staying Flexible</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Plans change, and that is okay</li>
                <li>If you need to eat out, edit or delete that meal</li>
                <li>Swap meals between days if needed</li>
                <li>Keep a few quick backup recipes in your collection</li>
                <li>Frozen pizzas or simple pasta can fill gaps</li>
                <li>Review your plan mid-week and adjust if needed</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="build-collection" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Building a Recipe Collection</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Build a diverse recipe collection that makes meal planning easier and more enjoyable.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">Starting Your Collection</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Begin by adding 10-15 recipes you already cook regularly</li>
                <li>These are your go-to meals that you know work</li>
                <li>Enter family recipes or favorite meals</li>
                <li>This gives you a foundation for meal planning</li>
                <li>You can plan meals immediately with these recipes</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Discovering New Recipes</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Visit the Discover Recipes tab regularly</li>
                <li>Browse different cuisines you have not tried</li>
                <li>Search for specific ingredients you want to use</li>
                <li>Save recipes that look interesting to try later</li>
                <li>Add 2-3 new recipes each week</li>
                <li>Your collection grows naturally over time</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Organizing by Category</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Include recipes for different occasions</li>
                <li>Save some quick weeknight meals under 30 minutes</li>
                <li>Add slower weekend recipes you enjoy cooking</li>
                <li>Include breakfast options if you meal plan breakfasts</li>
                <li>Save a few special occasion recipes</li>
                <li>Have backup recipes for busy days</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Trying Before Committing</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>When you try a new recipe, note if you enjoyed it</li>
                <li>If you loved it, keep it in your collection</li>
                <li>If it was just okay, decide if you will make it again</li>
                <li>Delete recipes you did not enjoy</li>
                <li>Edit recipes to note any changes you made</li>
                <li>Add personal notes about what worked</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Balancing Your Collection</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Aim for variety in cuisines</li>
                <li>Include different protein sources</li>
                <li>Save some vegetarian and vegan options</li>
                <li>Have recipes for different seasons</li>
                <li>Include both healthy and comfort food options</li>
                <li>Keep a mix of simple and complex recipes</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Using Your Collection</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>When planning meals, browse your collection first</li>
                <li>Rotate through different recipes each week</li>
                <li>Repeat favorites every few weeks</li>
                <li>Try at least one new recipe per week</li>
                <li>Use the search feature to find recipes quickly</li>
                <li>Your collection becomes a personal cookbook</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="meal-prep" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Meal Prep and Batch Cooking</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Use Rowan to plan and execute efficient meal prep sessions that save time during busy weekdays.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">What is Meal Prep?</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Meal prep means preparing multiple meals in advance</li>
                <li>You cook several servings of food at once</li>
                <li>Store prepared meals in containers</li>
                <li>Reheat meals throughout the week as needed</li>
                <li>This saves time on busy weeknights</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Planning Meals for Batch Cooking</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Choose recipes that reheat well</li>
                <li>Soups, stews, and casseroles are excellent choices</li>
                <li>Grilled chicken, rice bowls, and pasta dishes work well</li>
                <li>Avoid recipes with ingredients that get soggy</li>
                <li>Plan the same recipe for multiple meals during the week</li>
                <li>Example: Plan the same chili recipe for Monday and Wednesday dinners</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Using Rowan for Meal Prep Planning</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Find a recipe you want to meal prep</li>
                <li>Look at how many servings it makes</li>
                <li>Plan that recipe for multiple days in the week</li>
                <li>Click Plan Meal and schedule it for Monday</li>
                <li>Click Plan Meal again and schedule it for Wednesday</li>
                <li>Repeat for as many days as you want</li>
                <li>When generating shopping lists, buy ingredients for all servings at once</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Organizing Your Prep Day</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Choose one day as your meal prep day</li>
                <li>Sunday afternoon works well for many people</li>
                <li>Look at all meals you planned for the week</li>
                <li>Generate one shopping list for everything</li>
                <li>Shop the day before or morning of prep day</li>
                <li>Cook multiple recipes in one session</li>
                <li>Divide portions into containers and label them</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Batch Cooking Strategy</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Cook large batches of versatile proteins</li>
                <li>Prepare plain chicken, ground beef, or beans</li>
                <li>Cook big batches of rice, quinoa, or pasta</li>
                <li>Chop vegetables for multiple recipes at once</li>
                <li>Use these components in different meals</li>
                <li>Mix and match throughout the week</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Tracking What You Prepped</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Use Rowan to see which meals are prepped and ready</li>
                <li>Your calendar shows all planned meals for the week</li>
                <li>As you complete your prep, you know what is ready</li>
                <li>If you run out of a prepped meal, edit your plan</li>
                <li>Add notes to recipes about how well they reheated</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>

          <section id="collaborative" className="bg-gray-800 border border-gray-700 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Collaborative Meal Planning</h2>
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-400 mb-6">
                Work together with your partner or family members to plan meals that everyone will enjoy.
              </p>
              <h3 className="text-lg font-semibold text-white mb-4">How Rowan Supports Collaboration</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Rowan is designed for partners who share a household</li>
                <li>Both people in the partnership can access the same meal plan</li>
                <li>Meals you create are visible to your partner immediately</li>
                <li>Changes either person makes sync automatically</li>
                <li>You share the same recipe collection</li>
                <li>Shopping lists combine items from both people</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Planning Together</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Sit down together once a week to plan meals</li>
                <li>Take turns choosing recipes for different nights</li>
                <li>One person plans Monday, Wednesday, Friday</li>
                <li>The other person plans Tuesday, Thursday, Saturday</li>
                <li>Discuss who will cook on which nights</li>
                <li>Accommodate each person's schedule and preferences</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Dividing Responsibilities</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>One person can be responsible for meal planning</li>
                <li>The other person handles grocery shopping</li>
                <li>Or alternate weeks who does planning and shopping</li>
                <li>Both people can add recipes they find to the shared collection</li>
                <li>Anyone can generate shopping lists from planned meals</li>
                <li>Work together to find a rhythm that works</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Handling Different Preferences</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Save recipes for meals each person enjoys</li>
                <li>Plan some nights with each person's favorites</li>
                <li>Try new cuisines together</li>
                <li>If one person dislikes a recipe, note it and avoid planning it again</li>
                <li>Build your recipe collection with meals you both like</li>
                <li>Compromise on trying new recipes occasionally</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Communication Tips</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Check the meal plan before grocery shopping</li>
                <li>Let your partner know if you add or change meals</li>
                <li>Review the shopping list together before shopping</li>
                <li>Discuss if either person has late meetings or events affecting meals</li>
                <li>Be flexible when plans change</li>
                <li>Use Rowan as a shared reference point for the week</li>
              </ol>
              <h3 className="text-lg font-semibold text-white mb-4">Building a Shared Recipe Collection</h3>
              <ol className="list-decimal list-inside space-y-3 text-gray-300 mb-6">
                <li>Each person adds their favorite recipes to the collection</li>
                <li>Discover new recipes together</li>
                <li>Try one new recipe each week as a couple</li>
                <li>Save only recipes both people enjoy</li>
                <li>Delete recipes neither person wants to make again</li>
                <li>Over time you build a collection of tried and true meals</li>
              </ol>
              <a href="#" className="inline-flex items-center gap-2 text-orange-400 hover:underline mt-6">
                Back to Top ↑
              </a>
            </div>
          </section>
        </div>

        {/* Quick Reference Card */}
        <div className="mt-12 p-6 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-purple-400" />
            Quick Reference: Keyboard Shortcuts
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-sm font-mono text-white shadow-sm">N</kbd>
              <span className="text-sm text-gray-400">Create new meal</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-sm font-mono text-white shadow-sm">R</kbd>
              <span className="text-sm text-gray-400">Create new recipe</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-sm font-mono text-white shadow-sm">/</kbd>
              <span className="text-sm text-gray-400">Focus search</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-sm font-mono text-white shadow-sm">1</kbd>
              <span className="text-sm text-gray-400">Calendar view</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-sm font-mono text-white shadow-sm">2</kbd>
              <span className="text-sm text-gray-400">List view</span>
            </div>
            <div className="flex items-center gap-3">
              <kbd className="px-3 py-1.5 bg-gray-800 border border-gray-600 rounded-lg text-sm font-mono text-white shadow-sm">3</kbd>
              <span className="text-sm text-gray-400">Recipes view</span>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 p-6 bg-orange-900/20 border border-orange-800 rounded-xl">
          <h3 className="text-lg font-semibold text-white mb-2">Still Have Questions?</h3>
          <p className="text-sm text-gray-400 mb-4">
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
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
