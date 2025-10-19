import { CheckSquare, Check, Users, Calendar, Flag, BarChart3 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';

export default function TasksFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white dark:from-black dark:via-blue-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-tasks rounded-3xl mb-6 shadow-xl shadow-blue-500/30 animate-bounce-subtle">
            <CheckSquare className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Tasks & Chores
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Organize your daily life together. Manage tasks, household chores, and responsibilities as a team.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Collaborative</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Assign tasks to family members, share responsibilities, and work together seamlessly.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-6">
              <Flag className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Priority-Based</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Set priorities for every task. Focus on what matters most with color-coded urgency levels.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center mb-6">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Track Progress</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Visual dashboards show completion rates, overdue items, and team productivity at a glance.
            </p>
          </div>
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Powerful features designed for families and couples
            </p>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              'Create unlimited tasks and chores with detailed descriptions',
              'Set due dates and track deadlines',
              'Assign tasks to specific space members',
              'Track completion status in real-time with live updates',
              'Filter by status (pending, in progress, completed, cancelled)',
              'Search through your tasks and chores instantly',
              'View statistics showing total, completed, in progress, and pending',
              'Set priority levels (low, medium, high) for better organization',
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
              Perfect for every situation
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              From daily chores to family responsibilities
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Daily Life</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Manage household chores and responsibilities</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Track kids' homework and activities</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Coordinate errands and grocery shopping</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <span>Remember important appointments</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Family Responsibilities</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Organize family events and celebrations</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Plan and coordinate family trips</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Manage kids' school and activity schedules</span>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Coordinate pet care and vet appointments</span>
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
            Ready to get organized?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join thousands of families managing their tasks together
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
