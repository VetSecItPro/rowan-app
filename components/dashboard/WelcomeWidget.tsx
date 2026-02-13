'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}

interface WelcomeWidgetProps {
  userName?: string;
  className?: string;
}

export function WelcomeWidget({ userName, className = '' }: WelcomeWidgetProps) {
  const now = useMemo(() => new Date(), []);
  const greeting = useMemo(() => getGreeting(now.getHours()), [now]);
  const dateString = useMemo(() => format(now, 'EEEE, MMMM d, yyyy'), [now]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex items-baseline justify-between gap-4 ${className}`}
    >
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
        {greeting}
        {userName ? `, ${userName}` : ''}
      </h1>

      <p className="text-sm text-gray-400 whitespace-nowrap shrink-0">
        {dateString}
      </p>
    </motion.div>
  );
}
