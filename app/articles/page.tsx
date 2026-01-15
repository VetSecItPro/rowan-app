'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText,
  ArrowRight,
  Calendar,
  CheckSquare,
  ShoppingCart,
  MessageSquare,
  Target,
  Bell,
  Utensils,
  DollarSign,
  Clock,
  Search
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BetaAccessModal } from '@/components/beta/BetaAccessModal';
import { LaunchNotificationModal } from '@/components/beta/LaunchNotificationModal';

// Article data - can be moved to a CMS or database later
const articles = [
  {
    slug: 'getting-started-with-rowan',
    title: 'Getting Started with Rowan: Your Complete Guide',
    description: 'Learn how to set up Rowan for your family and start organizing your life together. From creating your first space to inviting family members.',
    category: 'Getting Started',
    icon: FileText,
    color: 'emerald',
    readTime: '5 min read',
    featured: true,
  },
  {
    slug: 'master-family-calendar',
    title: 'Mastering the Family Calendar',
    description: 'Discover how to sync calendars, create shared events, and never miss an important family moment again.',
    category: 'Calendar',
    icon: Calendar,
    color: 'purple',
    readTime: '4 min read',
    featured: true,
  },
  {
    slug: 'task-management-tips',
    title: 'Task Management Tips for Busy Families',
    description: 'Practical strategies for dividing household chores fairly and keeping everyone accountable.',
    category: 'Tasks',
    icon: CheckSquare,
    color: 'blue',
    readTime: '6 min read',
    featured: false,
  },
  {
    slug: 'shopping-list-collaboration',
    title: 'Collaborative Shopping Lists That Actually Work',
    description: 'How to create, share, and manage shopping lists that update in real-time across all devices.',
    category: 'Shopping',
    icon: ShoppingCart,
    color: 'emerald',
    readTime: '3 min read',
    featured: false,
  },
  {
    slug: 'family-communication-hub',
    title: 'Creating a Family Communication Hub',
    description: 'Use Rowan messaging to keep everyone in the loop without the chaos of group chats.',
    category: 'Messages',
    icon: MessageSquare,
    color: 'green',
    readTime: '4 min read',
    featured: false,
  },
  {
    slug: 'setting-family-goals',
    title: 'Setting and Achieving Family Goals Together',
    description: 'Learn how to set meaningful goals as a family and track progress with visual milestones.',
    category: 'Goals',
    icon: Target,
    color: 'indigo',
    readTime: '5 min read',
    featured: true,
  },
  {
    slug: 'never-miss-reminder',
    title: 'Never Miss a Reminder Again',
    description: 'Set up smart reminders for appointments, medications, and important dates.',
    category: 'Reminders',
    icon: Bell,
    color: 'pink',
    readTime: '3 min read',
    featured: false,
  },
  {
    slug: 'meal-planning-made-easy',
    title: 'Meal Planning Made Easy',
    description: 'Plan your weekly meals, discover new recipes, and automatically generate shopping lists.',
    category: 'Meals',
    icon: Utensils,
    color: 'orange',
    readTime: '5 min read',
    featured: false,
  },
  {
    slug: 'family-budget-basics',
    title: 'Family Budget Basics with Rowan',
    description: 'Track expenses, set budgets, and achieve financial goals as a family unit.',
    category: 'Budget',
    icon: DollarSign,
    color: 'amber',
    readTime: '6 min read',
    featured: false,
  },
];

const categories = [
  { name: 'All', count: articles.length },
  { name: 'Getting Started', count: articles.filter(a => a.category === 'Getting Started').length },
  { name: 'Calendar', count: articles.filter(a => a.category === 'Calendar').length },
  { name: 'Tasks', count: articles.filter(a => a.category === 'Tasks').length },
  { name: 'Goals', count: articles.filter(a => a.category === 'Goals').length },
  { name: 'Shopping', count: articles.filter(a => a.category === 'Shopping').length },
  { name: 'Messages', count: articles.filter(a => a.category === 'Messages').length },
  { name: 'Meals', count: articles.filter(a => a.category === 'Meals').length },
  { name: 'Budget', count: articles.filter(a => a.category === 'Budget').length },
  { name: 'Reminders', count: articles.filter(a => a.category === 'Reminders').length },
];

const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', border: 'border-pink-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
};

export default function ArticlesPage() {
  const router = useRouter();
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const handleBetaSuccess = (inviteCode?: string, email?: string, firstName?: string, lastName?: string) => {
    if (inviteCode) {
      const params = new URLSearchParams();
      params.set('beta_code', inviteCode);
      if (email) params.set('email', email);
      if (firstName) params.set('first_name', firstName);
      if (lastName) params.set('last_name', lastName);
      router.push(`/signup?${params.toString()}`);
    } else {
      router.push('/signup');
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredArticles = articles.filter(a => a.featured);

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        onBetaClick={() => setIsBetaModalOpen(true)}
        onLaunchClick={() => setIsLaunchModalOpen(true)}
        isPublicFeaturePage={true}
      />

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_0%,rgba(16,185,129,0.1),transparent)] bg-[radial-gradient(45%_45%_at_50%_0%,rgba(16,185,129,0.05),transparent)]" />

          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-300 text-sm font-medium mb-6">
                <FileText className="w-4 h-4" />
                <span>Learn & Explore</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6">
                Articles & <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">Guides</span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
                Discover tips, tutorials, and best practices for getting the most out of Rowan
                for your family.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Search and Filter */}
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap justify-center gap-2">
              {categories.filter(c => c.count > 0).map((category) => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category.name
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {category.name}
                  {category.count > 0 && (
                    <span className={`ml-1.5 ${selectedCategory === category.name ? 'text-emerald-100' : 'text-gray-400'}`}>
                      ({category.count})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Articles */}
        {selectedCategory === 'All' && searchQuery === '' && (
          <section className="px-4 sm:px-6 lg:px-8 pb-12">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Featured</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredArticles.map((article, index) => {
                  const colors = colorClasses[article.color] || colorClasses.emerald;
                  return (
                    <motion.div
                      key={article.slug}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                    >
                      <Link href={`/articles/${article.slug}`}>
                        <div className={`group h-full p-6 rounded-2xl border ${colors.border} bg-gray-800 hover:shadow-lg transition-all cursor-pointer`}>
                          <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}>
                            <article.icon className={`w-6 h-6 ${colors.text}`} />
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs font-medium ${colors.text}`}>{article.category}</span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {article.readTime}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-400 line-clamp-2">
                            {article.description}
                          </p>
                          <div className="mt-4 flex items-center text-emerald-400 text-sm font-medium group-hover:gap-2 transition-all">
                            Read more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* All Articles */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-7xl mx-auto">
            {selectedCategory === 'All' && searchQuery === '' && (
              <h2 className="text-2xl font-bold text-white mb-6">All Articles</h2>
            )}

            {filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No articles found</h3>
                <p className="text-gray-400">
                  Try adjusting your search or filter to find what you're looking for.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article, index) => {
                  const colors = colorClasses[article.color] || colorClasses.emerald;
                  return (
                    <motion.div
                      key={article.slug}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.5 }}
                    >
                      <Link href={`/articles/${article.slug}`}>
                        <div className="group h-full p-6 rounded-2xl border border-gray-700 bg-gray-800 hover:shadow-lg hover:border-emerald-500/30 transition-all cursor-pointer">
                          <div className="flex items-start justify-between mb-4">
                            <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                              <article.icon className={`w-5 h-5 ${colors.text}`} />
                            </div>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {article.readTime}
                            </span>
                          </div>
                          <span className={`text-xs font-medium ${colors.text} mb-2 block`}>{article.category}</span>
                          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
                            {article.title}
                          </h3>
                          <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                            {article.description}
                          </p>
                          <div className="flex items-center text-emerald-400 text-sm font-medium">
                            Read article <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-emerald-500/10 via-teal-500/10 from-emerald-500/5 to-cyan-500/5">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to organize your family life?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Join thousands of families already using Rowan to stay connected and organized.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => setIsBetaModalOpen(true)}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsLaunchModalOpen(true)}
                className="px-8 py-3 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold transition-all shadow-md"
              >
                Notify Me on Launch
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <BetaAccessModal
        isOpen={isBetaModalOpen}
        onClose={() => setIsBetaModalOpen(false)}
        onSuccess={handleBetaSuccess}
        onSwitchToLaunch={() => {
          setIsBetaModalOpen(false);
          setIsLaunchModalOpen(true);
        }}
      />
      <LaunchNotificationModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
      />
    </div>
  );
}
