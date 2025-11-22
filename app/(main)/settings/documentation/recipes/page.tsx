'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { UtensilsCrossed, Search, Brain, Clock, Star, BookOpen, Globe, Sparkles, Heart, ChefHat } from 'lucide-react';

const guides = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of recipe discovery and library management',
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
    <FeatureLayout
      breadcrumbItems={[
        { label: 'Documentation', href: '/settings/documentation' },
        { label: 'Recipe Library & Discovery' },
      ]}
    >
      {/* Page Header */}
      <div className="mb-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
          <UtensilsCrossed className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
          Recipe Library & Discovery
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Discover, import, and organize recipes with AI-powered tools and extensive external integrations
        </p>
      </div>

      {/* Quick Stats */}
      <div className="mb-12 p-8 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 rounded-2xl border border-yellow-200 dark:border-yellow-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center mx-auto mb-3">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">AI Recipe Import</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Import from any cooking website with AI</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mx-auto mb-3">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">External APIs</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Search Spoonacular, Tasty, API Ninjas</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Personal Library</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Organize and manage your recipe collection</p>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Brain className="w-8 h-8 text-yellow-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">AI-Powered Import</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Import recipes from any cooking website URL</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Search className="w-8 h-8 text-blue-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">External Recipe Search</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Discover recipes from multiple cooking APIs</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <BookOpen className="w-8 h-8 text-green-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Personal Recipe Library</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Organize saved and custom recipes</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Star className="w-8 h-8 text-purple-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Recipe Rating System</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Rate and review recipes with personal notes</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <ChefHat className="w-8 h-8 text-red-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Custom Recipe Creation</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Build your own recipes from scratch</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <Heart className="w-8 h-8 text-pink-500 mb-3" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Meal Plan Integration</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Convert recipes to meals and shopping lists</p>
          </div>
        </div>
      </div>

      {/* AI Technology Spotlight */}
      <div className="mb-12 p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-2xl border border-purple-200 dark:border-purple-800">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">🤖 AI Recipe Import Technology</h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
              Our Google Gemini-powered AI can extract complete recipe information from any cooking website URL:
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span><strong>Recipe Title:</strong> Automatic title extraction and formatting</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span><strong>Ingredients List:</strong> Quantities, units, and preparation notes</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span><strong>Instructions:</strong> Step-by-step cooking directions</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span><strong>Timing & Servings:</strong> Prep time, cook time, serving size</span>
          </div>
        </div>
      </div>

      {/* External API Sources */}
      <div className="mb-12 p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-2xl border border-green-200 dark:border-green-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🌍 Recipe Discovery Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Spoonacular</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">380,000+ recipes with detailed nutritional data</p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Tasty API</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Buzzfeed's popular recipe collection</p>
          </div>
          <div className="text-center p-4 bg-white dark:bg-gray-800 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">API Ninjas</h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">Curated recipes with cuisine categorization</p>
          </div>
        </div>
      </div>

      {/* Guide Sections */}
      <div className="space-y-12">
        {guides.map((guide) => (
          <section key={guide.title} className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{guide.title}</h2>
                <p className="text-gray-600 dark:text-gray-400">{guide.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guide.articles.map((article) => (
                <a
                  key={article.title}
                  href={article.href}
                  className="group p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-yellow-300 dark:hover:border-yellow-600 hover:shadow-lg transition-all"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-yellow-600 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{article.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-yellow-600 dark:text-yellow-400">{article.readTime}</span>
                    <Clock className="w-3 h-3 text-gray-400" />
                  </div>
                </a>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Pro Tips */}
      <div className="mt-12 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">💡 Pro Tips</h3>
        <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
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
    </FeatureLayout>
  );
}