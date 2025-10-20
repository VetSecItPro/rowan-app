'use client';

import { Header } from '@/components/layout/Header';
import { Mail, Clock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function DigestSettingsPage() {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <Link
            href="/settings"
            className="btn-touch inline-flex items-center gap-2 py-2 px-3 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 mb-4 rounded-md active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Settings
          </Link>

          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Daily Digest
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Get a personalized AI-powered summary of your day delivered each morning
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Digest Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Your Daily Digest is Active
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  You'll receive a personalized AI-powered summary of your day delivered to your email every morning.
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-200">Delivery Schedule</span>
                </div>
                <p className="text-xs text-purple-800 dark:text-purple-300">
                  Your digest arrives every day at <strong>7:00 AM Eastern Time</strong> (12:00 PM UTC) with fresh, relevant content for your day.
                </p>
              </div>
            </div>
          </div>

          {/* What's Included */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              What's Included in Your Daily Digest
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Tasks due today
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Upcoming events
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Shopping lists
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                Meal planning
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                Overdue items
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                Priority reminders
              </div>
            </div>
          </div>

          {/* How it Works */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              How it works
            </h4>
            <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
              <li>• Your digest is generated fresh each morning using AI</li>
              <li>• Only includes items that are relevant for your day</li>
              <li>• Automatically prioritizes urgent and overdue items</li>
              <li>• Clean, mobile-friendly format for easy reading</li>
              <li>• Delivered consistently at 7:00 AM Eastern every day</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-200 mb-2">
              Need help or have feedback?
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              If you're not receiving your digest or want to provide feedback, please reach out to our support team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}