import { Target, TrendingUp, Award, Users, Check } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import Link from 'next/link';

export default function GoalsFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-indigo-50/30 to-white dark:from-black dark:via-indigo-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-goals rounded-3xl mb-6 shadow-xl shadow-indigo-500/30 animate-bounce-subtle">
            <Target className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-6xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            Goals & Milestones
          </h1>

          <p className="text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Set family goals, track progress, and celebrate achievements together. Build the future you want.
          </p>
        </div>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center mb-6">
              <Target className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Goal Setting</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Create individual and family goals with clear targets, deadlines, and measurable outcomes.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mb-6">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Progress Tracking</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Visual progress bars and charts show how far you&apos;ve come and what&apos;s left to achieve.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
            <div className="w-14 h-14 bg-pink-500 rounded-2xl flex items-center justify-center mb-6">
              <Award className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Celebrate Wins</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Mark milestones, celebrate achievements, and keep everyone motivated on the journey.
            </p>
          </div>
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Everything you need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Powerful goal tracking for personal and family success
            </p>
          </div>

          <div className="space-y-6 max-w-3xl mx-auto">
            {[
              'Create goals with custom titles and detailed descriptions',
              'Organize goals by category (fitness, financial, education, etc.)',
              'Track progress with visual progress bars',
              'Set goal status (active, paused, completed)',
              'Break down goals into trackable milestones',
              'Track different milestone types (money, count, percentage, custom)',
              'View statistics for active, in progress, and completed goals',
              'Search across all goals and milestones',
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
              Perfect for every dream
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              From personal growth to family milestones
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Personal Goals</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-indigo-500 mt-1 flex-shrink-0" />
                  <span>Fitness and health objectives</span>
                </li>
                <li className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-indigo-500 mt-1 flex-shrink-0" />
                  <span>Learning new skills or hobbies</span>
                </li>
                <li className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-indigo-500 mt-1 flex-shrink-0" />
                  <span>Career and professional development</span>
                </li>
                <li className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-indigo-500 mt-1 flex-shrink-0" />
                  <span>Reading, writing, or creative projects</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Family Goals</h3>
              <ul className="space-y-3 text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Save for a dream vacation together</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Plan and achieve home renovation projects</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Build emergency fund or college savings</span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-purple-500 mt-1 flex-shrink-0" />
                  <span>Establish family traditions and habits</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl font-bold text-white mb-6">
            Achieve your dreams together
          </h2>
          <p className="text-xl text-indigo-100 mb-10">
            Join families building better futures every day
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
              className="px-8 py-4 bg-indigo-700 text-white rounded-full font-bold text-lg hover:bg-indigo-800 transition-all"
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
