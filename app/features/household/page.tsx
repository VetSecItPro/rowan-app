import { Home, Wrench, DollarSign, Users, Calendar, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';

export default function HouseholdFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-amber-50/30 to-white dark:from-black dark:via-amber-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-household rounded-3xl mb-6 shadow-xl shadow-amber-500/30 animate-bounce-subtle">
            <Home className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Household Management
          </h1>

          <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Manage household tasks, track expenses, and maintain your home together as a team.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mb-6">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Maintenance Tracking</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Track home maintenance tasks, repairs, and service schedules. Never miss important upkeep.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-6">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Expense Tracking</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Monitor household expenses, split bills, and track spending by category for better budgeting.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Shared Responsibilities</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Assign chores and responsibilities fairly. Everyone knows what they need to do.
            </p>
          </div>
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Complete household management in one place
            </p>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              'Track recurring chores and cleaning schedules',
              'Log home repairs and maintenance history',
              'Store appliance manuals and warranty information',
              'Monitor household expenses and bills',
              'Set reminders for filter changes, inspections, etc.',
              'Assign and rotate chores among family members',
              'Track service provider contacts and schedules',
              'Manage home inventory and supplies',
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
              Perfect for every home
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              From daily upkeep to major projects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Regular Maintenance</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-amber-500 mt-1 flex-shrink-0" />
                  <span>Track HVAC filter changes and servicing</span>
                </li>
                <li className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-amber-500 mt-1 flex-shrink-0" />
                  <span>Schedule lawn care and yard work</span>
                </li>
                <li className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-amber-500 mt-1 flex-shrink-0" />
                  <span>Rotate cleaning responsibilities weekly</span>
                </li>
                <li className="flex items-start gap-3">
                  <Home className="w-5 h-5 text-amber-500 mt-1 flex-shrink-0" />
                  <span>Remember seasonal home tasks</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Financial Tracking</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>Track monthly utility bills and payments</span>
                </li>
                <li className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>Split household expenses fairly</span>
                </li>
                <li className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>Budget for home improvements</span>
                </li>
                <li className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <span>Log repair costs and service expenses</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-amber-600 to-yellow-600 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Run your home like a pro
          </h2>
          <p className="text-xl text-amber-100 mb-10">
            Join families managing their homes effortlessly
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
              className="px-8 py-4 bg-amber-700 text-white rounded-full font-bold text-lg hover:bg-amber-800 transition-all"
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
