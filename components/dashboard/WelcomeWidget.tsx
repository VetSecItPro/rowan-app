'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

interface TimeConfig {
  period: TimePeriod;
  greeting: string;
  gradientColors: string;
  accentGlow: string;
}

function getTimeConfig(hour: number): TimeConfig {
  if (hour >= 5 && hour < 12) {
    return {
      period: 'morning',
      greeting: 'Good morning',
      gradientColors: 'from-amber-500/25 via-orange-500/15 to-yellow-500/10',
      accentGlow: 'bg-amber-500/15',
    };
  }
  if (hour >= 12 && hour < 17) {
    return {
      period: 'afternoon',
      greeting: 'Good afternoon',
      gradientColors: 'from-blue-500/25 via-cyan-500/15 to-sky-500/10',
      accentGlow: 'bg-blue-500/15',
    };
  }
  if (hour >= 17 && hour < 21) {
    return {
      period: 'evening',
      greeting: 'Good evening',
      gradientColors: 'from-purple-500/25 via-indigo-500/15 to-violet-500/10',
      accentGlow: 'bg-purple-500/15',
    };
  }
  return {
    period: 'night',
    greeting: 'Good night',
    gradientColors: 'from-slate-700/30 via-gray-800/20 to-indigo-900/15',
    accentGlow: 'bg-indigo-500/10',
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
      {/* Animated gradient background — GPU-accelerated via CSS @keyframes */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${config.gradientColors}`}
        style={{
          backgroundSize: '200% 200%',
          animation: 'welcome-gradient-shift 8s ease-in-out infinite',
        }}
      />

      {/* Animated accent glow — slowly drifts */}
      <div
        className={`absolute -top-1/2 -right-1/4 w-96 h-96 rounded-full blur-3xl ${config.accentGlow}`}
        style={{
          animation: 'welcome-glow-drift 12s ease-in-out infinite',
        }}
      />

      {/* Second glow for depth */}
      <div
        className={`absolute -bottom-1/3 -left-1/4 w-72 h-72 rounded-full blur-3xl ${config.accentGlow} opacity-50`}
        style={{
          animation: 'welcome-glow-drift 12s ease-in-out infinite reverse',
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-5 py-5 sm:px-8 sm:py-6">
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: 0.15,
            type: 'spring',
            stiffness: 100,
            damping: 15,
          }}
          className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight"
        >
          {config.greeting}
          {userName ? `, ${userName}` : ''}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-1.5 text-sm sm:text-base text-gray-400"
        >
          {dateString}
        </motion.p>
      </div>

      {/* CSS @keyframes — injected as a style tag for GPU-accelerated animation */}
      <style jsx>{`
        @keyframes welcome-gradient-shift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        @keyframes welcome-glow-drift {
          0%, 100% {
            transform: translate(0, 0);
          }
          50% {
            transform: translate(-20px, 15px);
          }
        }
      `}</style>
    </motion.div>
  );
}
