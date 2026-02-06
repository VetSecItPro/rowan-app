'use client';

import { motion } from 'framer-motion';
import { Zap, Heart, ListChecks } from 'lucide-react';
import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';

function MoodSelectorStep() {
  const moods = [
    { emoji: '😢', label: 'Sad' },
    { emoji: '😕', label: 'Low' },
    { emoji: '😐', label: 'Okay' },
    { emoji: '🙂', label: 'Good' },
    { emoji: '😊', label: 'Great' },
  ];

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="text-center">
        <motion.p
          className="text-lg font-medium text-white"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          How are you today?
        </motion.p>
        <p className="text-xs text-gray-500 mt-1">Tap to select your mood</p>
      </div>

      {/* Mood faces */}
      <div className="flex justify-center gap-3">
        {moods.map((mood, index) => (
          <motion.div
            key={mood.label}
            className="flex flex-col items-center gap-1.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.08 }}
          >
            <div className="w-10 h-10 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-lg cursor-pointer hover:border-gray-600 transition-colors">
              {mood.emoji}
            </div>
            <span className="text-[10px] text-gray-600">{mood.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ShareMoodStep() {
  return (
    <div className="space-y-4">
      {/* Selected mood */}
      <div className="flex justify-center">
        <motion.div
          className="flex flex-col items-center gap-2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
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
          <span className="text-sm font-medium text-yellow-400">Feeling great!</span>
        </motion.div>
      </div>

      {/* Energy slider */}
      <motion.div
        className="px-3 py-3 rounded-lg bg-gray-800/60"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
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
              className={`h-2 flex-1 rounded-full ${
                level <= 4
                  ? 'bg-orange-500/60'
                  : 'bg-gray-700'
              }`}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.2, delay: 0.4 + level * 0.05 }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function DailyPrioritiesStep() {
  const priorities = [
    { text: 'Finish report', delay: 0.1 },
    { text: 'Call dentist', delay: 0.3 },
    { text: 'Pick up kids at 3', delay: 0.5 },
  ];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-rose-400" />
        <span className="text-sm font-medium text-white">Today&apos;s priorities</span>
      </div>

      {/* Priority items */}
      {priorities.map((item, index) => (
        <motion.div
          key={item.text}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60 border border-gray-700/50"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: item.delay }}
        >
          <div className="w-5 h-5 rounded bg-rose-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-rose-400">{index + 1}</span>
          </div>
          <div className="flex-1">
            <motion.span
              className="text-sm text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: item.delay + 0.1 }}
            >
              {item.text}
            </motion.span>
            {index === 2 && (
              <motion.span
                className="inline-block w-0.5 h-4 bg-rose-400 ml-0.5 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatType: 'reverse' }}
              />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FamilyWellnessStep() {
  const members = [
    {
      name: 'Mom',
      initial: 'M',
      emoji: '😊',
      mood: 'Happy',
      energy: 5,
      bgColor: 'bg-pink-500/30',
      borderColor: 'border-pink-500/40',
      textColor: 'text-pink-300',
      delay: 0.1,
    },
    {
      name: 'Dad',
      initial: 'D',
      emoji: '😐',
      mood: 'Neutral',
      energy: 3,
      bgColor: 'bg-blue-500/30',
      borderColor: 'border-blue-500/40',
      textColor: 'text-blue-300',
      delay: 0.25,
    },
    {
      name: 'Alex',
      initial: 'A',
      emoji: '😊',
      mood: 'Happy',
      energy: 5,
      bgColor: 'bg-green-500/30',
      borderColor: 'border-green-500/40',
      textColor: 'text-green-300',
      delay: 0.4,
    },
  ];

  return (
    <div className="space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <Heart className="w-4 h-4 text-rose-400" />
        <span className="text-sm font-semibold text-rose-400">Family Wellness</span>
      </div>

      {members.map((member) => (
        <motion.div
          key={member.name}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-800/60"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: member.delay }}
        >
          {/* Avatar */}
          <div className={`w-8 h-8 rounded-full ${member.bgColor} border ${member.borderColor} flex items-center justify-center flex-shrink-0`}>
            <span className={`text-xs font-semibold ${member.textColor}`}>{member.initial}</span>
          </div>

          {/* Name */}
          <span className="text-sm text-white flex-1">{member.name}</span>

          {/* Mood */}
          <span className="text-base">{member.emoji}</span>

          {/* Energy indicator */}
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-orange-400" />
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`w-1.5 h-3 rounded-sm ${
                    level <= member.energy
                      ? 'bg-orange-400/70'
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'How are you today?', content: <MoodSelectorStep />, duration: 3000 },
  { label: 'Share your mood', content: <ShareMoodStep />, duration: 3000 },
  { label: 'Set daily priorities', content: <DailyPrioritiesStep />, duration: 3000 },
  { label: 'Family wellness', content: <FamilyWellnessStep />, duration: 3000 },
];

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
