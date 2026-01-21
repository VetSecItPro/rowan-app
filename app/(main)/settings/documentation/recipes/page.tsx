/* eslint-disable react/no-unescaped-entities */
'use client';

import Link from 'next/link';

import { UtensilsCrossed, Search, Brain, Clock, Star, BookOpen, Globe, Sparkles, Heart, ChefHat, ArrowLeft } from 'lucide-react';

interface GuideSection {
  title: string;
  description: string;
  icon: React.ElementType;
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
    description: 'Learn the basics of recipe discovery and library management',
    icon: UtensilsCrossed,
    color: 'from-yellow-500 to-yellow-600',
    articles: [
      {
        title: 'Understanding Recipe Library',
        description: 'Learn how to organize and discover recipes in your personal collection',
        readTime: '4 min',
        href: '#understanding-recipes',
      },
      {
        title: 'Your First Recipe Search',
        description: 'Discover new recipes using external API integrations',
        readTime: '3 min',
        href: '#first-search',
      },
      {
        title: 'AI Recipe Import',
        description: 'Import recipes from any cooking website using AI technology',
        readTime: '5 min',
        href: '#ai-import',
      },
    ],
  },
  {
    title: 'Recipe Discovery',
    description: 'Find new recipes from external sources and APIs',
    icon: Search,
    color: 'from-blue-500 to-blue-600',
    articles: [
      {
        title: 'External API Search',
        description: 'Search recipes from Spoonacular, Tasty, and API Ninjas',
        readTime: '4 min',
        href: '#external-apis',
      },
      {
        title: 'Cuisine & Category Filtering',
        description: 'Filter recipes by cuisine type, meal category, and dietary preferences',
        readTime: '3 min',
        href: '#cuisine-filtering',
      },
      {
        title: 'Difficulty & Time Filtering',
        description: 'Find recipes based on cooking difficulty and preparation time',
        readTime: '3 min',
        href: '#difficulty-filtering',
      },
      {
        title: 'Random Recipe Suggestions',
        description: 'Discover new recipes with random recipe suggestion features',
        readTime: '2 min',
        href: '#random-suggestions',
      },
      {
        title: 'Trending & Popular Recipes',
        description: 'Explore trending recipes and popular dishes from around the world',
        readTime: '3 min',
        href: '#trending-recipes',
      },
    ],
  },
  {
    title: 'AI Recipe Import',
    description: 'Import recipes from any cooking website using AI',
    icon: Brain,
    color: 'from-purple-500 to-purple-600',
    articles: [
      {
        title: 'URL-Based Import',
        description: 'Paste any cooking website URL to extract recipe information',
        readTime: '4 min',
        href: '#url-import',
      },
      {
        title: 'Google Gemini Integration',
        description: 'How AI extracts ingredients, instructions, and metadata',
        readTime: '5 min',
        href: '#gemini-integration',
      },
      {
        title: 'Data Extraction Process',
        description: 'Understanding how AI parses recipe titles, ingredients, and steps',
        readTime: '4 min',
        href: '#extraction-process',
      },
      {
        title: 'Recipe Correction',
        description: 'Review and edit AI-imported recipes before saving',
        readTime: '3 min',
        href: '#recipe-correction',
      },
      {
        title: 'Supported Website Formats',
        description: 'Learn which cooking websites work best with AI import',
        readTime: '3 min',
        href: '#supported-websites',
      },
    ],
  },
  {
    title: 'Recipe Library Management',
    description: 'Organize and manage your personal recipe collection',
    icon: BookOpen,
    color: 'from-green-500 to-green-600',
    articles: [
      {
        title: 'Recipe Organization',
        description: 'Categorize recipes with tags, cuisines, and custom collections',
        readTime: '4 min',
        href: '#recipe-organization',
      },
      {
        title: 'Recipe Search & Filtering',
        description: 'Find recipes in your library with powerful search and filters',
        readTime: '3 min',
        href: '#library-search',
      },
      {
        title: 'Favorite Recipes',
        description: 'Mark and organize your favorite recipes for quick access',
        readTime: '2 min',
        href: '#favorite-recipes',
      },
      {
        title: 'Recipe Rating & Reviews',
        description: 'Rate recipes and add personal notes and modifications',
        readTime: '3 min',
        href: '#recipe-rating',
      },
      {
        title: 'Recipe Sharing',
        description: 'Share recipes with family members and friends',
        readTime: '3 min',
        href: '#recipe-sharing',
      },
    ],
  },
  {
    title: 'Manual Recipe Creation',
    description: 'Create your own custom recipes from scratch',
    icon: ChefHat,
    color: 'from-red-500 to-red-600',
    articles: [
      {
        title: 'Recipe Builder',
        description: 'Use the step-by-step recipe builder for custom recipes',
        readTime: '5 min',
        href: '#recipe-builder',
      },
      {
        title: 'Ingredient Management',
        description: 'Add ingredients with quantities, units, and preparation notes',
        readTime: '4 min',
        href: '#ingredient-management',
      },
      {
        title: 'Instruction Steps',
        description: 'Write clear cooking instructions with timing and techniques',
        readTime: '4 min',
        href: '#instruction-steps',
      },
      {
        title: 'Recipe Photos',
        description: 'Add photos to showcase your finished dishes',
        readTime: '3 min',
        href: '#recipe-photos',
      },
      {
        title: 'Nutritional Information',
        description: 'Add nutritional data and dietary information to recipes',
        readTime: '4 min',
        href: '#nutritional-info',
      },
    ],
  },
  {
    title: 'Meal Planning Integration',
    description: 'Connect recipes with meal planning features',
    icon: Heart,
    color: 'from-pink-500 to-pink-600',
    articles: [
      {
        title: 'Recipe to Meal Conversion',
        description: 'Turn saved recipes into planned meals for your calendar',
        readTime: '3 min',
        href: '#recipe-to-meal',
      },
      {
        title: 'Shopping List Generation',
        description: 'Generate shopping lists from recipe ingredients',
        readTime: '4 min',
        href: '#shopping-generation',
      },
      {
        title: 'Meal Prep Planning',
        description: 'Plan meal prep sessions using recipe collections',
        readTime: '5 min',
        href: '#meal-prep',
      },
      {
        title: 'Recipe Scaling',
        description: 'Scale recipe quantities for different serving sizes',
        readTime: '3 min',
        href: '#recipe-scaling',
      },
    ],
  },
  {
    title: 'Advanced Features',
    description: 'Unlock powerful recipe discovery and management capabilities',
    icon: Star,
    color: 'from-indigo-500 to-indigo-600',
    articles: [
      {
        title: 'Recipe Collections',
        description: 'Create themed collections like "Quick Weeknight Dinners"',
        readTime: '4 min',
        href: '#recipe-collections',
      },
      {
        title: 'Cooking History',
        description: 'Track which recipes you\'ve cooked and when',
        readTime: '3 min',
        href: '#cooking-history',
      },
      {
        title: 'Recipe Analytics',
        description: 'Analyze your cooking patterns and favorite cuisines',
        readTime: '4 min',
        href: '#recipe-analytics',
      },
      {
        title: 'Import/Export',
        description: 'Import recipes from other apps and export your collection',
        readTime: '5 min',
        href: '#import-export',
      },
    ],
  },
];

export default function RecipesDocumentationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-yellow-950/30 to-orange-950/20">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings/documentation"
              className="inline-flex items-center gap-2 py-2 px-3 text-gray-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Documentation
            </Link>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <UtensilsCrossed className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
                Recipe Library & Discovery
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Discover, import, and organize recipes with AI-powered tools and extensive external integrations
              </p>
            </div>
          </div>

          {/* Guide Sections */}
          <div className="space-y-12">
            {guideSections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="bg-gray-800/70 backdrop-blur-sm border border-gray-700/60 rounded-3xl overflow-hidden shadow-lg">
                  {/* Section Header */}
                  <div className={`p-8 bg-gradient-to-r ${section.color} text-white`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold mb-2">{section.title}</h2>
                        <p className="text-white/90">{section.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Articles Grid */}
                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {section.articles.map((article) => (
                        <a
                          key={article.title}
                          href={article.href}
                          className="group p-6 bg-gray-800 rounded-2xl border border-gray-700 hover:shadow-lg hover:border-yellow-600 transition-all duration-200 hover:-translate-y-1"
                        >
                          <h3 className="font-semibold text-white mb-3 group-hover:text-yellow-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                            {article.description}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-yellow-400 font-medium">
                              {article.readTime}
                            </span>
                            <Clock className="w-3 h-3 text-gray-400" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pro Tips */}
          <div className="mt-12 p-6 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 rounded-2xl border border-blue-800">
            <h3 className="text-lg font-semibold text-white mb-4">💡 Pro Tips</h3>
            <div className="space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <p><strong>Use specific searches:</strong> Include cuisine type and ingredients for better recipe discovery results</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <p><strong>Review AI imports:</strong> Always review AI-imported recipes for accuracy before saving</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <p><strong>Organize with collections:</strong> Create themed collections like "Quick Weeknight Meals" or "Holiday Desserts"</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                <p><strong>Rate after cooking:</strong> Add ratings and notes after trying recipes to build your personal cookbook</p>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* ARTICLE CONTENT SECTIONS */}
          {/* ============================================================ */}
          <div className="mt-20 max-w-4xl mx-auto space-y-16">

            {/* ============================================================ */}
            {/* GETTING STARTED SECTION */}
            {/* ============================================================ */}

            {/* Understanding Recipe Library */}
            <section id="understanding-recipes" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Understanding Recipe Library</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The Recipe Library is your personal cookbook within Rowan. It combines powerful discovery tools with thoughtful organization features, helping you build a collection of recipes that match your family's tastes and dietary needs.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Three Ways to Build Your Library</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Discover:</strong> Search external recipe databases with millions of recipes</li>
                  <li><strong>Import:</strong> Use AI to extract recipes from any cooking website</li>
                  <li><strong>Create:</strong> Build your own recipes from scratch with our recipe builder</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Library Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Powerful search and filtering across all saved recipes</li>
                  <li>Collections for organizing recipes by theme or occasion</li>
                  <li>Favorites for quick access to your most-loved dishes</li>
                  <li>Ratings and personal notes to track what works</li>
                  <li>Integration with meal planning and shopping lists</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Shared vs. Personal Recipes</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Recipes in your library are shared with all members of your current space. This means family members can all access, rate, and plan meals using the same recipe collection. Perfect for coordinating family dinners and sharing cooking responsibilities.
                </p>

                <div className="p-4 bg-yellow-900/30 border border-yellow-800 rounded-lg mt-6">
                  <p className="text-yellow-200 text-sm">
                    <strong>Tip:</strong> Start by importing a few favorite recipes from websites you already use. This gives you a foundation to build on while you explore new recipes.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Your First Recipe Search */}
            <section id="first-search" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Your First Recipe Search</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Recipe search in Rowan connects you to vast external databases with millions of recipes. Whether you're looking for a specific dish or browsing for inspiration, the search tools make discovery easy and enjoyable.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Search for Recipes</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Navigate to the Recipes page from the main menu</li>
                  <li>Click "Discover Recipes" or use the search bar</li>
                  <li>Enter keywords like "chicken parmesan" or "vegetarian pasta"</li>
                  <li>Browse results with photos, ratings, and cook times</li>
                  <li>Click any recipe to see full details</li>
                  <li>Save recipes you like to your library</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Effective Search Tips</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Include main ingredients: "salmon lemon dill"</li>
                  <li>Add cuisine type: "thai curry" or "italian pasta"</li>
                  <li>Specify cooking method: "grilled chicken" or "slow cooker beef"</li>
                  <li>Use dietary terms: "gluten-free pizza" or "vegan dessert"</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Understanding Results</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Each search result shows key information at a glance: recipe photo, title, cooking time, difficulty level, and community ratings. This helps you quickly identify recipes that match your needs before diving into details.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* AI Recipe Import */}
            <section id="ai-import" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">AI Recipe Import</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Found a great recipe on a cooking blog or news site? Rowan's AI import feature can extract the recipe directly from any URL, converting it into a structured format you can save, edit, and use for meal planning.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How AI Import Works</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Copy the URL of any recipe page</li>
                  <li>Click "Import from URL" in Rowan</li>
                  <li>Paste the URL and click "Import"</li>
                  <li>AI analyzes the page and extracts recipe data</li>
                  <li>Review the extracted information</li>
                  <li>Make any corrections and save to your library</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What Gets Extracted</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Recipe title and description</li>
                  <li>Complete ingredient list with quantities</li>
                  <li>Step-by-step cooking instructions</li>
                  <li>Prep time, cook time, and total time</li>
                  <li>Serving size information</li>
                  <li>Recipe photo (when available)</li>
                  <li>Cuisine and category tags</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Powered by Google Gemini</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan uses Google's Gemini AI to understand recipe pages, even when they're formatted in unusual ways or buried in long blog posts. The AI is smart enough to find and extract the actual recipe content.
                </p>

                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>Note:</strong> Always review AI-imported recipes before saving. While the AI is highly accurate, complex recipes or unusual formatting may need manual corrections.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* RECIPE DISCOVERY SECTION */}
            {/* ============================================================ */}

            {/* External API Search */}
            <section id="external-apis" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">External API Search</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan integrates with multiple recipe databases, giving you access to millions of professionally tested recipes. Each source offers unique content, from home cooking favorites to restaurant-quality dishes.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Recipe Sources</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Spoonacular:</strong> Comprehensive recipe database with nutritional data</li>
                  <li><strong>Tasty:</strong> Viral recipes with video instructions</li>
                  <li><strong>API Ninjas:</strong> Diverse international recipes</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Search Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Keyword search across all sources simultaneously</li>
                  <li>Filter by source to focus on specific databases</li>
                  <li>Sort by relevance, rating, or cooking time</li>
                  <li>Paginated results for browsing large result sets</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Saving External Recipes</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  When you find a recipe you like from an external source, click "Save to Library" to add it to your personal collection. The recipe is then available offline and integrates with meal planning features.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Cuisine & Category Filtering */}
            <section id="cuisine-filtering" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Cuisine & Category Filtering</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Narrow your recipe searches using cuisine types, meal categories, and dietary preferences. These filters help you find exactly what you're looking for without scrolling through irrelevant results.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Cuisine Types</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>American, Italian, Mexican, Chinese, Japanese</li>
                  <li>Thai, Indian, French, Mediterranean, Greek</li>
                  <li>Korean, Vietnamese, Middle Eastern, African</li>
                  <li>Caribbean, Latin American, British, German</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Meal Categories</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Breakfast, Lunch, Dinner</li>
                  <li>Appetizers, Main Courses, Side Dishes</li>
                  <li>Desserts, Snacks, Beverages</li>
                  <li>Soups, Salads, Sandwiches</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Dietary Preferences</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Vegetarian, Vegan, Pescatarian</li>
                  <li>Gluten-Free, Dairy-Free, Nut-Free</li>
                  <li>Keto, Paleo, Low-Carb</li>
                  <li>Whole30, FODMAP-friendly</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Difficulty & Time Filtering */}
            <section id="difficulty-filtering" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Difficulty & Time Filtering</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Find recipes that match your available time and cooking skill level. These practical filters ensure you discover recipes you can actually make, whether it's a busy weeknight or a leisurely weekend.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Difficulty Levels</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Easy:</strong> Simple techniques, few ingredients, minimal prep</li>
                  <li><strong>Medium:</strong> Some cooking skills required, moderate complexity</li>
                  <li><strong>Hard:</strong> Advanced techniques, longer prep, more ingredients</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Time Ranges</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Under 15 minutes:</strong> Quick meals and snacks</li>
                  <li><strong>15-30 minutes:</strong> Fast weeknight dinners</li>
                  <li><strong>30-60 minutes:</strong> Standard home cooking</li>
                  <li><strong>Over 60 minutes:</strong> Weekend projects and special occasions</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Combining Filters</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Use multiple filters together for precise results. For example, find "Easy Italian Dinner recipes under 30 minutes" by selecting all relevant filters. Results update automatically as you adjust filters.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Random Recipe Suggestions */}
            <section id="random-suggestions" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Random Recipe Suggestions</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Stuck in a cooking rut? Use random recipe suggestions to discover new dishes you might never have searched for. It's a fun way to expand your culinary horizons and try something unexpected.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Get Suggestions</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Click the "Surprise Me" or random recipe button</li>
                  <li>A random recipe appears from external databases</li>
                  <li>Click again for a different suggestion</li>
                  <li>Save any recipes that catch your interest</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Filtered Random</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  You can still apply filters to random suggestions. Want a random vegetarian dinner? Set the filters first, then get a random suggestion within those parameters. This balances discovery with practicality.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Weekly Inspiration</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Try making random recipes a weekly tradition. "Mystery Recipe Fridays" can add excitement to your meal routine and help family members discover new favorites they'd never have chosen themselves.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Trending & Popular Recipes */}
            <section id="trending-recipes" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Trending & Popular Recipes</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  See what's popular in the cooking world right now. Trending recipes showcase dishes that are gaining attention, seasonal favorites, and crowd-pleasing classics that have stood the test of time.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Trending Sections</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>This Week's Hits:</strong> Recently popular recipes</li>
                  <li><strong>Seasonal Favorites:</strong> Recipes perfect for the current season</li>
                  <li><strong>All-Time Classics:</strong> Highly rated recipes with staying power</li>
                  <li><strong>Quick & Easy:</strong> Popular recipes under 30 minutes</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Why Try Trending Recipes</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Community-tested recipes with proven results</li>
                  <li>Stay current with food trends and techniques</li>
                  <li>Discover dishes your family might love</li>
                  <li>Seasonal recipes use fresh, available ingredients</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* AI RECIPE IMPORT SECTION */}
            {/* ============================================================ */}

            {/* URL-Based Import */}
            <section id="url-import" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">URL-Based Import</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  The easiest way to add recipes from the web is by pasting a URL. Rowan's AI handles the complex task of finding and extracting recipe information from any cooking website, no matter how it's formatted.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Import Steps</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Find a recipe you like on any cooking website</li>
                  <li>Copy the page URL from your browser</li>
                  <li>In Rowan, click "Import Recipe" or "Add from URL"</li>
                  <li>Paste the URL into the input field</li>
                  <li>Click "Import" and wait for AI processing</li>
                  <li>Review the extracted recipe data</li>
                  <li>Make any necessary edits and save</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Best Practices</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Use the direct recipe page URL, not a search results page</li>
                  <li>Ensure the page is publicly accessible (no paywalls)</li>
                  <li>Wait for the full page to load before copying the URL</li>
                  <li>Some sites may require you to scroll to load all content first</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Google Gemini Integration */}
            <section id="gemini-integration" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Google Gemini Integration</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan uses Google's Gemini AI to power recipe extraction. This advanced language model understands cooking content, recognizes recipe formats, and accurately extracts structured data from unstructured web pages.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How Gemini Processes Recipes</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Rowan fetches the web page content</li>
                  <li>HTML is cleaned and simplified for processing</li>
                  <li>Gemini analyzes the content to find the recipe</li>
                  <li>AI identifies and extracts each component</li>
                  <li>Data is formatted into Rowan's recipe structure</li>
                  <li>Results are presented for your review</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">AI Capabilities</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Understands recipe terminology in multiple languages</li>
                  <li>Handles various measurement systems (metric/imperial)</li>
                  <li>Recognizes cooking times even in narrative text</li>
                  <li>Separates instructions from blog content and stories</li>
                  <li>Identifies serving sizes and nutritional information</li>
                </ul>

                <div className="p-4 bg-purple-900/30 border border-purple-800 rounded-lg mt-6">
                  <p className="text-purple-200 text-sm">
                    <strong>Privacy Note:</strong> Recipe URLs are processed through Google's API. The content is used only for extraction and not stored beyond the processing session.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Data Extraction Process */}
            <section id="extraction-process" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Data Extraction Process</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Understanding how AI extracts recipe data helps you know what to expect and how to handle any issues. The extraction process is sophisticated but not perfect, so knowing its limitations helps you work with it effectively.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What Gets Extracted</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Title:</strong> Recipe name, usually the page heading</li>
                  <li><strong>Description:</strong> Introduction or summary text</li>
                  <li><strong>Ingredients:</strong> Full list with quantities and units</li>
                  <li><strong>Instructions:</strong> Step-by-step cooking directions</li>
                  <li><strong>Times:</strong> Prep time, cook time, total time</li>
                  <li><strong>Servings:</strong> Number of portions the recipe makes</li>
                  <li><strong>Tags:</strong> Cuisine, category, dietary information</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Extraction Challenges</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Long blog posts with the recipe buried at the bottom</li>
                  <li>Multiple recipes on one page</li>
                  <li>Inconsistent formatting or unusual layouts</li>
                  <li>Recipes spread across multiple pages</li>
                  <li>Video-only recipes without written instructions</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Recipe Correction */}
            <section id="recipe-correction" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe Correction</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  After AI extracts a recipe, you'll have the opportunity to review and correct any errors before saving. This step ensures your saved recipes are accurate and useful for cooking.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What to Review</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Title:</strong> Is it the correct recipe name?</li>
                  <li><strong>Ingredients:</strong> Are quantities and units correct?</li>
                  <li><strong>Instructions:</strong> Are all steps included and in order?</li>
                  <li><strong>Times:</strong> Do prep and cook times make sense?</li>
                  <li><strong>Servings:</strong> Is the yield accurate?</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Common Corrections</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Fix ingredient quantities that were misread</li>
                  <li>Add missing ingredients the AI didn't catch</li>
                  <li>Reorder steps that got shuffled</li>
                  <li>Correct unit conversions (tablespoons vs. teaspoons)</li>
                  <li>Add preparation notes that were missed</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Making Edits</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Use the editing interface to make corrections. You can edit any field, add or remove ingredients, and reorder instructions. Take your time - it's easier to fix now than after you've started cooking!
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Supported Website Formats */}
            <section id="supported-websites" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Supported Website Formats</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Rowan's AI can extract recipes from most cooking websites, but some formats work better than others. Understanding what works best helps you choose sources that import smoothly.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Best Results From</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Major recipe sites (AllRecipes, Food Network, Epicurious)</li>
                  <li>Sites using standard recipe card formats</li>
                  <li>Pages with clearly structured ingredient and step lists</li>
                  <li>Sites with JSON-LD recipe schema markup</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">May Require More Editing</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Long blog posts with recipes at the bottom</li>
                  <li>Sites with recipes in unusual formats</li>
                  <li>Pages with heavy advertising that breaks formatting</li>
                  <li>International sites with mixed language content</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Not Currently Supported</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Video-only recipes without written content</li>
                  <li>PDF recipe files</li>
                  <li>Paywalled or login-required content</li>
                  <li>Social media posts (Instagram, TikTok)</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* RECIPE LIBRARY MANAGEMENT SECTION */}
            {/* ============================================================ */}

            {/* Recipe Organization */}
            <section id="recipe-organization" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe Organization</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  A well-organized recipe library makes meal planning and cooking much easier. Rowan provides multiple ways to categorize and organize your recipes so you can find what you need quickly.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Organization Methods</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Cuisine Tags:</strong> Italian, Mexican, Asian, etc.</li>
                  <li><strong>Meal Type:</strong> Breakfast, Lunch, Dinner, Dessert</li>
                  <li><strong>Dietary Tags:</strong> Vegetarian, Gluten-Free, Keto</li>
                  <li><strong>Custom Collections:</strong> Themed groups you create</li>
                  <li><strong>Favorites:</strong> Quick access to your best recipes</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Tagging Best Practices</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Use consistent tag names (don't mix "Italian" and "italian")</li>
                  <li>Add all applicable tags, not just one</li>
                  <li>Include cooking method tags (grilled, slow-cooker, one-pot)</li>
                  <li>Tag by main protein or primary ingredient</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Recipe Search & Filtering */}
            <section id="library-search" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Search className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe Search & Filtering</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Search through your saved recipes using keywords, filters, or a combination of both. The library search is optimized for quick results even as your collection grows.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Search Options</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Search by recipe name or keywords</li>
                  <li>Search within ingredient lists</li>
                  <li>Filter by cuisine, meal type, or dietary tags</li>
                  <li>Filter by cooking time or difficulty</li>
                  <li>Show only favorites or highly rated recipes</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Quick Access Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Recent recipes you've viewed or cooked</li>
                  <li>Your favorite recipes section</li>
                  <li>Filter by collection for themed browsing</li>
                  <li>Sort by name, date added, or rating</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Favorite Recipes */}
            <section id="favorite-recipes" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Favorite Recipes</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Mark your best and most-used recipes as favorites for instant access. Favorites create a curated shortlist of your go-to recipes, perfect for quick meal planning decisions.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Using Favorites</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Click the heart icon on any recipe to favorite it</li>
                  <li>Access all favorites from the dedicated Favorites section</li>
                  <li>Filter library view to show only favorites</li>
                  <li>Each family member can have their own favorites</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">What to Favorite</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Recipes your family loves and requests often</li>
                  <li>Quick weeknight staples you make regularly</li>
                  <li>Holiday and special occasion dishes</li>
                  <li>Recipes you want to try soon</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Recipe Rating & Reviews */}
            <section id="recipe-rating" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe Rating & Reviews</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  After cooking a recipe, add your rating and personal notes. This helps you remember how it turned out, what modifications worked, and whether you'd make it again.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Rating System</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Rate recipes from 1-5 stars</li>
                  <li>Each space member can add their own rating</li>
                  <li>See average family rating on each recipe</li>
                  <li>Sort your library by rating to find top dishes</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Personal Notes</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Record modifications you made</li>
                  <li>Note ingredient substitutions that worked</li>
                  <li>Document cooking time adjustments for your equipment</li>
                  <li>Save tips for next time you make it</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Recipe Sharing */}
            <section id="recipe-sharing" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe Sharing</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Share your favorite recipes with friends and extended family, or keep recipes within your space for family-only access. Rowan makes sharing easy while respecting privacy preferences.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Sharing Within Spaces</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  All recipes in your library are automatically shared with space members. Everyone in your family can access, cook, and rate recipes in the shared library.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Sharing Externally</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Generate a shareable link for any recipe</li>
                  <li>Send recipes via email or messaging apps</li>
                  <li>Export recipes in standard formats</li>
                  <li>Print formatted recipe cards</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* MANUAL RECIPE CREATION SECTION */}
            {/* ============================================================ */}

            {/* Recipe Builder */}
            <section id="recipe-builder" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe Builder</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Create your own recipes from scratch using Rowan's step-by-step recipe builder. Perfect for documenting family recipes, original creations, or dishes you've perfected over time.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Builder Sections</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li><strong>Basic Info:</strong> Title, description, and photo</li>
                  <li><strong>Details:</strong> Servings, prep time, cook time, difficulty</li>
                  <li><strong>Ingredients:</strong> List with quantities and units</li>
                  <li><strong>Instructions:</strong> Step-by-step cooking directions</li>
                  <li><strong>Tags:</strong> Cuisine, category, and dietary tags</li>
                  <li><strong>Nutrition:</strong> Optional nutritional information</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Tips for Great Recipes</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Write clear, specific ingredient quantities</li>
                  <li>Include preparation notes (chopped, diced, minced)</li>
                  <li>Break complex steps into smaller, manageable ones</li>
                  <li>Add timing cues ("cook until golden, about 5 minutes")</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Ingredient Management */}
            <section id="ingredient-management" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <UtensilsCrossed className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Ingredient Management</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Build detailed ingredient lists with quantities, units, and preparation instructions. Well-structured ingredients make recipes easier to follow and enable features like shopping list generation.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Ingredient Fields</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Quantity:</strong> Amount needed (1, 2, 1/2, etc.)</li>
                  <li><strong>Unit:</strong> Measurement (cups, tablespoons, pounds)</li>
                  <li><strong>Ingredient:</strong> Name of the ingredient</li>
                  <li><strong>Preparation:</strong> How to prep (chopped, melted, room temp)</li>
                  <li><strong>Notes:</strong> Optional additional info (or substitute with...)</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Ingredient Groups</h3>
                <p className="text-gray-400 leading-relaxed mb-4">
                  For complex recipes, organize ingredients into groups like "For the sauce" or "For the marinade." This helps cooks gather ingredients in the order they'll be used.
                </p>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Instruction Steps */}
            <section id="instruction-steps" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Instruction Steps</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Write clear, detailed cooking instructions that guide anyone through making the recipe successfully. Good instructions are the heart of a useful recipe.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Writing Effective Steps</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Start each step with an action verb (Mix, Chop, Preheat)</li>
                  <li>Keep steps focused on one main action</li>
                  <li>Include visual cues ("until golden brown")</li>
                  <li>Add timing when relevant ("simmer for 20 minutes")</li>
                  <li>Note temperature settings when they change</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Step Organization</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Number steps automatically for easy reference</li>
                  <li>Reorder steps by dragging</li>
                  <li>Add step photos or videos (optional)</li>
                  <li>Include timing for each step when helpful</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Recipe Photos */}
            <section id="recipe-photos" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe Photos</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Add photos to your recipes to showcase the finished dish and help identify recipes at a glance. Photos also make your recipe library more visually appealing and browsable.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Photo Types</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li><strong>Main Photo:</strong> The finished dish, shown in listings</li>
                  <li><strong>Step Photos:</strong> Progress shots for tricky steps</li>
                  <li><strong>Ingredient Photos:</strong> Show what ingredients look like</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Photo Tips</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Use natural light when possible</li>
                  <li>Show the food as the main subject</li>
                  <li>Take photos before you start eating!</li>
                  <li>Square or landscape formats work best</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Nutritional Information */}
            <section id="nutritional-info" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Nutritional Information</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Add nutritional data to your recipes for health-conscious cooking. Track calories, macronutrients, and dietary information to make informed meal choices.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Nutrition Fields</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Calories per serving</li>
                  <li>Protein, carbohydrates, and fat</li>
                  <li>Fiber and sugar</li>
                  <li>Sodium and cholesterol</li>
                  <li>Vitamins and minerals (optional)</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Dietary Tags</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Mark recipes as vegetarian, vegan, or pescatarian</li>
                  <li>Tag allergen information (contains nuts, dairy, etc.)</li>
                  <li>Note diet compatibility (keto, paleo, whole30)</li>
                  <li>Flag as low-sodium, low-carb, or heart-healthy</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* MEAL PLANNING INTEGRATION SECTION */}
            {/* ============================================================ */}

            {/* Recipe to Meal Conversion */}
            <section id="recipe-to-meal" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe to Meal Conversion</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Turn any saved recipe into a planned meal with a single click. This creates a connection between your recipe library and meal planning calendar, making weekly planning effortless.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How to Plan a Recipe</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-400">
                  <li>Find the recipe you want to make</li>
                  <li>Click "Add to Meal Plan" or the calendar icon</li>
                  <li>Select the date and meal type (breakfast/lunch/dinner)</li>
                  <li>Adjust serving size if needed</li>
                  <li>The meal appears on your calendar</li>
                </ol>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Benefits</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Recipe details accessible from your meal plan</li>
                  <li>Automatic shopping list generation</li>
                  <li>Track what you've planned for the week</li>
                  <li>Avoid repeating meals unintentionally</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Shopping List Generation */}
            <section id="shopping-generation" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Shopping List Generation</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Generate shopping lists directly from recipes or meal plans. Rowan automatically compiles ingredients, combines duplicates, and organizes items by store section.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Generation Options</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Generate from a single recipe</li>
                  <li>Generate from your entire week's meal plan</li>
                  <li>Combine ingredients from multiple recipes</li>
                  <li>Adjust quantities based on serving sizes</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Smart Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Combines same ingredients across recipes</li>
                  <li>Converts units for consistency</li>
                  <li>Filters out pantry staples (optional)</li>
                  <li>Groups by store section for efficient shopping</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Meal Prep Planning */}
            <section id="meal-prep" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Meal Prep Planning</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Plan batch cooking sessions using recipe collections. Meal prep helps you cook once and eat well all week, saving time on busy weekdays.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Meal Prep Strategies</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Create a "Meal Prep" collection with make-ahead recipes</li>
                  <li>Use scaling to make larger batches</li>
                  <li>Generate one shopping list for your prep session</li>
                  <li>Note storage instructions and reheating tips</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Good Prep Recipes</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Soups, stews, and chilis that reheat well</li>
                  <li>Grain bowls with separate components</li>
                  <li>Marinated proteins ready to cook</li>
                  <li>Pre-chopped vegetables for quick cooking</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Recipe Scaling */}
            <section id="recipe-scaling" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe Scaling</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Adjust recipe quantities for different serving sizes. Whether cooking for two or a crowd, scaling ensures you have the right amounts of everything.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">How Scaling Works</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Select your desired serving size</li>
                  <li>All ingredient quantities adjust automatically</li>
                  <li>Scaled amounts appear in the recipe view</li>
                  <li>Shopping lists use scaled quantities</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Scaling Considerations</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Some items don't scale linearly (spices, leaveners)</li>
                  <li>Cooking times may need adjustment for larger batches</li>
                  <li>Equipment size limits how much you can scale up</li>
                  <li>Review scaled amounts for reasonableness</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* ============================================================ */}
            {/* ADVANCED FEATURES SECTION */}
            {/* ============================================================ */}

            {/* Recipe Collections */}
            <section id="recipe-collections" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe Collections</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Create themed collections to organize recipes beyond basic categories. Collections are custom groups you define based on your family's needs and preferences.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Collection Ideas</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>"Quick Weeknight Dinners" - recipes under 30 minutes</li>
                  <li>"Holiday Favorites" - special occasion dishes</li>
                  <li>"Kids' Favorites" - recipes the whole family loves</li>
                  <li>"Date Night" - impressive dishes for two</li>
                  <li>"Summer Grilling" - outdoor cooking recipes</li>
                  <li>"Meal Prep Champions" - great for batch cooking</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Managing Collections</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Create, rename, and delete collections</li>
                  <li>Add recipes to multiple collections</li>
                  <li>Reorder collections by importance</li>
                  <li>Share collections with space members</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Cooking History */}
            <section id="cooking-history" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Cooking History</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Track which recipes you've cooked and when. Cooking history helps you remember past meals, avoid repetition, and identify family favorites based on how often you make them.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">History Features</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Automatic tracking when you mark a meal as cooked</li>
                  <li>View recipe cook count and last cooked date</li>
                  <li>See your most frequently made recipes</li>
                  <li>Filter by date range to see what you cooked</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Using History for Planning</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Avoid cooking the same thing too often</li>
                  <li>Rediscover recipes you haven't made in a while</li>
                  <li>See seasonal patterns in your cooking</li>
                  <li>Track progress on trying new recipes</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Recipe Analytics */}
            <section id="recipe-analytics" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Recipe Analytics</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Understand your cooking patterns with recipe analytics. See insights into your favorite cuisines, most-used ingredients, and how your cooking habits change over time.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Available Analytics</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Cuisine breakdown - which cuisines you cook most</li>
                  <li>Meal type distribution - breakfast vs. dinner recipes</li>
                  <li>Cooking frequency - how often you cook from recipes</li>
                  <li>Top ingredients - most commonly used items</li>
                  <li>Rating trends - how your ratings compare</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Using Insights</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Discover cuisines to explore more</li>
                  <li>Balance your meal variety</li>
                  <li>Stock up on frequently used ingredients</li>
                  <li>Set goals for trying new things</li>
                </ul>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

            {/* Import/Export */}
            <section id="import-export" className="scroll-mt-24">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Import/Export</h2>
              </div>
              <div className="prose prose-gray prose-invert max-w-none">
                <p className="text-gray-400 leading-relaxed mb-4">
                  Move recipes between apps and create backups of your collection. Import/export features ensure your recipes are never locked in and always portable.
                </p>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Export Options</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Export individual recipes or your entire library</li>
                  <li>Choose from standard formats (JSON, CSV)</li>
                  <li>Generate printable recipe cards</li>
                  <li>Create shareable PDFs of collections</li>
                </ul>

                <h3 className="text-lg font-semibold text-white mt-6 mb-3">Import Options</h3>
                <ul className="list-disc list-inside space-y-2 text-gray-400">
                  <li>Import from other recipe management apps</li>
                  <li>Bulk import from CSV files</li>
                  <li>AI import from URLs (covered earlier)</li>
                  <li>Manual entry for any source</li>
                </ul>

                <div className="p-4 bg-indigo-900/30 border border-indigo-800 rounded-lg mt-6">
                  <p className="text-indigo-200 text-sm">
                    <strong>Backup Tip:</strong> Periodically export your entire recipe library as a backup. This protects your collection against data loss and makes it easy to migrate if needed.
                  </p>
                </div>
              </div>
              <a href="#" className="inline-flex items-center gap-2 mt-6 text-yellow-400 hover:underline text-sm font-medium">
                ← Back to top
              </a>
            </section>

          </div>
        </div>
      </div>
  );
}