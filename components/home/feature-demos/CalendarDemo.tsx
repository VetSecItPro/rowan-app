'use client';

import { motion } from 'framer-motion';
import { Plus, Clock } from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function WeekViewStep() {
  return (
    <div className="space-y-2">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{day}</span>
            <div className="text-xs text-gray-300 mt-0.5 font-medium">
              {day === 'Mon' ? '10' : day === 'Tue' ? '11' : day === 'Wed' ? '12' : day === 'Thu' ? '13' : day === 'Fri' ? '14' : day === 'Sat' ? '15' : '16'}
            </div>
          </div>
        ))}
      </div>

      {/* Event blocks */}
      <div className="grid grid-cols-7 gap-1 min-h-[120px]">
        {/* Monday - has event */}
        <div className="space-y-1">
          <motion.div
            className="rounded px-1 py-1.5 bg-purple-500/20 border-l-2 border-purple-400"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <span className="text-[9px] text-purple-300 leading-tight block">Team mtg</span>
            <span className="text-[8px] text-purple-400/60">9am</span>
          </motion.div>
        </div>

        {/* Tuesday */}
        <div className="space-y-1">
          <motion.div
            className="rounded px-1 py-1.5 bg-blue-500/20 border-l-2 border-blue-400"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <span className="text-[9px] text-blue-300 leading-tight block">Piano</span>
            <span className="text-[8px] text-blue-400/60">3pm</span>
          </motion.div>
        </div>

        {/* Wednesday - empty */}
        <div />

        {/* Thursday - has event */}
        <div className="space-y-1">
          <motion.div
            className="rounded px-1 py-1.5 bg-emerald-500/20 border-l-2 border-emerald-400"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <span className="text-[9px] text-emerald-300 leading-tight block">Dinner</span>
            <span className="text-[8px] text-emerald-400/60">6pm</span>
          </motion.div>
        </div>

        {/* Friday */}
        <div />

        {/* Saturday - has event */}
        <div className="space-y-1">
          <motion.div
            className="rounded px-1 py-1.5 bg-amber-500/20 border-l-2 border-amber-400"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <span className="text-[9px] text-amber-300 leading-tight block">Park day</span>
            <span className="text-[8px] text-amber-400/60">10am</span>
          </motion.div>
        </div>

        {/* Sunday */}
        <div />
      </div>
    </div>
  );
}

function AddEventStep() {
  return (
    <div className="space-y-3">
      {/* Mini calendar context - Wednesday highlighted */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map((day) => (
          <div key={day} className="text-center">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">{day}</span>
            <div
              className={`text-xs mt-0.5 font-medium ${
                day === 'Wed'
                  ? 'text-purple-300 bg-purple-500/20 rounded-full w-6 h-6 flex items-center justify-center mx-auto'
                  : 'text-gray-500'
              }`}
            >
              {day === 'Mon' ? '10' : day === 'Tue' ? '11' : day === 'Wed' ? '12' : day === 'Thu' ? '13' : day === 'Fri' ? '14' : day === 'Sat' ? '15' : '16'}
            </div>
          </div>
        ))}
      </div>

      {/* New event being added */}
      <motion.div
        className="px-3 py-3 rounded-lg bg-gray-800 border border-purple-500/40 ring-1 ring-purple-500/20"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Plus className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-sm text-white font-medium">Soccer Practice</span>
        </div>
        <div className="flex items-center gap-4 ml-5.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-xs text-gray-400">Wed, 4:00 PM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-xs text-gray-400">1 hour</span>
          </div>
        </div>
      </motion.div>

      {/* Confirmation area */}
      <motion.div
        className="flex justify-end px-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <div className="px-4 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30">
          <span className="text-xs font-medium text-purple-300">Add Event</span>
        </div>
      </motion.div>
    </div>
  );
}

function WhoBusyStep() {
  return (
    <div className="space-y-2">
      {/* Wednesday header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-medium">Wednesday, Feb 12</span>
        <span className="text-[10px] text-gray-600">3 events</span>
      </div>

      {/* Events with different family members */}
      <motion.div
        className="px-3 py-2.5 rounded-lg bg-purple-500/10 border-l-3 border-purple-400 flex items-center gap-3"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-semibold text-purple-300">E</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-white block">Soccer Practice</span>
          <span className="text-[10px] text-gray-500">4:00 PM - Emma</span>
        </div>
      </motion.div>

      <motion.div
        className="px-3 py-2.5 rounded-lg bg-blue-500/10 border-l-3 border-blue-400 flex items-center gap-3"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="w-6 h-6 rounded-full bg-blue-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-semibold text-blue-300">J</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-white block">Guitar Lesson</span>
          <span className="text-[10px] text-gray-500">5:30 PM - James</span>
        </div>
      </motion.div>

      <motion.div
        className="px-3 py-2.5 rounded-lg bg-emerald-500/10 border-l-3 border-emerald-400 flex items-center gap-3"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <div className="w-6 h-6 rounded-full bg-emerald-500/30 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-semibold text-emerald-300">S</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-white block">Book Club</span>
          <span className="text-[10px] text-gray-500">7:00 PM - Sarah</span>
        </div>
      </motion.div>
    </div>
  );
}

function DayViewStep() {
  return (
    <div className="space-y-1">
      {/* Day header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">Thursday, Feb 13</span>
      </div>

      {/* Timeline */}
      <div className="relative ml-8 border-l border-gray-700/60">
        {/* 9 AM */}
        <motion.div
          className="relative pl-4 pb-4"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-gray-900" />
          <span className="text-[10px] text-gray-500 absolute -left-10 top-0">9 AM</span>
          <div className="px-3 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/20">
            <span className="text-sm text-indigo-300 font-medium block">Morning standup</span>
            <span className="text-[10px] text-gray-500">9:00 - 9:30 AM</span>
          </div>
        </motion.div>

        {/* 12 PM */}
        <motion.div
          className="relative pl-4 pb-4"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-gray-900" />
          <span className="text-[10px] text-gray-500 absolute -left-12 top-0">12 PM</span>
          <div className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/20">
            <span className="text-sm text-amber-300 font-medium block">Lunch with parents</span>
            <span className="text-[10px] text-gray-500">12:00 - 1:30 PM</span>
          </div>
        </motion.div>

        {/* 6 PM */}
        <motion.div
          className="relative pl-4 pb-1"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="absolute -left-1.5 top-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-gray-900" />
          <span className="text-[10px] text-gray-500 absolute -left-10 top-0">6 PM</span>
          <div className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/20">
            <span className="text-sm text-emerald-300 font-medium block">Family dinner</span>
            <span className="text-[10px] text-gray-500">6:00 - 7:00 PM</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Your week at a glance', content: <WeekViewStep />, duration: 3000 },
  { label: 'Add an event', content: <AddEventStep />, duration: 3000 },
  { label: "See who's busy", content: <WhoBusyStep />, duration: 3000 },
  { label: 'Day view details', content: <DayViewStep />, duration: 3000 },
];

export function CalendarDemo({ className = '' }: { className?: string }) {
  return (
    <AnimatedFeatureDemo
      featureName="Calendar"
      colorScheme={{
        primary: 'purple-500',
        secondary: 'indigo-500',
        gradient: 'from-purple-500 to-indigo-500',
      }}
      steps={steps}
      className={className}
    />
  );
}
