'use client';

import { motion } from 'framer-motion';
import { Calendar, Clock, Plus, Check } from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* Category colors matching real EventCard.tsx */
const CATEGORY = {
  work: { bar: 'bg-blue-400', bg: 'bg-blue-500/10', text: 'text-blue-300', border: 'border-blue-500/20' },
  personal: { bar: 'bg-purple-400', bg: 'bg-purple-500/10', text: 'text-purple-300', border: 'border-purple-500/20' },
  family: { bar: 'bg-pink-400', bg: 'bg-pink-500/10', text: 'text-pink-300', border: 'border-pink-500/20' },
  health: { bar: 'bg-green-400', bg: 'bg-green-500/10', text: 'text-green-300', border: 'border-green-500/20' },
  social: { bar: 'bg-orange-400', bg: 'bg-orange-500/10', text: 'text-orange-300', border: 'border-orange-500/20' },
};

/* ── Step 1: Week view with category-colored events ──────────────── */
function WeekViewStep() {
  const events: Record<string, { name: string; time: string; cat: keyof typeof CATEGORY }[]> = {
    Mon: [{ name: 'Team standup', time: '9am', cat: 'work' }],
    Tue: [{ name: 'Piano lesson', time: '3pm', cat: 'personal' }],
    Wed: [],
    Thu: [
      { name: 'Date night', time: '7pm', cat: 'social' },
    ],
    Fri: [],
    Sat: [{ name: 'Park day', time: '10am', cat: 'family' }],
    Sun: [{ name: 'Yoga class', time: '8am', cat: 'health' }],
  };

  return (
    <div className="space-y-2">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{day}</span>
            <div
              className={`text-xs mt-0.5 font-medium mx-auto ${
                day === 'Thu'
                  ? 'text-purple-300 bg-purple-500/20 rounded-full w-6 h-6 flex items-center justify-center'
                  : 'text-gray-400'
              }`}
            >
              {day === 'Mon' ? '10' : day === 'Tue' ? '11' : day === 'Wed' ? '12' : day === 'Thu' ? '13' : day === 'Fri' ? '14' : day === 'Sat' ? '15' : '16'}
            </div>
          </div>
        ))}
      </div>

      {/* Event blocks in week grid */}
      <div className="grid grid-cols-7 gap-1 min-h-[140px]">
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="space-y-1">
            {events[day]?.map((evt, i) => {
              const c = CATEGORY[evt.cat];
              return (
                <motion.div
                  key={evt.name}
                  className={`rounded-lg px-1.5 py-1.5 ${c.bg} border ${c.border} relative`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 + dayIdx * 0.08 + i * 0.05 }}
                >
                  {/* Category color bar (matches real EventCard) */}
                  <div className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full ${c.bar}`} />
                  <div className="pl-2">
                    <span className={`text-[9px] ${c.text} leading-tight block font-medium`}>{evt.name}</span>
                    <span className="text-[8px] text-gray-400">{evt.time}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Step 2: Add an event ────────────────────────────────────────── */
function AddEventStep() {
  return (
    <div className="space-y-3">
      {/* Mini week context */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">{day}</span>
            <div
              className={`text-xs mt-0.5 font-medium mx-auto ${
                day === 'Wed'
                  ? 'text-purple-300 bg-purple-500/20 rounded-full w-6 h-6 flex items-center justify-center'
                  : 'text-gray-400'
              }`}
            >
              {day === 'Mon' ? '10' : day === 'Tue' ? '11' : day === 'Wed' ? '12' : day === 'Thu' ? '13' : day === 'Fri' ? '14' : day === 'Sat' ? '15' : '16'}
            </div>
          </div>
        ))}
      </div>

      {/* New event card (real EventCard pattern) */}
      <motion.div
        className="bg-gray-800/60 backdrop-blur-sm border border-purple-500/30 rounded-xl p-3 relative"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        {/* Category color bar */}
        <div className="absolute left-3 top-3 bottom-3 w-1 rounded-full bg-purple-400" />

        <div className="pl-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Plus className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-sm text-white font-semibold">Soccer Practice</span>
          </div>
          <div className="flex items-center gap-3 ml-[22px]">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">Wed, Feb 12</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">4:00 PM</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category selector */}
      <motion.div
        className="flex gap-2 flex-wrap px-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.35 }}
      >
        {(['personal', 'work', 'family', 'health', 'social'] as const).map((cat) => {
          const c = CATEGORY[cat];
          const active = cat === 'personal';
          return (
            <div
              key={cat}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium capitalize ${
                active
                  ? `${c.bg} ${c.text} border ${c.border}`
                  : 'bg-gray-800/60 text-gray-400 border border-gray-700/50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${c.bar}`} />
              {cat}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

/* ── Step 3: Who's busy (day view with event cards) ──────────────── */
function WhoBusyStep() {
  const events = [
    { name: 'Soccer Practice', time: '4:00 PM', who: 'Emma', initial: 'E', cat: 'personal' as const, status: 'not-started' },
    { name: 'Guitar Lesson', time: '5:30 PM', who: 'James', initial: 'J', cat: 'personal' as const, status: 'not-started' },
    { name: 'Book Club', time: '7:00 PM', who: 'Sarah', initial: 'S', cat: 'social' as const, status: 'completed' },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-medium">Wednesday, Feb 12</span>
        <span className="text-[10px] text-gray-600">3 events</span>
      </div>

      {events.map((evt, i) => {
        const c = CATEGORY[evt.cat];
        return (
          <motion.div
            key={evt.name}
            className="bg-gray-800/60 backdrop-blur-sm border border-gray-700/50 rounded-xl p-3 relative"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 + i * 0.12 }}
          >
            {/* Category color bar */}
            <div className={`absolute left-3 top-3 bottom-3 w-1 rounded-full ${c.bar}`} />

            <div className="flex items-center gap-3 pl-4">
              {/* Three-state checkbox (real EventCard pattern) */}
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${
                  evt.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : 'border-red-400/60'
                }`}
              >
                {evt.status === 'completed' && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>

              <div className="flex-1 min-w-0">
                <span className={`text-sm font-semibold block ${evt.status === 'completed' ? 'text-gray-500 line-through' : 'text-white'}`}>
                  {evt.name}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] text-gray-400">{evt.time}</span>
                  </div>
                </div>
              </div>

              {/* Assignee avatar */}
              <div className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`text-[10px] font-semibold ${c.text}`}>{evt.initial}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Step 4: Day timeline view ───────────────────────────────────── */
function DayViewStep() {
  const slots = [
    { time: '9 AM', name: 'Morning standup', duration: '9:00 - 9:30', cat: 'work' as const },
    { time: '12 PM', name: 'Lunch with parents', duration: '12:00 - 1:30', cat: 'family' as const },
    { time: '6 PM', name: 'Family dinner', duration: '6:00 - 7:00', cat: 'social' as const },
  ];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">Thursday, Feb 13</span>
      </div>

      <div className="relative ml-10 border-l border-gray-700/60">
        {slots.map((slot, i) => {
          const c = CATEGORY[slot.cat];
          return (
            <motion.div
              key={slot.name}
              className="relative pl-4 pb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 + i * 0.15 }}
            >
              {/* Timeline dot */}
              <div className={`absolute -left-[7px] top-1 w-3.5 h-3.5 rounded-full ${c.bar} border-2 border-gray-900`} />
              <span className="text-[10px] text-gray-400 absolute -left-12 top-0.5">{slot.time}</span>

              {/* Event card with category bar */}
              <div className={`${c.bg} border ${c.border} rounded-xl p-2.5 relative`}>
                <div className={`absolute left-2 top-2 bottom-2 w-[3px] rounded-full ${c.bar}`} />
                <div className="pl-3">
                  <span className={`text-sm ${c.text} font-medium block`}>{slot.name}</span>
                  <span className="text-[10px] text-gray-400">{slot.duration}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Your week at a glance', content: <WeekViewStep /> },
  { label: 'Add an event', content: <AddEventStep /> },
  { label: "See who's busy", content: <WhoBusyStep /> },
  { label: 'Day view details', content: <DayViewStep /> },
];

/** Renders an animated calendar feature demonstration for the landing page. */
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
