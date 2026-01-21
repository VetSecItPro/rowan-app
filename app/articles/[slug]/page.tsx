'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Calendar,
  CheckSquare,
  ShoppingCart,
  MessageSquare,
  Target,
  Bell,
  Utensils,
  DollarSign,
  Clock,
  Share2,
  BookOpen
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BetaAccessModal } from '@/components/beta/BetaAccessModal';
import { LaunchNotificationModal } from '@/components/beta/LaunchNotificationModal';

// Article metadata - same as main page, can be moved to shared file later
const articlesData: Record<string, {
  title: string;
  description: string;
  category: string;
  icon: typeof FileText;
  color: string;
  readTime: string;
}> = {
  'getting-started-with-rowan': {
    title: 'Getting Started with Rowan: Your Complete Guide',
    description: 'Learn how to set up Rowan for your family and start organizing your life together. From creating your first space to inviting family members.',
    category: 'Getting Started',
    icon: FileText,
    color: 'emerald',
    readTime: '5 min read',
  },
  'master-family-calendar': {
    title: 'Mastering the Family Calendar',
    description: 'Discover how to sync calendars, create shared events, and never miss an important family moment again.',
    category: 'Calendar',
    icon: Calendar,
    color: 'purple',
    readTime: '4 min read',
  },
  'task-management-tips': {
    title: 'Task Management Tips for Busy Families',
    description: 'Practical strategies for dividing household chores fairly and keeping everyone accountable.',
    category: 'Tasks',
    icon: CheckSquare,
    color: 'blue',
    readTime: '6 min read',
  },
  'shopping-list-collaboration': {
    title: 'Collaborative Shopping Lists That Actually Work',
    description: 'How to create, share, and manage shopping lists that update in real-time across all devices.',
    category: 'Shopping',
    icon: ShoppingCart,
    color: 'emerald',
    readTime: '3 min read',
  },
  'family-communication-hub': {
    title: 'Creating a Family Communication Hub',
    description: 'Use Rowan messaging to keep everyone in the loop without the chaos of group chats.',
    category: 'Messages',
    icon: MessageSquare,
    color: 'green',
    readTime: '4 min read',
  },
  'setting-family-goals': {
    title: 'Setting and Achieving Family Goals Together',
    description: 'Learn how to set meaningful goals as a family and track progress with visual milestones.',
    category: 'Goals',
    icon: Target,
    color: 'indigo',
    readTime: '5 min read',
  },
  'never-miss-reminder': {
    title: 'Never Miss a Reminder Again',
    description: 'Set up smart reminders for appointments, medications, and important dates.',
    category: 'Reminders',
    icon: Bell,
    color: 'pink',
    readTime: '3 min read',
  },
  'meal-planning-made-easy': {
    title: 'Meal Planning Made Easy',
    description: 'Plan your weekly meals, discover new recipes, and automatically generate shopping lists.',
    category: 'Meals',
    icon: Utensils,
    color: 'orange',
    readTime: '5 min read',
  },
  'family-budget-basics': {
    title: 'Family Budget Basics with Rowan',
    description: 'Track expenses, set budgets, and achieve financial goals as a family unit.',
    category: 'Budget',
    icon: DollarSign,
    color: 'amber',
    readTime: '6 min read',
  },
};

const colorClasses: Record<string, { bg: string; text: string; gradient: string }> = {
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', gradient: 'from-emerald-500 to-teal-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', gradient: 'from-purple-500 to-indigo-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', gradient: 'from-blue-500 to-cyan-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-400', gradient: 'from-green-500 to-emerald-500' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', gradient: 'from-indigo-500 to-purple-500' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400', gradient: 'from-pink-500 to-rose-500' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', gradient: 'from-orange-500 to-amber-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', gradient: 'from-amber-500 to-yellow-500' },
};

export default function ArticlePage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

  const article = articlesData[slug];

  const handleBetaSuccess = (inviteCode?: string, email?: string, firstName?: string, lastName?: string) => {
    if (inviteCode) {
      const urlParams = new URLSearchParams();
      urlParams.set('beta_code', inviteCode);
      if (email) urlParams.set('email', email);
      if (firstName) urlParams.set('first_name', firstName);
      if (lastName) urlParams.set('last_name', lastName);
      router.push(`/signup?${urlParams.toString()}`);
    } else {
      router.push('/signup');
    }
  };

  // 404 for unknown articles
  if (!article) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header
          onBetaClick={() => setIsBetaModalOpen(true)}
          onLaunchClick={() => setIsLaunchModalOpen(true)}
          isPublicFeaturePage={true}
        />
        <main className="pt-32 pb-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Article Not Found</h1>
            <p className="text-gray-400 mb-8">
              The article you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-full font-medium hover:bg-emerald-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Articles
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const colors = colorClasses[article.color] || colorClasses.emerald;
  const Icon = article.icon;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        onBetaClick={() => setIsBetaModalOpen(true)}
        onLaunchClick={() => setIsLaunchModalOpen(true)}
        isPublicFeaturePage={true}
      />

      <main>
        {/* Article Header */}
        <section className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className={`absolute inset-0 -z-10 bg-gradient-to-b ${colors.gradient} opacity-5`} />

          <div className="max-w-4xl mx-auto">
            {/* Breadcrumb */}
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Articles
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <span className={`text-sm font-medium ${colors.text}`}>{article.category}</span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {article.readTime}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold text-white mb-6">
                {article.title}
              </h1>

              <p className="text-xl text-gray-400 leading-relaxed">
                {article.description}
              </p>

              {/* Share Button */}
              <div className="mt-8 flex items-center gap-4">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: article.title,
                        text: article.description,
                        url: window.location.href,
                      });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Coming Soon Content */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="bg-gray-800 rounded-3xl border border-gray-700 p-8 sm:p-12 text-center"
            >
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${colors.gradient} mx-auto mb-6 flex items-center justify-center`}>
                <BookOpen className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-2xl font-bold text-white mb-4">
                Full Article Coming Soon
              </h2>

              <p className="text-gray-400 mb-8 max-w-md mx-auto">
                We&apos;re working on creating comprehensive guides and tutorials to help you get the most out of Rowan.
                Check back soon for the full article!
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => setIsBetaModalOpen(true)}
                  className={`px-6 py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2`}
                >
                  Try Rowan Now
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsLaunchModalOpen(true)}
                  className="px-6 py-3 bg-gray-700 text-white rounded-full font-semibold hover:bg-gray-600 transition-colors"
                >
                  Get Notified
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Related Articles */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6">More Articles</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries(articlesData)
                .filter(([key]) => key !== slug)
                .slice(0, 4)
                .map(([key, art]) => {
                  const artColors = colorClasses[art.color] || colorClasses.emerald;
                  const ArtIcon = art.icon;
                  return (
                    <Link key={key} href={`/articles/${key}`}>
                      <div className="group p-4 rounded-xl border border-gray-700 bg-gray-800 hover:shadow-md hover:border-emerald-500/30 transition-all">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${artColors.bg} flex items-center justify-center flex-shrink-0`}>
                            <ArtIcon className={`w-4 h-4 ${artColors.text}`} />
                          </div>
                          <div>
                            <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                              {art.title}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                              {art.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
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
