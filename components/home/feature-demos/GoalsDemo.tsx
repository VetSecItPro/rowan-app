'use client';

import { motion } from 'framer-motion';
import {
  Target,
  Plane,
  Calendar,
  TrendingUp,
  Flame,
  Star,
  Sparkles,
  Plus,
} from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

// --- Step 1: Set a Goal ---
function SetGoal() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Target className="w-4 h-4 text-indigo-400" />
        <h4 className="text-sm font-semibold text-white">New Goal</h4>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <Plane className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Family Vacation Fund</h4>
            <p className="text-[10px] text-gray-500">Savings goal</p>
          </div>
        </div>

        <div className="space-y-2.5">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/60 border border-gray-700/50"
          >
            <span className="text-xs text-gray-400">Target amount</span>
            <span className="text-sm font-bold text-indigo-400">$5,000</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.65 }}
            className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/60 border border-gray-700/50"
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3 h-3 text-gray-500" />
              <span className="text-xs text-gray-400">Target date</span>
            </div>
            <span className="text-xs font-medium text-gray-300">Aug 15, 2026</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/60 border border-gray-700/50"
          >
            <span className="text-xs text-gray-400">Weekly target</span>
            <span className="text-xs font-medium text-gray-300">~$180/week</span>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.0 }}
        className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30"
      >
        <Plus className="w-3.5 h-3.5 text-indigo-400" />
        <span className="text-xs font-medium text-indigo-300">Goal created</span>
      </motion.div>
    </div>
  );
}

// --- Step 2: Track Progress ---
function TrackProgress() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-indigo-400" />
        <h4 className="text-sm font-semibold text-white">Family Vacation Fund</h4>
      </div>

      <div className="p-4 rounded-xl bg-gray-800/60 border border-gray-700/50 space-y-3">
        {/* Amount display */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] text-gray-500 mb-0.5">Saved so far</p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white"
            >
              $1,750
            </motion.p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 mb-0.5">Goal</p>
            <p className="text-sm font-medium text-gray-400">$5,000</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="h-3 bg-gray-700/60 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '35%' }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.4 }}
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
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
            <span className="text-[10px] text-gray-500">$3,250 to go</span>
          </div>
        </div>
      </div>

      {/* Encouragement message */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.4 }}
        className="flex items-center gap-2.5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
      >
        <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-indigo-300">Keep going!</p>
          <p className="text-[10px] text-gray-500">You&apos;re ahead of schedule by 2 weeks</p>
        </div>
      </motion.div>

      {/* Recent contribution */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
        className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/40 border border-gray-700/30"
      >
        <span className="text-[10px] text-gray-500">Last contribution</span>
        <span className="text-xs font-medium text-emerald-400">+$200 on Feb 2</span>
      </motion.div>
    </div>
  );
}

// --- Step 3: Build Streaks ---
function BuildStreaks() {
  const contributions = [
    { day: 'Mon', amount: '+$50' },
    { day: 'Tue', amount: '+$25' },
    { day: 'Wed', amount: '+$75' },
    { day: 'Thu', amount: '+$30' },
    { day: 'Fri', amount: '+$50' },
    { day: 'Sat', amount: '+$100' },
    { day: 'Sun', amount: '+$40' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Flame className="w-4 h-4 text-orange-400" />
        <h4 className="text-sm font-semibold text-white">Contribution Streak</h4>
      </div>

      {/* Streak counter */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="flex items-center justify-center gap-3 p-4 rounded-xl bg-gradient-to-br from-orange-500/15 to-amber-500/10 border border-orange-500/30"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame className="w-8 h-8 text-orange-400" />
        </motion.div>
        <div>
          <p className="text-2xl font-bold text-white">7-day streak</p>
          <p className="text-xs text-orange-300">Personal best!</p>
        </div>
      </motion.div>

      {/* Weekly contributions */}
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">This week</p>
        <div className="space-y-1.5">
          {contributions.map((entry, index) => (
            <motion.div
              key={entry.day}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.08, duration: 0.2 }}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-gray-800/40"
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                <span className="text-[10px] text-gray-400 w-7">{entry.day}</span>
              </div>
              <span className="text-[10px] font-medium text-emerald-400">{entry.amount}</span>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="flex justify-between items-center pt-2 border-t border-gray-800"
      >
        <span className="text-xs text-gray-500">Weekly total</span>
        <span className="text-sm font-bold text-white">$370</span>
      </motion.div>
    </div>
  );
}

// --- Step 4: Celebrate Milestones ---
function CelebrateMilestones() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Star className="w-4 h-4 text-indigo-400" />
        <h4 className="text-sm font-semibold text-white">Milestone Reached!</h4>
      </div>

      {/* Celebration card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative p-5 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 border border-indigo-500/30 text-center overflow-hidden"
      >
        {/* Sparkle particles */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0.5],
              y: [0, -20 - i * 5],
              x: [(i % 2 === 0 ? -1 : 1) * (10 + i * 8)],
            }}
            transition={{
              duration: 2,
              delay: 0.5 + i * 0.15,
              repeat: Infinity,
              repeatDelay: 1,
            }}
            className="absolute top-1/2 left-1/2"
          >
            <Sparkles className="w-3 h-3 text-indigo-400" />
          </motion.div>
        ))}

        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Star className="w-10 h-10 text-amber-400 mx-auto mb-2" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
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

      {/* Progress bar at 35% */}
      <div className="p-3 rounded-xl bg-gray-800/60 border border-gray-700/50">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-300">$1,750 of $5,000</span>
          <span className="text-xs font-medium text-indigo-400">35%</span>
        </div>
        <div className="h-2.5 bg-gray-700/60 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: '25%' }}
            animate={{ width: '35%' }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
          />
          {/* 25% milestone marker */}
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
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-800/40 border border-gray-700/30"
      >
        <Target className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        <span className="text-[10px] text-gray-500">Next milestone: 50% ($2,500)</span>
      </motion.div>
    </div>
  );
}

// --- Steps Configuration ---
const steps: DemoStep[] = [
  { label: 'Set a goal', content: <SetGoal />, duration: 3000 },
  { label: 'Track progress', content: <TrackProgress />, duration: 3000 },
  { label: 'Build streaks', content: <BuildStreaks />, duration: 3000 },
  { label: 'Celebrate milestones', content: <CelebrateMilestones />, duration: 3000 },
];

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
