import { ShoppingCart, CheckCircle, Smartphone, Users, RefreshCw, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';

export default function ShoppingFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white dark:from-black dark:via-emerald-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-shopping rounded-3xl mb-6 shadow-xl shadow-emerald-500/30 animate-bounce-subtle">
            <ShoppingCart className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Shopping Lists
          </h1>

          <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Collaborative shopping lists that sync in real-time. Never forget items or buy duplicates again.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-6">
              <RefreshCw className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Real-Time Sync</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Changes appear instantly for everyone. See what's been checked off as you shop.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Collaborative</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Everyone can add items, check them off, or add notes. Shop together or separately.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
              <Smartphone className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Mobile Friendly</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Access your lists from any device. Perfect for shopping on the go at any store.
            </p>
          </div>
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Smart shopping list features that save time and money
            </p>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              'Create unlimited shopping lists with custom titles',
              'Add items with quantities to each list',
              'Check off items in real-time as you shop',
              'Auto-complete lists when all items are checked',
              'Filter lists by status (active, completed, all)',
              'Search across all your shopping lists',
              'View stats for total lists, active lists, and items this week',
              'Track completed lists for reference',
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-4 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
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
              Perfect for every shopping trip
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              From weekly groceries to special occasions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Everyday Shopping</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <ShoppingCart className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                  <span>Weekly grocery runs made efficient</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShoppingCart className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                  <span>Quick stops at the pharmacy or hardware store</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShoppingCart className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                  <span>Coordinated shopping when multiple people go out</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShoppingCart className="w-5 h-5 text-emerald-500 mt-1 flex-shrink-0" />
                  <span>Never forget essential household items</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Special Occasions</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>Plan party supplies and decorations</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>Organize ingredients for holiday cooking</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>Track school supplies and back-to-school needs</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>Manage gift shopping for birthdays</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-emerald-600 to-green-600 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Shop smarter together
          </h2>
          <p className="text-xl text-emerald-100 mb-10">
            Join families saving time and money on every trip
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
              className="px-8 py-4 bg-emerald-700 text-white rounded-full font-bold text-lg hover:bg-emerald-800 transition-all"
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
