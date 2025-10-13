import { UtensilsCrossed, Calendar, ShoppingCart, BookOpen, Users, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';

export default function MealsFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white dark:from-black dark:via-orange-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-meals rounded-3xl mb-6 shadow-xl shadow-orange-500/30 animate-bounce-subtle">
            <UtensilsCrossed className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Meal Planning
          </h1>

          <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Plan your meals for the week ahead. Save time, reduce stress, and eat better together.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center mb-6">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Weekly Planning</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Plan meals for the entire week. Drag and drop recipes to different days effortlessly.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-red-500 rounded-2xl flex items-center justify-center mb-6">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Recipe Library</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Save your favorite recipes with ingredients, steps, and photos. Build your family cookbook.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Auto Shopping Lists</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Generate shopping lists automatically from your meal plan. Never forget ingredients.
            </p>
          </div>
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Complete meal planning tools for busy families
            </p>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              'Plan meals on a visual calendar view',
              'Create and save unlimited recipes with ingredients',
              'Add detailed instructions and notes to recipes',
              'Assign meal types (breakfast, lunch, dinner, snack)',
              'View planned meals in calendar, list, or recipe format',
              'Search through meals and recipes',
              'Track statistics for meals this week and saved recipes',
              'Navigate through months to plan ahead',
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                  <Check className="w-4 h-4 text-white" />
                </div>
                <p className="text-lg text-gray-900 dark:text-white font-medium">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Perfect for every family
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              From weeknight dinners to special occasions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Busy Weeknights</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <UtensilsCrossed className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                  <span>Plan quick 30-minute meals for after work</span>
                </li>
                <li className="flex items-start gap-3">
                  <UtensilsCrossed className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                  <span>Coordinate who's cooking each night</span>
                </li>
                <li className="flex items-start gap-3">
                  <UtensilsCrossed className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                  <span>Prep ingredients ahead on weekends</span>
                </li>
                <li className="flex items-start gap-3">
                  <UtensilsCrossed className="w-5 h-5 text-orange-500 mt-1 flex-shrink-0" />
                  <span>Plan kid-friendly meals everyone will eat</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Special Meals</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                  <span>Plan elaborate weekend family dinners</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                  <span>Organize holiday feast preparations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                  <span>Try new recipes and rate them together</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                  <span>Accommodate dietary needs and allergies</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-orange-600 to-red-600 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Make mealtime magical
          </h2>
          <p className="text-xl text-orange-100 mb-10">
            Join families eating better and stressing less
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-4 shimmer-bg text-white rounded-full font-semibold hover:opacity-90 transition-all shadow-xl shadow-purple-500/50"
            >
              Create Your Account
            </Link>
            <Link
              href="/"
              className="px-8 py-4 bg-orange-700 text-white rounded-full font-bold text-lg hover:bg-orange-800 transition-all"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Footer Spacer */}
      <div className="h-20"></div>
    </div>
  );
}
