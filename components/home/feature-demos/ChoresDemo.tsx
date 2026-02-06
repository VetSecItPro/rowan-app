'use client';

import { motion } from 'framer-motion';
import { User, Clock, Star, Trophy, Medal, Award } from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

function AssignChoresStep() {
  return (
    <div className="space-y-2.5">
      {/* Chore 1 - assigned to Alex */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60">
        <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] text-amber-400">1</span>
        </div>
        <span className="text-sm text-white flex-1">Clean Kitchen</span>
        <motion.div
          className="w-7 h-7 rounded-full bg-blue-500/30 border border-blue-500/40 flex items-center justify-center flex-shrink-0"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2, type: 'spring', stiffness: 300 }}
        >
          <span className="text-xs font-semibold text-blue-300">A</span>
        </motion.div>
      </div>

      {/* Chore 2 - assigned to Sam */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60">
        <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] text-amber-400">2</span>
        </div>
        <span className="text-sm text-white flex-1">Vacuum Living Room</span>
        <motion.div
          className="w-7 h-7 rounded-full bg-purple-500/30 border border-purple-500/40 flex items-center justify-center flex-shrink-0"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.4, type: 'spring', stiffness: 300 }}
        >
          <span className="text-xs font-semibold text-purple-300">S</span>
        </motion.div>
      </div>

      {/* Chore 3 - unassigned */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60 border border-dashed border-gray-700">
        <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] text-amber-400">3</span>
        </div>
        <span className="text-sm text-gray-400 flex-1">Take Out Trash</span>
        <motion.div
          className="w-7 h-7 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center flex-shrink-0"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <User className="w-3.5 h-3.5 text-gray-600" />
        </motion.div>
      </div>
    </div>
  );
}

function TrackDueDatesStep() {
  return (
    <div className="space-y-2.5">
      {/* Due today - urgent */}
      <div className="px-3 py-3 rounded-lg bg-gray-800 border border-red-500/30">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3 h-3 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white block">Clean Kitchen</span>
            <motion.span
              className="text-xs text-red-400 block mt-0.5"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              Due today
            </motion.span>
          </div>
          <div className="w-7 h-7 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-blue-300">A</span>
          </div>
        </div>
      </div>

      {/* Due tomorrow - moderate */}
      <div className="px-3 py-3 rounded-lg bg-gray-800 border border-amber-500/20">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3 h-3 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white block">Vacuum Living Room</span>
            <span className="text-xs text-amber-400 block mt-0.5">Due tomorrow</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-purple-300">S</span>
          </div>
        </div>
      </div>

      {/* Due in 3 days - relaxed */}
      <div className="px-3 py-3 rounded-lg bg-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-gray-700 flex items-center justify-center flex-shrink-0">
            <Clock className="w-3 h-3 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-400 block">Take Out Trash</span>
            <span className="text-xs text-gray-600 block mt-0.5">Due in 3 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EarnPointsStep() {
  return (
    <div className="space-y-3">
      {/* Completed chore with points */}
      <div className="px-3 py-3 rounded-lg bg-gray-800 border border-green-500/30">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Star className="w-3 h-3 text-white" />
          </motion.div>
          <span className="text-sm text-gray-500 line-through flex-1">Clean Kitchen</span>
          <motion.span
            className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3, type: 'spring', stiffness: 300 }}
          >
            +15 pts
          </motion.span>
        </div>
      </div>

      {/* Points summary */}
      <motion.div
        className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-500/30 border border-blue-500/40 flex items-center justify-center">
              <span className="text-xs font-semibold text-blue-300">A</span>
            </div>
            <span className="text-sm text-white font-medium">Alex</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 text-amber-400" />
            <motion.span
              className="text-lg font-bold text-amber-400"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.7 }}
            >
              85
            </motion.span>
            <span className="text-xs text-amber-400/70">pts</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function LeaderboardStep() {
  const entries = [
    { name: 'Alex', initial: 'A', pts: 85, rank: 1, color: 'blue', delay: 0.1 },
    { name: 'Sam', initial: 'S', pts: 72, rank: 2, color: 'purple', delay: 0.25 },
    { name: 'Mom', initial: 'M', pts: 68, rank: 3, color: 'pink', delay: 0.4 },
  ];

  return (
    <div className="space-y-2">
      {/* Leaderboard header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-amber-400">Family Leaderboard</span>
      </div>

      {entries.map((entry) => (
        <motion.div
          key={entry.name}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: entry.delay }}
        >
          {/* Rank icon */}
          <div className="w-6 flex-shrink-0 flex justify-center">
            {entry.rank === 1 && <Trophy className="w-4 h-4 text-amber-400" />}
            {entry.rank === 2 && <Medal className="w-4 h-4 text-gray-400" />}
            {entry.rank === 3 && <Award className="w-4 h-4 text-amber-700" />}
          </div>

          {/* Avatar */}
          {entry.color === 'blue' && (
            <div className="w-7 h-7 rounded-full bg-blue-500/30 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-blue-300">{entry.initial}</span>
            </div>
          )}
          {entry.color === 'purple' && (
            <div className="w-7 h-7 rounded-full bg-purple-500/30 border border-purple-500/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-purple-300">{entry.initial}</span>
            </div>
          )}
          {entry.color === 'pink' && (
            <div className="w-7 h-7 rounded-full bg-pink-500/30 border border-pink-500/40 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-pink-300">{entry.initial}</span>
            </div>
          )}

          {/* Name */}
          <span className="text-sm text-white flex-1">{entry.name}</span>

          {/* Points */}
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-sm font-semibold text-amber-400">{entry.pts}</span>
            <span className="text-xs text-gray-600">pts</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Assign chores', content: <AssignChoresStep />, duration: 3000 },
  { label: 'Track due dates', content: <TrackDueDatesStep />, duration: 3000 },
  { label: 'Earn points', content: <EarnPointsStep />, duration: 3000 },
  { label: 'Family leaderboard', content: <LeaderboardStep />, duration: 3000 },
];

export function ChoresDemo({ className = '' }: { className?: string }) {
  return (
    <AnimatedFeatureDemo
      featureName="Chores"
      colorScheme={{
        primary: 'amber-500',
        secondary: 'orange-500',
        gradient: 'from-amber-500 to-orange-500',
      }}
      steps={steps}
      className={className}
    />
  );
}
