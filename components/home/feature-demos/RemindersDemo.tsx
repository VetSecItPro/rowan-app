'use client';

import { motion } from 'framer-motion';
import { Bell, Check, Clock, ChevronDown } from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

function SetReminderStep() {
  return (
    <div className="space-y-3">
      {/* Reminder input */}
      <div className="px-3 py-3 rounded-lg bg-gray-800 border border-rose-500/40 ring-1 ring-rose-500/20">
        <div className="flex items-center gap-3">
          <Bell className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <div className="flex-1">
            <motion.span
              className="text-sm text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              Pick up prescription
            </motion.span>
            <motion.span
              className="inline-block w-0.5 h-4 bg-rose-400 ml-0.5 align-middle"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
            />
          </div>
        </div>
      </div>

      {/* Time picker */}
      <motion.div
        className="px-3 py-3 rounded-lg bg-gray-800/80 border border-gray-700"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-xs text-gray-400">Remind at</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/30">
            <span className="text-sm font-medium text-rose-300">5:00 PM</span>
            <ChevronDown className="w-3 h-3 text-rose-400" />
          </div>
        </div>
      </motion.div>

      {/* Existing reminder dimmed */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/40 opacity-50">
        <Bell className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
        <span className="text-sm text-gray-500">Call insurance company</span>
        <span className="text-[10px] text-gray-600 ml-auto">3:00 PM</span>
      </div>
    </div>
  );
}

function ChooseWhenStep() {
  return (
    <div className="space-y-3">
      {/* Reminder preview */}
      <div className="px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700">
        <div className="flex items-center gap-3">
          <Bell className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white block">Pick up prescription</span>
            <span className="text-[10px] text-gray-500">at 5:00 PM</span>
          </div>
        </div>
      </div>

      {/* Day selector */}
      <motion.div
        className="space-y-2"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <span className="text-xs text-gray-500 px-1">When?</span>
        <div className="grid grid-cols-3 gap-2">
          <motion.div
            className="px-3 py-2.5 rounded-lg bg-rose-500/20 border border-rose-500/40 ring-1 ring-rose-500/20 text-center"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: 0.25 }}
          >
            <span className="text-sm font-medium text-rose-300 block">Today</span>
            <span className="text-[10px] text-rose-400/60">Feb 12</span>
          </motion.div>
          <div className="px-3 py-2.5 rounded-lg bg-gray-800/60 border border-gray-700 text-center">
            <span className="text-sm text-gray-400 block">Tomorrow</span>
            <span className="text-[10px] text-gray-600">Feb 13</span>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-gray-800/60 border border-gray-700 text-center">
            <span className="text-sm text-gray-400 block">Custom</span>
            <span className="text-[10px] text-gray-600">Pick date</span>
          </div>
        </div>
      </motion.div>

      {/* Confirm button */}
      <motion.div
        className="flex justify-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <div className="px-4 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30">
          <span className="text-xs font-medium text-rose-300">Set Reminder</span>
        </div>
      </motion.div>
    </div>
  );
}

function GetNotifiedStep() {
  return (
    <div className="space-y-3">
      {/* Notification simulation */}
      <motion.div
        className="px-4 py-3.5 rounded-xl bg-gray-800 border border-rose-500/30 shadow-lg shadow-rose-500/5"
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
      >
        <div className="flex items-start gap-3">
          {/* Bell with badge */}
          <div className="relative flex-shrink-0 mt-0.5">
            <motion.div
              animate={{ rotate: [0, -8, 8, -5, 5, 0] }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
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
              <span className="text-[10px] text-gray-600">5:00 PM</span>
            </div>
            <span className="text-sm text-white mt-1 block">Pick up prescription</span>
            <span className="text-xs text-gray-500 mt-0.5 block">Due today at 5:00 PM</span>
          </div>
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        className="flex gap-2 px-1"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.5 }}
      >
        <div className="flex-1 py-2 rounded-lg bg-rose-500/15 border border-rose-500/25 text-center">
          <span className="text-xs text-rose-300 font-medium">Snooze 15 min</span>
        </div>
        <div className="flex-1 py-2 rounded-lg bg-gray-800 border border-gray-700 text-center">
          <span className="text-xs text-gray-400 font-medium">Dismiss</span>
        </div>
      </motion.div>

      {/* Other reminders context */}
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800/40 opacity-50">
        <Bell className="w-3 h-3 text-gray-600 flex-shrink-0" />
        <span className="text-xs text-gray-500">Call insurance company</span>
        <span className="text-[10px] text-gray-600 ml-auto">3:00 PM</span>
        <div className="w-4 h-4 rounded-full bg-green-500/20 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-green-400" strokeWidth={3} />
        </div>
      </div>
    </div>
  );
}

function MarkDoneStep() {
  return (
    <div className="space-y-3">
      {/* Completed reminder */}
      <div className="px-3 py-3 rounded-lg bg-gray-800 border border-green-500/30">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
          >
            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <Check className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </motion.div>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-500 line-through block">Pick up prescription</span>
            <span className="text-[10px] text-gray-600">Scheduled for 5:00 PM</span>
          </div>
        </div>
        <motion.div
          className="mt-2 ml-8"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <span className="text-xs font-medium text-green-400">Completed at 4:47 PM</span>
        </motion.div>
      </div>

      {/* Another completed reminder */}
      <div className="px-3 py-2.5 rounded-lg bg-gray-800/60">
        <div className="flex items-center gap-3">
          <div className="w-4.5 h-4.5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
            <Check className="w-2.5 h-2.5 text-green-400" strokeWidth={3} />
          </div>
          <span className="text-sm text-gray-500 line-through">Call insurance company</span>
          <span className="text-[10px] text-gray-600 ml-auto">3:00 PM</span>
        </div>
      </div>

      {/* Upcoming */}
      <div className="px-3 py-2.5 rounded-lg bg-gray-800/60">
        <div className="flex items-center gap-3">
          <Bell className="w-3.5 h-3.5 text-rose-400/60 flex-shrink-0" />
          <span className="text-sm text-gray-400">Water the plants</span>
          <span className="text-[10px] text-gray-600 ml-auto">Tomorrow</span>
        </div>
      </div>

      {/* Summary */}
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
  { label: 'Set a reminder', content: <SetReminderStep />, duration: 3000 },
  { label: 'Choose when', content: <ChooseWhenStep />, duration: 3000 },
  { label: 'Get notified', content: <GetNotifiedStep />, duration: 3000 },
  { label: 'Mark it done', content: <MarkDoneStep />, duration: 3000 },
];

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
