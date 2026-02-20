import Link from 'next/link';
import {
  ArrowLeft,
  Scale,
  Users,
  TrendingUp,
  BarChart3,
  Calendar,
  Trophy,
  Heart,
  HelpCircle,
} from 'lucide-react';

export default function HouseholdBalanceDocPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 via-cyan-600 to-teal-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 pb-12">
          <Link
            href="/settings?tab=documentation"
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Documentation
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Household Balance
              </h1>
              <p className="text-white/70 mt-1">
                See who does what — fairly and transparently
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-10">
        {/* Overview */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-teal-400" />
            What is Household Balance?
          </h2>
          <p className="text-sm text-gray-300 leading-relaxed mb-4">
            Household Balance gives your family a clear, visual breakdown of who&apos;s completing tasks and chores.
            Instead of guessing or arguing about who does more, everyone can see the real numbers — encouraging
            teamwork without pointing fingers.
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Find it on your <strong className="text-white">Dashboard</strong> in the right panel,
            next to your Daily Check-In.
          </p>
        </div>

        {/* How It Works */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">How It Works</h2>
          </div>

          <div className="space-y-3">
            <div className="px-5 py-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
              <h3 className="text-sm font-medium text-white mb-1">Automatic Tracking</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Every time a family member completes a task or chore, it counts toward their contribution.
                No manual logging needed — it just works.
              </p>
            </div>

            <div className="px-5 py-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
              <h3 className="text-sm font-medium text-white mb-1">Donut Chart Visualization</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                The donut chart shows each member&apos;s share of completed items at a glance.
                Each person gets their own color-coded segment with a total count in the center.
              </p>
            </div>

            <div className="px-5 py-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
              <h3 className="text-sm font-medium text-white mb-1">Per-Member Bars</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Below the chart, individual progress bars show each member&apos;s task count,
                chore count, and percentage share. Members are sorted by contribution (most active first).
              </p>
            </div>

            <div className="px-5 py-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
              <h3 className="text-sm font-medium text-white mb-1">Balance Score</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                A fairness score from 0–100 shows how evenly work is distributed across your household.
                The score considers how close each member&apos;s share is to the ideal equal split.
              </p>
            </div>
          </div>
        </div>

        {/* Balance Score Explained */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Understanding the Balance Score</h2>
          </div>

          <div className="space-y-3">
            <div className="px-5 py-4 rounded-xl bg-teal-900/20 border border-teal-700/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-teal-400" />
                <h3 className="text-sm font-medium text-teal-300">75–100: Nicely Balanced</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed ml-6">
                Work is shared fairly across the household. Great teamwork!
              </p>
            </div>

            <div className="px-5 py-4 rounded-xl bg-amber-900/20 border border-amber-700/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <h3 className="text-sm font-medium text-amber-300">45–74: Slightly Uneven</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed ml-6">
                Some members are doing more than others. A good conversation starter.
              </p>
            </div>

            <div className="px-5 py-4 rounded-xl bg-orange-900/20 border border-orange-700/30">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 rounded-full bg-orange-400" />
                <h3 className="text-sm font-medium text-orange-300">0–44: Getting Uneven</h3>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed ml-6">
                The workload is noticeably lopsided. Consider redistributing tasks and chores.
              </p>
            </div>
          </div>
        </div>

        {/* Timeframes */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">Weekly & Monthly Views</h2>
          </div>

          <div className="space-y-3">
            <div className="px-5 py-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
              <h3 className="text-sm font-medium text-white mb-1">This Week</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Shows completions from Monday through today. Resets each Monday.
                Best for staying on top of weekly chore rotations.
              </p>
            </div>

            <div className="px-5 py-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
              <h3 className="text-sm font-medium text-white mb-1">This Month</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Shows completions from the 1st of the month through today.
                Better for seeing the big picture and long-term balance trends.
              </p>
            </div>
          </div>
        </div>

        {/* What Counts */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-semibold text-white">What Gets Tracked</h2>
          </div>

          <div className="space-y-3">
            <div className="px-5 py-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
              <h3 className="text-sm font-medium text-white mb-1">Completed Tasks</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Any task marked as completed and assigned to a household member counts as 1 completion.
              </p>
            </div>

            <div className="px-5 py-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
              <h3 className="text-sm font-medium text-white mb-1">Completed Chores</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Chores also count as 1 completion each. Additionally, chores have a <strong className="text-white">point value</strong> based
                on difficulty — the &quot;Points Earned&quot; metric reflects the weighted effort behind each chore.
              </p>
            </div>

            <div className="px-5 py-4 rounded-xl bg-gray-800/50 border border-gray-700/30">
              <h3 className="text-sm font-medium text-white mb-1">Fair by Design</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                The balance score measures how evenly work is distributed — not who does the most.
                It&apos;s designed to encourage conversation, not competition. The tone is always supportive: &quot;Nicely Balanced,&quot;
                &quot;Slightly Uneven,&quot; or &quot;Getting Uneven&quot; — never accusatory.
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-400" />
            Tips for a Balanced Household
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40">
              <Users className="w-4 h-4 text-teal-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Assign Chores Evenly</p>
                <p className="text-xs text-gray-400 mt-0.5">Rotate recurring chores so no one person always gets the hard ones</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40">
              <Calendar className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Check Weekly</p>
                <p className="text-xs text-gray-400 mt-0.5">Review the balance widget each weekend to spot trends early</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40">
              <Trophy className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Celebrate Balance</p>
                <p className="text-xs text-gray-400 mt-0.5">When the score is green, acknowledge the teamwork!</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-900/40">
              <Heart className="w-4 h-4 text-pink-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-white">Use It as a Conversation Starter</p>
                <p className="text-xs text-gray-400 mt-0.5">The goal is transparency, not blame. Talk about what&apos;s working</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
