'use client';

import { motion } from 'framer-motion';
import { Plus, Check, Circle } from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

function CreateTaskStep() {
  return (
    <div className="space-y-3">
      {/* Existing tasks */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60">
        <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-600 flex-shrink-0" />
        <span className="text-sm text-gray-400">Grocery shopping</span>
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60">
        <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-600 flex-shrink-0" />
        <span className="text-sm text-gray-400">Schedule dentist appointment</span>
      </div>

      {/* New task being typed */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800 border border-cyan-500/40 ring-1 ring-cyan-500/20">
        <Plus className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
        <div className="flex-1">
          <motion.span
            className="text-sm text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            Buy birthday present for Mom
          </motion.span>
          <motion.span
            className="inline-block w-0.5 h-4 bg-cyan-400 ml-0.5 align-middle"
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
          />
        </div>
      </div>
    </div>
  );
}

function SetPriorityStep() {
  return (
    <div className="space-y-3">
      {/* Task with priority being set */}
      <div className="px-3 py-3 rounded-lg bg-gray-800 border border-cyan-500/30">
        <div className="flex items-center gap-3">
          <Circle className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
          <span className="text-sm text-white flex-1">Buy birthday present for Mom</span>
          <motion.span
            className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2, type: 'spring', stiffness: 300 }}
          >
            High
          </motion.span>
        </div>
      </div>

      {/* Priority selector */}
      <motion.div
        className="flex gap-2 px-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-700/60 text-gray-500 border border-gray-700">
          Low
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-700/60 text-gray-500 border border-gray-700">
          Medium
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/40 ring-1 ring-red-500/20">
          High
        </div>
      </motion.div>

      {/* Other tasks dimmed */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/40 opacity-50">
        <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-600 flex-shrink-0" />
        <span className="text-sm text-gray-500">Grocery shopping</span>
      </div>
    </div>
  );
}

function AssignMemberStep() {
  return (
    <div className="space-y-3">
      {/* Task with member being assigned */}
      <div className="px-3 py-3 rounded-lg bg-gray-800 border border-cyan-500/30">
        <div className="flex items-center gap-3">
          <Circle className="w-4.5 h-4.5 text-cyan-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm text-white block">Buy birthday present for Mom</span>
            <span className="text-xs text-red-400 mt-0.5 block">High priority</span>
          </div>
          <motion.div
            className="w-7 h-7 rounded-full bg-blue-500/30 border border-blue-500/40 flex items-center justify-center flex-shrink-0"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3, type: 'spring', stiffness: 300 }}
          >
            <span className="text-xs font-semibold text-blue-300">S</span>
          </motion.div>
        </div>
      </div>

      {/* Family member selector */}
      <motion.div
        className="flex gap-3 px-3 justify-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-blue-500/30 border-2 border-blue-400 flex items-center justify-center">
            <span className="text-xs font-semibold text-blue-300">S</span>
          </div>
          <span className="text-[10px] text-blue-300">Sarah</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-400">J</span>
          </div>
          <span className="text-[10px] text-gray-500">James</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-9 h-9 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center">
            <span className="text-xs font-semibold text-gray-400">E</span>
          </div>
          <span className="text-[10px] text-gray-500">Emma</span>
        </div>
      </motion.div>
    </div>
  );
}

function CompleteTaskStep() {
  return (
    <div className="space-y-3">
      {/* Completed task */}
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
            <span className="text-sm text-gray-500 line-through">Buy birthday present for Mom</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-blue-400">S</span>
          </div>
        </div>
        <motion.div
          className="mt-2 flex items-center gap-1.5 ml-8"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <span className="text-xs font-medium text-green-400">Done!</span>
          <span className="text-xs text-gray-600">Completed just now</span>
        </motion.div>
      </div>

      {/* Remaining tasks */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60">
        <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-600 flex-shrink-0" />
        <span className="text-sm text-gray-400">Grocery shopping</span>
      </div>
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60">
        <div className="w-4.5 h-4.5 rounded-full border-2 border-gray-600 flex-shrink-0" />
        <span className="text-sm text-gray-400">Schedule dentist appointment</span>
      </div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Create a task', content: <CreateTaskStep />, duration: 3000 },
  { label: 'Set priority', content: <SetPriorityStep />, duration: 3000 },
  { label: 'Assign family member', content: <AssignMemberStep />, duration: 3000 },
  { label: 'Complete with satisfaction', content: <CompleteTaskStep />, duration: 3000 },
];

export function TasksDemo({ className = '' }: { className?: string }) {
  return (
    <AnimatedFeatureDemo
      featureName="Tasks"
      colorScheme={{
        primary: 'cyan-500',
        secondary: 'blue-500',
        gradient: 'from-cyan-500 to-blue-500',
      }}
      steps={steps}
      className={className}
    />
  );
}
