import { Calendar, Bell, RefreshCw, Share2, Filter } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';

export default function CalendarFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-purple-50/30 to-white dark:from-black dark:via-purple-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-calendar rounded-3xl mb-6 shadow-xl shadow-purple-500/30 animate-bounce-subtle">
            <Calendar className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Family Calendar
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Share events and schedules with your space members. Create calendar events that everyone can see, with real-time updates and automatic reminders.
          </p>
        </div>


        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-6">
              <RefreshCw className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Real-Time Sync</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Changes appear instantly for everyone. No more missed updates or scheduling conflicts.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
              <Share2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Shared Events</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Create events that everyone can see, edit, and get reminders for automatically.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-pink-500 rounded-2xl flex items-center justify-center mb-6">
              <Filter className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Smart Filtering</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              View by person, category, or custom filters. See only what matters to you right now.
            </p>
          </div>
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Powerful calendar features designed for busy families
            </p>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              'Create and share events with your space members instantly',
              'Add detailed descriptions and locations to events',
              'Color-code events by category (work, personal, family, health, social)',
              'View in calendar grid or list format',
              'Switch between months with easy navigation',
              'See today, this week, and this month statistics at a glance',
              'Search through all your events quickly',
              'Track event status (not-started, in-progress, completed)',
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-4 bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center mt-1">
                  <Calendar className="w-4 h-4 text-white" />
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
              How you might use calendar
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Common ways to organize family schedules
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Family Activities</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>School events and parent conferences</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Sports practices and games</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Music lessons and recitals</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Family gatherings and celebrations</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Personal & Work</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Medical and dental appointments</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Work meetings and travel</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Date nights and social plans</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Vacation planning and travel</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-600 to-blue-600 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Interested in trying Rowan?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            We're currently developing Rowan's calendar features
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="px-8 py-4 bg-white text-purple-600 rounded-full font-semibold hover:bg-blue-50 transition-all shadow-xl text-lg"
            >
              Request Beta Access
            </Link>
            <Link
              href="/"
              className="px-8 py-4 bg-purple-700/50 border border-purple-400 text-white rounded-full font-semibold hover:bg-purple-600/50 transition-all text-lg"
            >
              Get Notified When Ready
            </Link>
          </div>
          <p className="text-blue-200 text-sm mt-6">
            Currently in development
          </p>
        </div>
      </section>

      {/* Footer Spacer */}
      <div className="h-20"></div>
    </div>
  );
}
