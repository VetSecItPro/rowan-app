'use client';

import { motion } from 'framer-motion';
import { Zap, Heart, ListChecks, Sparkles, CheckCircle } from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

/* ── Step 1: Mood selector ────────────────────────────────────────── */
function MoodSelectorStep() {
  const moods = [
    { emoji: '😫', label: 'Rough' },
    { emoji: '😔', label: 'Meh' },
    { emoji: '😐', label: 'Okay' },
    { emoji: '🙂', label: 'Good' },
    { emoji: '😊', label: 'Great' },
  ];

  return (
    <div className="space-y-4">
      <div className="text-center">
        <motion.p
          className="text-lg font-medium text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          How are you today?
        </motion.p>
        <p className="text-xs text-gray-400 mt-1">Tap to select your mood</p>
      </div>

      {/* Mood face grid */}
      <div className="flex justify-center gap-3">
        {moods.map((mood, i) => {
          const isSelected = i === 4;
          return (
            <motion.div
              key={mood.label}
              className="flex flex-col items-center gap-1.5"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg transition-colors ${
                isSelected
                  ? 'bg-yellow-500/20 border-2 border-yellow-400/50'
                  : 'bg-gray-800 border border-gray-700'
              }`}>
                {mood.emoji}
              </div>
              <span className={`text-[10px] ${isSelected ? 'text-yellow-400 font-medium' : 'text-gray-600'}`}>
                {mood.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Selection pulse ring on selected mood */}
      <motion.div
        className="flex justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <span className="text-sm font-medium text-yellow-400">Feeling great!</span>
      </motion.div>
    </div>
  );
}

/* ── Step 2: Energy + notes ───────────────────────────────────────── */
function EnergyNotesStep() {
  return (
    <div className="space-y-4">
      {/* Selected mood display */}
      <div className="flex justify-center">
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
        >
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-yellow-500/20 border-2 border-yellow-400/50 flex items-center justify-center text-2xl">
              😊
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-yellow-400/30"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </div>

      {/* Energy level (real pattern: rectangles w-1.5 h-3 rounded-sm) */}
      <motion.div
        className="p-3 rounded-lg bg-gray-800/60 border border-gray-700/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-xs text-gray-400">Energy level</span>
          </div>
          <span className="text-xs font-semibold text-orange-400">4 / 5</span>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((level) => (
            <motion.div
              key={level}
              className={`h-3 flex-1 rounded-sm ${
                level <= 4 ? 'bg-orange-500/60' : 'bg-gray-700'
              }`}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.2, delay: 0.3 + level * 0.05 }}
            />
          ))}
        </div>
      </motion.div>

      {/* Daily priorities */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
      >
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-xs text-gray-400">Today&apos;s focus</span>
        </div>
        {['Finish report', 'Call dentist', 'Pick up kids at 3'].map((item, i) => (
          <motion.div
            key={item}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 + i * 0.1 }}
            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-gray-800/40 mb-1.5"
          >
            <div className="w-4 h-4 rounded bg-rose-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-semibold text-rose-400">{i + 1}</span>
            </div>
            <span className="text-xs text-gray-200">{item}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/* ── Step 3: Check-in success (real CheckInSuccess.tsx pattern) ────── */
function CheckInSuccessStep() {
  return (
    <div className="space-y-3">
      {/* Success card (real CheckInSuccess pattern) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
        className="bg-gradient-to-br from-gray-800 via-purple-900/30 to-pink-900/30 rounded-xl p-5 border border-pink-500/30 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
          className="w-14 h-14 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg"
        >
          <CheckCircle className="w-8 h-8 text-white" />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg font-bold text-white mb-1"
        >
          Check-in Complete!
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-xs text-gray-300"
        >
          You&apos;re feeling great today
        </motion.p>
      </motion.div>

      {/* Streak display (real pattern) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.3 }}
        className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-xl p-3"
      >
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-bold text-orange-400">5-day streak!</span>
          <Sparkles className="w-4 h-4 text-orange-500" />
        </div>
      </motion.div>

      {/* Pro tip (real pattern) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.3 }}
        className="bg-gray-700/50 rounded-lg p-3 border border-pink-500/30"
      >
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-3.5 h-3.5 text-pink-500" />
          <span className="text-xs font-medium text-white">Pro tip</span>
        </div>
        <p className="text-[10px] text-gray-300 ml-5.5">Check in at the same time each day to build a healthy habit.</p>
      </motion.div>
    </div>
  );
}

/* ── Step 4: Family wellness overview ─────────────────────────────── */
function FamilyWellnessStep() {
  const members = [
    { name: 'Mom', initial: 'M', emoji: '😊', mood: 'Great', energy: 5, bg: 'bg-pink-500/30', border: 'border-pink-500/40', text: 'text-pink-300' },
    { name: 'Dad', initial: 'D', emoji: '😐', mood: 'Okay', energy: 3, bg: 'bg-blue-500/30', border: 'border-blue-500/40', text: 'text-blue-300' },
    { name: 'Alex', initial: 'A', emoji: '🙂', mood: 'Good', energy: 4, bg: 'bg-green-500/30', border: 'border-green-500/40', text: 'text-green-300' },
  ];

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-center gap-2 mb-2">
        <Heart className="w-4 h-4 text-rose-400" />
        <span className="text-sm font-semibold text-rose-400">Family Wellness</span>
      </div>

      {members.map((member, i) => (
        <motion.div
          key={member.name}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.12, duration: 0.3 }}
        >
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full ${member.bg} border ${member.border} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-xs font-semibold ${member.text}`}>{member.initial}</span>
          </div>

          {/* Name */}
          <span className="text-sm text-white flex-1">{member.name}</span>

          {/* Mood emoji */}
          <span className="text-base">{member.emoji}</span>

          {/* Energy bars (real pattern: w-1.5 h-3 rounded-sm rectangles) */}
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-orange-400" />
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`w-1.5 h-3 rounded-sm ${
                    level <= member.energy ? 'bg-orange-400/70' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="text-center pt-1"
      >
        <span className="text-[10px] text-gray-600">3 of 4 family members checked in today</span>
      </motion.div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'How are you today?', content: <MoodSelectorStep /> },
  { label: 'Energy & priorities', content: <EnergyNotesStep /> },
  { label: 'Check-in complete', content: <CheckInSuccessStep /> },
  { label: 'Family wellness', content: <FamilyWellnessStep /> },
];

/** Renders an animated check-in feature demonstration for the landing page. */
export function CheckInDemo({ className = '' }: { className?: string }) {
  return (
    <AnimatedFeatureDemo
      featureName="Daily Check-in"
      colorScheme={{
        primary: 'yellow-500',
        secondary: 'rose-500',
        gradient: 'from-yellow-500 to-rose-500',
      }}
      steps={steps}
      className={className}
    />
  );
}
