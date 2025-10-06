import { MessageCircle, Send, Image as ImageIcon, File, Video, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';

export default function MessagesFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-green-50/30 to-white dark:from-black dark:via-green-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-messages rounded-3xl mb-6 shadow-xl shadow-green-500/30 animate-bounce-subtle">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Built-in Messaging
          </h1>

          <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Communicate seamlessly with your family. Everything you need in one place, no switching apps.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-6">
              <Send className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Instant Delivery</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Messages arrive instantly with read receipts. Know exactly when your family sees your messages.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
              <ImageIcon className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Rich Media</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Share photos, videos, documents, and files. Keep all your family media in one organized place.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-6">
              <MessageCircle className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Threaded Conversations</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Reply to specific messages, create threads, and keep conversations organized and easy to follow.
            </p>
          </div>
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Powerful messaging designed for family communication
            </p>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              'Send text messages, emojis, and GIFs instantly',
              'Share photos and videos with your family',
              'Attach documents, PDFs, and important files',
              'Create group conversations for different topics',
              'Reply to specific messages to keep context',
              'Search through message history effortlessly',
              'Get notifications on all your devices',
              'Pin important messages for quick access',
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
              Perfect for every conversation
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              From quick updates to important discussions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Quick Coordination</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>"Running 10 minutes late for pickup"</span>
                </li>
                <li className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>"Can you grab milk on your way home?"</span>
                </li>
                <li className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>"Kids need to be at practice at 4pm"</span>
                </li>
                <li className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>"Dinner is ready, come eat!"</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Sharing Moments</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Video className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Share photos from family outings instantly</span>
                </li>
                <li className="flex items-start gap-3">
                  <Video className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Send videos of kids' achievements and milestones</span>
                </li>
                <li className="flex items-start gap-3">
                  <File className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Forward important documents and forms</span>
                </li>
                <li className="flex items-start gap-3">
                  <ImageIcon className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Create shared albums for special occasions</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-green-600 to-emerald-600 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Stay connected effortlessly
          </h2>
          <p className="text-xl text-green-100 mb-10">
            Join families communicating better every day
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/#create-account"
              className="px-8 py-4 shimmer-bg text-white rounded-full font-semibold hover:opacity-90 transition-all shadow-xl shadow-purple-500/50"
            >
              Create Your Account
            </Link>
            <Link
              href="/"
              className="px-8 py-4 bg-green-700 text-white rounded-full font-bold text-lg hover:bg-green-800 transition-all"
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
