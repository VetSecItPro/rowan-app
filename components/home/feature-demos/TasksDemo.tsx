'use client';

import { motion } from 'framer-motion';
import { Check, Calendar, Clock, Plus } from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const TYPE_BADGE: Record<string, string> = {
  task: 'text-blue-400 bg-blue-400/10',
  chore: 'text-amber-400 bg-amber-400/10',
};

/* ── Step 1: Task list (matches real TaskCard.tsx) ────────────────── */
function TaskListStep() {
  const tasks = [
    { name: 'Grocery shopping', type: 'task', priority: 'medium', status: 'pending', assignee: 'S', date: 'Today' },
    { name: 'Clean the kitchen', type: 'chore', priority: 'high', status: 'in-progress', assignee: 'E', date: 'Today' },
    { name: 'Schedule dentist appt', type: 'task', priority: 'low', status: 'pending', assignee: null, date: 'Tomorrow' },
  ];

  return (
    <div className="space-y-2">
      {tasks.map((task, i) => (
        <motion.div
          key={task.name}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.12 }}
          className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-2.5"
        >
          <div className="flex items-center gap-2.5">
            {/* Rounded-md checkbox (real pattern) */}
            <div
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                task.status === 'in-progress'
                  ? 'border-amber-500 bg-amber-500/20'
                  : 'border-gray-600'
              }`}
            >
              {task.status === 'in-progress' && <Clock className="w-3 h-3 text-amber-400" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]} flex-shrink-0`} />
                <span className="text-sm text-white truncate">{task.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 ml-3.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGE[task.type]}`}>
                  {task.type === 'task' ? 'Task' : 'Chore'}
                </span>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <span className="text-[10px] text-gray-500">{task.date}</span>
                </div>
              </div>
            </div>

            {task.assignee && (
              <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-semibold text-blue-300">{task.assignee}</span>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Step 2: Create a new task ──────────────────────────────────── */
function CreateTaskStep() {
  return (
    <div className="space-y-2">
      {/* Existing task */}
      <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md border-2 border-gray-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" />
              <span className="text-sm text-gray-400">Grocery shopping</span>
            </div>
            <div className="flex items-center gap-2 mt-1 ml-3.5">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-blue-400 bg-blue-400/10">Task</span>
            </div>
          </div>
        </div>
      </div>

      {/* New task being typed */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-gray-800 border border-cyan-500/40 ring-1 ring-cyan-500/20 rounded-xl p-2.5"
      >
        <div className="flex items-center gap-2.5">
          <Plus className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <div className="flex-1">
            <motion.span
              className="text-sm text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.4 }}
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
      </motion.div>

      {/* Another existing task */}
      <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-2.5 opacity-50">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md border-2 border-gray-600 flex-shrink-0" />
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
            <span className="text-sm text-gray-500">Schedule dentist appt</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 3: Assign + set priority ──────────────────────────────── */
function AssignPriorityStep() {
  return (
    <div className="space-y-3">
      {/* Task card with priority + assignee animating in */}
      <div className="bg-gray-800 border border-cyan-500/30 rounded-xl p-3">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md border-2 border-gray-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: 0.3, type: 'spring', stiffness: 400 }}
              />
              <span className="text-sm text-white">Buy birthday present for Mom</span>
            </div>
            <div className="flex items-center gap-2 mt-1 ml-3.5">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-blue-400 bg-blue-400/10">Task</span>
              <motion.span
                className="px-1.5 py-0.5 rounded text-[10px] font-medium text-orange-400 bg-orange-400/10"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4, type: 'spring', stiffness: 300 }}
              >
                High
              </motion.span>
            </div>
          </div>
          <motion.div
            className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.6, type: 'spring', stiffness: 300 }}
          >
            <span className="text-xs font-semibold text-blue-300">S</span>
          </motion.div>
        </div>
      </div>

      {/* Family member selector */}
      <motion.div
        className="flex gap-3 justify-center"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {[
          { initial: 'S', name: 'Sarah', active: true },
          { initial: 'J', name: 'James', active: false },
          { initial: 'E', name: 'Emma', active: false },
        ].map((member) => (
          <div key={member.name} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center ${
                member.active
                  ? 'bg-blue-500/30 border-2 border-blue-400'
                  : 'bg-gray-700 border-2 border-gray-600'
              }`}
            >
              <span className={`text-xs font-semibold ${member.active ? 'text-blue-300' : 'text-gray-400'}`}>
                {member.initial}
              </span>
            </div>
            <span className={`text-[10px] ${member.active ? 'text-blue-300' : 'text-gray-500'}`}>
              {member.name}
            </span>
          </div>
        ))}
      </motion.div>

      {/* Priority selector */}
      <motion.div
        className="flex gap-2 justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        {[
          { label: 'Low', dot: 'bg-blue-500', active: false },
          { label: 'Medium', dot: 'bg-yellow-500', active: false },
          { label: 'High', dot: 'bg-orange-500', active: true },
        ].map((p) => (
          <div
            key={p.label}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
              p.active
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 ring-1 ring-orange-500/20'
                : 'bg-gray-700/60 text-gray-500 border border-gray-700'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${p.dot}`} />
            {p.label}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Step 4: Complete task ──────────────────────────────────────── */
function CompleteTaskStep() {
  return (
    <div className="space-y-2">
      {/* Completed task with green checkbox */}
      <motion.div className="bg-gray-800/60 backdrop-blur-sm border border-green-500/30 rounded-xl p-2.5">
        <div className="flex items-center gap-2.5">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
            className="w-5 h-5 rounded-md bg-green-500 flex items-center justify-center flex-shrink-0"
          >
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
              <span className="text-sm text-gray-500 line-through">Buy birthday present for Mom</span>
            </div>
            <div className="flex items-center gap-2 mt-1 ml-3.5">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium text-green-400 bg-green-400/10">Done</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-gray-600" />
                <span className="text-[10px] text-gray-600">Completed just now</span>
              </div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-blue-400">S</span>
          </div>
        </div>
      </motion.div>

      {/* Remaining tasks */}
      {[
        { name: 'Grocery shopping', priority: 'medium', type: 'task' },
        { name: 'Clean the kitchen', priority: 'high', type: 'chore' },
      ].map((task, i) => (
        <motion.div
          key={task.name}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 + i * 0.1 }}
          className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-2.5"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md border-2 border-gray-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${PRIORITY_DOT[task.priority]} flex-shrink-0`} />
                <span className="text-sm text-gray-400">{task.name}</span>
              </div>
              <div className="mt-1 ml-3.5">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TYPE_BADGE[task.type]}`}>
                  {task.type === 'task' ? 'Task' : 'Chore'}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Your tasks at a glance', content: <TaskListStep /> },
  { label: 'Create a task', content: <CreateTaskStep /> },
  { label: 'Assign & prioritize', content: <AssignPriorityStep /> },
  { label: 'Complete with satisfaction', content: <CompleteTaskStep /> },
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
