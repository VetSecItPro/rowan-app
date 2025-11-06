import { Bell, Clock, Repeat, MapPin, Users, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';

export default function RemindersFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-pink-50/30 to-white dark:from-black dark:via-pink-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-reminders rounded-3xl mb-6 shadow-xl shadow-pink-500/30 animate-bounce-subtle">
            <Bell className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Reminders
          </h1>

          <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Create and manage reminders for your space. Set time-based or recurring reminders that notify you when things need attention.
          </p>
        </div>


        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-pink-500 rounded-2xl flex items-center justify-center mb-6">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Time-Based</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Set reminders for specific times or relative to events. Get notified exactly when you need to be.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-6">
              <MapPin className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Location-Based</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Get reminded when you arrive at or leave specific locations like the grocery store or home.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
              <Repeat className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Recurring</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Set up reminders that repeat daily, weekly, monthly, or on custom schedules automatically.
            </p>
          </div>
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Intelligent reminder features that work for you
            </p>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              'Create reminders with custom titles and descriptions',
              'Set specific reminder times and dates',
              'Add emoji icons to make reminders more visual',
              'Organize by category (work, personal, health, bills, events)',
              'Set priority levels (urgent, high, medium, low)',
              'Set up recurring reminders (daily, weekly, monthly, custom)',
              'Snooze reminders for later',
              'Track overdue, active, and completed reminders',
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
              How you might use reminders
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Common types of reminders people create
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Personal & Health</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-pink-500 mt-1 flex-shrink-0" />
                  <span>Daily medication and vitamin reminders</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-pink-500 mt-1 flex-shrink-0" />
                  <span>Medical and dental appointments</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-pink-500 mt-1 flex-shrink-0" />
                  <span>Exercise and workout schedules</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-pink-500 mt-1 flex-shrink-0" />
                  <span>Birthdays and anniversaries</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Household & Bills</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Monthly bill payments and due dates</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Home maintenance tasks</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Seasonal cleaning and organization</span>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Car maintenance and renewals</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="bg-gradient-to-r from-pink-600 to-purple-600 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Interested in trying Rowan?
          </h2>
          <p className="text-xl text-pink-100 mb-8">
            We're currently developing Rowan's reminder features
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/"
              className="px-8 py-4 bg-white text-purple-600 rounded-full font-semibold hover:bg-pink-50 transition-all shadow-xl text-lg"
            >
              Request Beta Access
            </Link>
            <Link
              href="/"
              className="px-8 py-4 bg-pink-700/50 border border-pink-400 text-white rounded-full font-semibold hover:bg-pink-600/50 transition-all text-lg"
            >
              Get Notified When Ready
            </Link>
          </div>
          <p className="text-pink-200 text-sm mt-6">
            Currently in development
          </p>
        </div>
      </section>

      {/* Footer Spacer */}
      <div className="h-20"></div>
    </div>
  );
}
