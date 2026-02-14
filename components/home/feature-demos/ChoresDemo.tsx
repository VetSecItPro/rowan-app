'use client';

import { motion } from 'framer-motion';
import {
  Check,
  Clock,
  AlertCircle,
  Pause,
  Star,
  Trophy,
  Medal,
  Award,
  RefreshCw,
} from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

/* Status config matching real ChoreCard.tsx 5-cycle checkbox */
const CHORE_STATUS = {
  pending: { checkbox: 'border-gray-600 bg-transparent', icon: null },
  'in-progress': { checkbox: 'bg-amber-500 border-amber-500', icon: Clock },
  blocked: { checkbox: 'bg-red-500 border-red-500', icon: AlertCircle },
  'on-hold': { checkbox: 'bg-purple-500 border-purple-500', icon: Pause },
  completed: { checkbox: 'bg-green-500 border-green-500', icon: Check },
};

/* ── Step 1: Chore list (real ChoreCard.tsx pattern) ──────────────── */
function ChoreListStep() {
  const chores = [
    { name: 'Clean Kitchen', assignee: 'A', color: 'blue', status: 'in-progress' as const, freq: 'Daily' },
    { name: 'Vacuum Rooms', assignee: 'S', color: 'purple', status: 'pending' as const, freq: 'Weekly' },
    { name: 'Take Out Trash', assignee: 'D', color: 'blue', status: 'completed' as const, freq: 'Daily' },
    { name: 'Mow Lawn', assignee: 'M', color: 'pink', status: 'on-hold' as const, freq: 'Biweekly' },
  ];

  return (
    <div className="space-y-2">
      {chores.map((chore, i) => {
        const st = CHORE_STATUS[chore.status];
        const StatusIcon = st.icon;
        return (
          <motion.div
            key={chore.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1, duration: 0.3 }}
            className="bg-gray-800 border border-gray-700 rounded-lg p-3"
          >
            <div className="flex items-center gap-2.5">
              {/* 5-cycle checkbox (real ChoreCard pattern) */}
              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${st.checkbox}`}>
                {StatusIcon && <StatusIcon className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-sm block ${chore.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                  {chore.name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  {/* Frequency badge */}
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                    <RefreshCw className="w-2.5 h-2.5" />
                    {chore.freq}
                  </span>
                </div>
              </div>
              {/* Assignee avatar */}
              <div className={`w-6 h-6 rounded-full bg-${chore.color}-500/30 border border-${chore.color}-500/40 flex items-center justify-center flex-shrink-0`}>
                <span className={`text-[10px] font-semibold text-${chore.color}-300`}>{chore.assignee}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Step 2: Status cycle demo ────────────────────────────────────── */
function StatusCycleStep() {
  const statuses = [
    { label: 'Pending', status: 'pending' as const, desc: 'Not started yet' },
    { label: 'In Progress', status: 'in-progress' as const, desc: 'Currently working' },
    { label: 'Blocked', status: 'blocked' as const, desc: 'Needs attention' },
    { label: 'On Hold', status: 'on-hold' as const, desc: 'Paused for now' },
    { label: 'Completed', status: 'completed' as const, desc: 'All done!' },
  ];

  return (
    <div className="space-y-3">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-1">
        <div className="flex items-center gap-2.5">
          <div className="bg-amber-500 border-2 border-amber-500 w-6 h-6 rounded-lg flex items-center justify-center">
            <Clock className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
          <div>
            <span className="text-sm text-white block">Clean Kitchen</span>
            <span className="text-[10px] text-amber-400">In Progress</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 uppercase tracking-wider">Tap to cycle status</p>

      <div className="space-y-1.5">
        {statuses.map((s, i) => {
          const st = CHORE_STATUS[s.status];
          const StatusIcon = st.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.25 }}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-800/40"
            >
              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${st.checkbox}`}>
                {StatusIcon && <StatusIcon className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
              </div>
              <div className="flex-1">
                <span className="text-xs text-gray-200">{s.label}</span>
              </div>
              <span className="text-[10px] text-gray-400">{s.desc}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Step 3: Earn points ──────────────────────────────────────────── */
function EarnPointsStep() {
  return (
    <div className="space-y-3">
      {/* Completed chore with points */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="bg-gray-800 border border-green-500/30 rounded-lg p-3"
      >
        <div className="flex items-center gap-2.5">
          <motion.div
            className="w-6 h-6 rounded-lg bg-green-500 border-2 border-green-500 flex items-center justify-center flex-shrink-0"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </motion.div>
          <span className="text-sm text-gray-500 line-through flex-1">Clean Kitchen</span>
          <motion.span
            className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
          >
            +15 pts
          </motion.span>
        </div>
      </motion.div>

      {/* Points summary for each member */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="space-y-1.5"
      >
        <p className="text-[10px] text-gray-400 uppercase tracking-wider">This week</p>
        {[
          { name: 'Alex', initial: 'A', color: 'blue', pts: 85 },
          { name: 'Sam', initial: 'S', color: 'purple', pts: 72 },
          { name: 'Mom', initial: 'M', color: 'pink', pts: 68 },
        ].map((member, i) => (
          <motion.div
            key={member.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-800/40"
          >
            <div className={`w-7 h-7 rounded-full bg-${member.color}-500/30 border border-${member.color}-500/40 flex items-center justify-center flex-shrink-0`}>
              <span className={`text-xs font-semibold text-${member.color}-300`}>{member.initial}</span>
            </div>
            <span className="text-sm text-white flex-1">{member.name}</span>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-sm font-semibold text-amber-400">{member.pts}</span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Step 4: Leaderboard ──────────────────────────────────────────── */
function LeaderboardStep() {
  const entries = [
    { name: 'Alex', initial: 'A', pts: 85, rank: 1, color: 'blue' },
    { name: 'Sam', initial: 'S', pts: 72, rank: 2, color: 'purple' },
    { name: 'Mom', initial: 'M', pts: 68, rank: 3, color: 'pink' },
  ];

  const RankIcon = [Trophy, Medal, Award];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-semibold text-amber-400">Family Leaderboard</span>
      </div>

      {entries.map((entry, i) => {
        const Icon = RankIcon[i];
        const rankColors = ['text-amber-400', 'text-gray-400', 'text-amber-700'];
        return (
          <motion.div
            key={entry.name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.12, duration: 0.3 }}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg ${
              i === 0 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-gray-800/60'
            }`}
          >
            <div className="w-6 flex-shrink-0 flex justify-center">
              <Icon className={`w-4 h-4 ${rankColors[i]}`} />
            </div>
            <div className={`w-8 h-8 rounded-full bg-${entry.color}-500/30 border border-${entry.color}-500/40 flex items-center justify-center flex-shrink-0`}>
              <span className={`text-xs font-semibold text-${entry.color}-300`}>{entry.initial}</span>
            </div>
            <span className="text-sm text-white flex-1">{entry.name}</span>
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400" />
              <span className="text-lg font-bold text-amber-400">{entry.pts}</span>
              <span className="text-xs text-gray-600">pts</span>
            </div>
          </motion.div>
        );
      })}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center pt-1"
      >
        <span className="text-[10px] text-gray-600">Points reset every week</span>
      </motion.div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Family chores', content: <ChoreListStep /> },
  { label: 'Status cycling', content: <StatusCycleStep /> },
  { label: 'Earn points', content: <EarnPointsStep /> },
  { label: 'Leaderboard', content: <LeaderboardStep /> },
];

/** Renders an animated chores feature demonstration for the landing page. */
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
