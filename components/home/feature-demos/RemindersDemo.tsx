'use client';

import { motion } from 'framer-motion';
import { Bell, Check, Clock, ChevronDown, AlertCircle } from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

/* Category config matching real ReminderCard.tsx */
const CATEGORY = {
  bills: { emoji: '💰', label: 'Bills', bg: 'bg-green-900/30', text: 'text-green-300' },
  health: { emoji: '💊', label: 'Health', bg: 'bg-red-900/30', text: 'text-red-300' },
  personal: { emoji: '👤', label: 'Personal', bg: 'bg-purple-900/30', text: 'text-purple-300' },
  household: { emoji: '🏠', label: 'Household', bg: 'bg-amber-900/30', text: 'text-amber-300' },
};

/* ── Step 1: Reminder list (matches ReminderCard.tsx) ────────────── */
function ReminderListStep() {
  const reminders = [
    { text: 'Pick up prescription', time: '5:00 PM', cat: 'health' as const, priority: 'high', status: 'active' },
    { text: 'Pay electric bill', time: 'Feb 15', cat: 'bills' as const, priority: 'medium', status: 'active' },
    { text: 'Call insurance company', time: '3:00 PM', cat: 'personal' as const, priority: 'low', status: 'completed' },
  ];

  const priorityColors = { low: 'text-blue-400', medium: 'text-yellow-400', high: 'text-orange-400' };

  return (
    <div className="space-y-2">
      {reminders.map((r, i) => {
        const cat = CATEGORY[r.cat];
        return (
          <motion.div
            key={r.text}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.12 }}
            className={`bg-gray-800 border-2 rounded-lg p-2.5 ${
              r.status === 'completed' ? 'border-green-500/30' : 'border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {/* Status checkbox */}
              <div
                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${
                  r.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : 'border-gray-600 hover:border-pink-500'
                }`}
              >
                {r.status === 'completed' && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>

              <div className="flex-1 min-w-0">
                <span className={`text-sm block ${r.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                  {r.text}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  {/* Category badge */}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${cat.bg} ${cat.text}`}>
                    {cat.emoji} {cat.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] text-gray-400">{r.time}</span>
                  </div>
                </div>
              </div>

              {/* Priority indicator */}
              <AlertCircle className={`w-4 h-4 ${priorityColors[r.priority as keyof typeof priorityColors]} flex-shrink-0`} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Step 2: Set a reminder ──────────────────────────────────────── */
function SetReminderStep() {
  return (
    <div className="space-y-3">
      {/* Reminder input */}
      <div className="bg-gray-800 border-2 border-rose-500/40 rounded-lg p-2.5 ring-1 ring-rose-500/20">
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <div className="flex-1">
            <motion.span
              className="text-sm text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              Water the garden
            </motion.span>
            <motion.span
              className="inline-block w-0.5 h-4 bg-rose-400 ml-0.5 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>
        </div>
      </div>

      {/* Category selector */}
      <motion.div
        className="flex gap-2 flex-wrap"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {(['household', 'bills', 'health', 'personal'] as const).map((key) => {
          const cat = CATEGORY[key];
          const active = key === 'household';
          return (
            <div
              key={key}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium ${
                active ? `${cat.bg} ${cat.text} border border-current/20` : 'bg-gray-800/60 text-gray-400 border border-gray-700/50'
              }`}
            >
              {cat.emoji} {cat.label}
            </div>
          );
        })}
      </motion.div>

      {/* Time picker */}
      <motion.div
        className="bg-gray-800/80 border border-gray-700 rounded-lg p-2.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400">Remind at</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30">
            <span className="text-sm font-medium text-rose-300">8:00 AM</span>
            <ChevronDown className="w-3 h-3 text-rose-400" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Step 3: Get notified ────────────────────────────────────────── */
function GetNotifiedStep() {
  return (
    <div className="space-y-3">
      {/* Notification card */}
      <motion.div
        className="bg-gray-800 border-2 border-rose-500/30 rounded-lg p-3 shadow-lg shadow-rose-500/5"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="flex items-start gap-2.5">
          <div className="relative flex-shrink-0 mt-0.5">
            <motion.div animate={{ rotate: [0, -8, 8, -5, 5, 0] }} transition={{ duration: 0.5, delay: 0.3 }}>
              <Bell className="w-5 h-5 text-rose-400" />
            </motion.div>
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-gray-800"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2, delay: 0.5, type: 'spring', stiffness: 400 }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-300 uppercase tracking-wider">Reminder</span>
              <span className="text-[10px] text-gray-600">8:00 AM</span>
            </div>
            <span className="text-sm text-white mt-1 block">Water the garden</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium mt-1 inline-block ${CATEGORY.household.bg} ${CATEGORY.household.text}`}>
              🏠 Household
            </span>
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <div className="flex-1 py-2 rounded-lg bg-purple-500/15 border border-purple-500/25 text-center">
          <span className="text-xs text-purple-300 font-medium">Snooze 15 min</span>
        </div>
        <div className="flex-1 py-2 rounded-lg bg-gray-800 border border-gray-700 text-center">
          <span className="text-xs text-gray-400 font-medium">Dismiss</span>
        </div>
      </motion.div>

      {/* Other reminder dimmed */}
      <div className="bg-gray-800 border-2 border-green-500/20 rounded-lg p-2.5 opacity-50">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-lg bg-green-500 border-2 border-green-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
          <span className="text-sm text-gray-500 line-through">Pick up prescription</span>
        </div>
      </div>
    </div>
  );
}

/* ── Step 4: Mark done ───────────────────────────────────────────── */
function MarkDoneStep() {
  return (
    <div className="space-y-2">
      {/* Completed reminder */}
      <motion.div className="bg-gray-800 border-2 border-green-500/30 rounded-lg p-2.5">
        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
            className="w-5 h-5 rounded-lg bg-green-500 border-2 border-green-500 flex items-center justify-center flex-shrink-0"
          >
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-500 line-through block">Water the garden</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium mt-1 inline-block ${CATEGORY.household.bg} ${CATEGORY.household.text}`}>
              🏠 Household
            </span>
          </div>
        </div>
        <motion.div
          className="mt-2 ml-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <span className="text-xs font-medium text-green-400">Completed at 8:12 AM</span>
        </motion.div>
      </motion.div>

      {/* Snoozed reminder (purple status) */}
      <div className="bg-gray-800 border-2 border-purple-500/30 rounded-lg p-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-lg bg-purple-500 border-2 border-purple-500 flex items-center justify-center flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-white" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-400 block">Pay electric bill</span>
            <span className="text-[10px] text-purple-400">Snoozed until Feb 14</span>
          </div>
        </div>
      </div>

      {/* Already completed */}
      <div className="bg-gray-800 border-2 border-green-500/20 rounded-lg p-2.5 opacity-60">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-lg bg-green-500/30 border-2 border-green-500/40 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-green-400" strokeWidth={3} />
          </div>
          <span className="text-sm text-gray-500 line-through">Pick up prescription</span>
        </div>
      </div>

      <motion.div
        className="text-center pt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <span className="text-xs text-gray-600">2 of 3 reminders completed today</span>
      </motion.div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Your reminders', content: <ReminderListStep /> },
  { label: 'Set a reminder', content: <SetReminderStep /> },
  { label: 'Get notified', content: <GetNotifiedStep /> },
  { label: 'Mark it done', content: <MarkDoneStep /> },
];

/** Renders an animated reminders feature demonstration for the landing page. */
export function RemindersDemo({ className = '' }: { className?: string }) {
  return (
    <AnimatedFeatureDemo
      featureName="Reminders"
      colorScheme={{
        primary: 'rose-500',
        secondary: 'pink-500',
        gradient: 'from-rose-500 to-pink-500',
      }}
      steps={steps}
      className={className}
    />
  );
}
