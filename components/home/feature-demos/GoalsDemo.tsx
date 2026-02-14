'use client';

import { motion } from 'framer-motion';
import {
  Target,
  Check,
  Clock,
  TrendingUp,
  Plane,
  BookOpen,
  Dumbbell,
} from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

/* Goal status colors matching real GoalCard.tsx */
const STATUS = {
  completed: { bg: 'bg-green-900/30', text: 'text-green-300', checkbox: 'bg-green-500 border-green-500' },
  active: { bg: 'bg-blue-900/30', text: 'text-blue-300', checkbox: 'bg-amber-500 border-amber-500' },
  'not-started': { bg: 'bg-gray-900/30', text: 'text-gray-300', checkbox: 'border-gray-600 bg-transparent' },
};

/* Progress bar colors matching real GoalCard.tsx */
function getProgressColor(pct: number) {
  if (pct === 0) return 'from-gray-300 to-gray-400';
  if (pct <= 25) return 'from-blue-300 to-blue-400';
  if (pct <= 50) return 'from-blue-400 to-blue-500';
  if (pct <= 75) return 'from-blue-500 to-green-400';
  if (pct < 100) return 'from-green-400 to-green-500';
  return 'from-green-500 to-green-600';
}

/* ── Step 1: Goal list (real GoalCard.tsx card pattern) ───────────── */
function GoalListStep() {
  const goals = [
    { name: 'Family Vacation Fund', icon: Plane, progress: 35, status: 'active' as const, assignee: 'Family' },
    { name: 'Read 20 Books', icon: BookOpen, progress: 60, status: 'active' as const, assignee: 'Mom' },
    { name: 'Run a 5K', icon: Dumbbell, progress: 100, status: 'completed' as const, assignee: 'Dad' },
  ];

  return (
    <div className="space-y-2.5">
      {goals.map((goal, i) => {
        const st = goal.status === 'completed' ? STATUS.completed : STATUS.active;
        return (
          <motion.div
            key={goal.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.12, duration: 0.3 }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-3.5"
          >
            <div className="flex items-center gap-2.5 mb-2.5">
              {/* 3-state checkbox (real GoalCard pattern) */}
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${st.checkbox}`}>
                {goal.status === 'completed' && <Check className="w-3 h-3 text-white" />}
                {goal.status === 'active' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${goal.status === 'completed' ? 'text-white line-through opacity-60' : 'text-white'}`}>
                  {goal.name}
                </p>
              </div>
              <goal.icon className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            </div>

            {/* Progress bar (real h-3 pattern) */}
            <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${goal.progress}%` }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.3 + i * 0.12 }}
                className={`h-full bg-gradient-to-r ${getProgressColor(goal.progress)} rounded-full`}
              />
            </div>

            <div className="flex items-center justify-between">
              {/* Status badge */}
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${st.bg} ${st.text}`}>
                {goal.status === 'completed' ? 'Completed' : `${goal.progress}%`}
              </span>
              {/* Assignee pill (real pattern: bg-indigo-900/30) */}
              <span className="flex items-center gap-1 px-2 py-0.5 bg-indigo-900/30 rounded-full">
                <span className="text-[10px] text-indigo-300">{goal.assignee}</span>
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Step 2: Track progress (detail view) ─────────────────────────── */
function TrackProgressStep() {
  return (
    <div className="space-y-3">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Plane className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Family Vacation Fund</h4>
            <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-blue-900/30 text-blue-300">Active</span>
          </div>
        </div>

        {/* Big amount display */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[10px] text-gray-400 mb-0.5">Saved so far</p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="text-2xl font-bold text-white"
            >
              $1,750
            </motion.p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-400">Goal</p>
            <p className="text-sm font-medium text-gray-400">$5,000</p>
          </div>
        </div>

        {/* Progress bar (real h-3 with gradient) */}
        <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '35%' }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.4 }}
            className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full shadow-sm"
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-xs font-medium text-indigo-400"
          >
            35%
          </motion.span>
          <span className="text-[10px] text-gray-400">$3,250 to go</span>
        </div>
      </div>

      {/* Encouragement */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.3 }}
        className="flex items-center gap-2.5 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
      >
        <TrendingUp className="w-4 h-4 text-indigo-400 flex-shrink-0" />
        <div>
          <p className="text-xs font-medium text-indigo-300">Ahead of schedule</p>
          <p className="text-[10px] text-gray-400">+2 weeks ahead of target</p>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Step 3: Add contribution ─────────────────────────────────────── */
function AddContributionStep() {
  return (
    <div className="space-y-3">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <Plane className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-semibold text-white">Family Vacation Fund</h4>
        </div>

        {/* New contribution highlight */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4, type: 'spring', stiffness: 300 }}
          className="p-3 rounded-lg bg-green-900/10 border border-green-500/30 mb-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">New contribution</span>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-lg font-bold text-green-400"
            >
              +$200
            </motion.span>
          </div>
        </motion.div>

        {/* Updated progress */}
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-[10px] text-gray-400">Updated total</p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-xl font-bold text-white"
            >
              $1,950
            </motion.p>
          </div>
          <span className="text-xs text-gray-400">of $5,000</span>
        </div>

        <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: '35%' }}
            animate={{ width: '39%' }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.8 }}
            className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs font-medium text-indigo-400">39%</span>
          <span className="text-[10px] text-gray-400">$3,050 to go</span>
        </div>
      </div>

      {/* Recent contributions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="space-y-1.5"
      >
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Recent</p>
        {[
          { amount: '+$200', date: 'Today', by: 'Dad' },
          { amount: '+$150', date: 'Feb 2', by: 'Mom' },
        ].map((c, i) => (
          <div key={i} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-800/40">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-[10px] text-gray-400">{c.date}</span>
              <span className="text-[10px] text-indigo-300 px-1.5 py-0.5 bg-indigo-900/30 rounded-full">{c.by}</span>
            </div>
            <span className="text-xs font-medium text-green-400">{c.amount}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Step 4: Milestone reached ────────────────────────────────────── */
function MilestoneStep() {
  return (
    <div className="space-y-3">
      {/* Milestone card (inspired by GoalCard completed state) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4, type: 'spring', stiffness: 300 }}
        className="bg-gray-900 border border-indigo-500/30 rounded-xl p-4 text-center"
      >
        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Target className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-lg font-bold text-white mb-1"
        >
          25% Milestone!
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-gray-400"
        >
          Family Vacation Fund
        </motion.p>
      </motion.div>

      {/* Progress with milestone markers */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3.5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-300">$1,750 of $5,000</span>
          <span className="text-xs font-medium text-indigo-400">35%</span>
        </div>
        <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: '25%' }}
            animate={{ width: '35%' }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
          />
          <div className="absolute top-0 left-1/4 w-0.5 h-full bg-white/30" />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-600">0%</span>
          <span className="text-[10px] text-indigo-400/60">25%</span>
          <span className="text-[10px] text-gray-600">50%</span>
          <span className="text-[10px] text-gray-600">75%</span>
          <span className="text-[10px] text-gray-600">100%</span>
        </div>
      </div>

      {/* Next milestone */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
        className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-800/40 border border-gray-700/30"
      >
        <Target className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        <span className="text-[10px] text-gray-400">Next milestone: 50% ($2,500)</span>
      </motion.div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Your goals', content: <GoalListStep /> },
  { label: 'Track progress', content: <TrackProgressStep /> },
  { label: 'Add contribution', content: <AddContributionStep /> },
  { label: 'Hit milestones', content: <MilestoneStep /> },
];

/** Renders an animated goals feature demonstration for the landing page. */
export function GoalsDemo({ className = '' }: { className?: string }) {
  return (
    <AnimatedFeatureDemo
      featureName="Goals"
      colorScheme={{
        primary: 'indigo-500',
        secondary: 'blue-500',
        gradient: 'from-indigo-500 to-blue-500',
      }}
      steps={steps}
      className={className}
    />
  );
}
