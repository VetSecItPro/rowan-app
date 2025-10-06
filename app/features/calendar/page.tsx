import { Calendar, Users, Bell, RefreshCw, Share2, Filter } from 'lucide-react';
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

          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Shared Calendar
          </h1>

          <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Keep everyone in sync with a beautiful, collaborative calendar built for families and couples.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-6">
              <RefreshCw className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Real-Time Sync</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Changes appear instantly for everyone. No more missed updates or scheduling conflicts.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
              <Share2 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Shared Events</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Create events that everyone can see, edit, and get reminders for automatically.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
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
              'Create and share events with your family instantly',
              'Set up recurring events that repeat automatically',
              'Color-code events by person or category',
              'Add notes, locations, and attachments to any event',
              'Receive smart reminders before important events',
              'View in day, week, month, or agenda format',
              'Subscribe to external calendars (work, school, etc.)',
              'Export and share your calendar with anyone',
            ].map((feature, index) => (
              <div key={index} className="flex items-start gap-4 bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
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
              Perfect for every occasion
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              From daily routines to special celebrations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Daily Scheduling</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Coordinate pickup and drop-off times</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Track kids' activities and practice schedules</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Plan date nights and family time</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Manage work schedules and meetings</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Special Events</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Plan birthdays and anniversaries together</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Organize holiday celebrations and gatherings</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Track important medical appointments</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Remember school events and deadlines</span>
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
            Never miss a moment
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join families staying organized and connected together
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
              className="px-8 py-4 bg-purple-700 text-white rounded-full font-bold text-lg hover:bg-purple-800 transition-all"
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
