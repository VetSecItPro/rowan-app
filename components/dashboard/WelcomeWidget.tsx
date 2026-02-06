'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

interface TimeConfig {
  period: TimePeriod;
  greeting: string;
  gradient: string;
  accentGlow: string;
}

function getTimeConfig(hour: number): TimeConfig {
  if (hour >= 5 && hour < 12) {
    return {
      period: 'morning',
      greeting: 'Good morning',
      gradient: 'bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/5',
      accentGlow: 'bg-amber-500/10',
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      period: 'afternoon',
      greeting: 'Good afternoon',
      gradient: 'bg-gradient-to-br from-blue-500/20 via-cyan-500/10 to-sky-500/5',
      accentGlow: 'bg-blue-500/10',
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      period: 'evening',
      greeting: 'Good evening',
      gradient: 'bg-gradient-to-br from-purple-500/20 via-indigo-500/10 to-violet-500/5',
      accentGlow: 'bg-purple-500/10',
    };
  }
  // Night: 9pm - 5am
  return {
    period: 'night',
    greeting: 'Good night',
    gradient: 'bg-gradient-to-br from-gray-800 via-slate-800/50 to-gray-900',
    accentGlow: 'bg-indigo-500/5',
  };
}

interface WelcomeWidgetProps {
  userName?: string;
  className?: string;
}

export function WelcomeWidget({ userName, className = '' }: WelcomeWidgetProps) {
  const now = useMemo(() => new Date(), []);
  const hour = now.getHours();
  const config = useMemo(() => getTimeConfig(hour), [hour]);
  const dateString = useMemo(() => format(now, 'EEEE, MMMM d, yyyy'), [now]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-gray-700/30 shadow-xl ${className}`}
    >
      {/* Time-of-day gradient background */}
      <div className={`absolute inset-0 ${config.gradient}`} />

      {/* Subtle accent glow */}
      <div
        className={`absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full blur-3xl ${config.accentGlow}`}
      />

      {/* Content */}
      <div className="relative z-10 px-5 py-5 sm:px-8 sm:py-6">
        <motion.h1
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight"
        >
          {config.greeting}
          {userName ? `, ${userName}` : ''}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-1.5 text-sm sm:text-base text-gray-400"
        >
          {dateString}
        </motion.p>
      </div>
    </motion.div>
  );
}
