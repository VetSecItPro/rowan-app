'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
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
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50/30 to-orange-50/30 dark:from-gray-950 dark:via-yellow-950/20 dark:to-orange-950/20">
        <div className="max-w-7xl mx-auto p-6 sm:p-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/settings/documentation"
              className="inline-flex items-center gap-2 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Documentation
            </Link>
            <div className="text-center mb-8">
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
          </div>

          {/* Guide Sections */}
          <div className="space-y-12">
            {guideSections.map((section) => {
              const Icon = section.icon;
              return (
                <div key={section.title} className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-3xl overflow-hidden shadow-lg">
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
                          className="group p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-yellow-300 dark:hover:border-yellow-600 transition-all duration-200 hover:-translate-y-1"
                        >
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">
                            {article.description}
                          </p>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
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
        </div>
      </div>
    </>
  );
}