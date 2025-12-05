'use client';

import { useEffect, useMemo, useState } from 'react';

export interface BackgroundCanvasProps {
  variant?: 'subtle' | 'ambient' | 'vibrant';
  feature?: 'tasks' | 'calendar' | 'messages' | 'shopping' | 'meals' | 'reminders' | 'goals' | 'budget' | 'projects' | 'dashboard';
  timeAware?: boolean;
  className?: string;
  contentClassName?: string;
  children?: React.ReactNode;
}

interface TimeBasedColors {
  primary: string;
  secondary: string;
  accent: string;
  period: 'morning' | 'afternoon' | 'evening' | 'night';
}

const FEATURE_COLORS = {
  tasks: { primary: 'blue', secondary: 'indigo' },
  calendar: { primary: 'purple', secondary: 'violet' },
  messages: { primary: 'green', secondary: 'emerald' },
  shopping: { primary: 'emerald', secondary: 'teal' },
  meals: { primary: 'orange', secondary: 'amber' },
  reminders: { primary: 'pink', secondary: 'rose' },
  goals: { primary: 'indigo', secondary: 'purple' },
  budget: { primary: 'amber', secondary: 'yellow' },
  projects: { primary: 'amber', secondary: 'orange' },
  dashboard: { primary: 'purple', secondary: 'blue' },
} as const;

export function SmartBackgroundCanvas({
  variant = 'subtle',
  feature = 'dashboard',
  timeAware = false,
  className = '',
  contentClassName = '',
  children
}: BackgroundCanvasProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Time-aware color calculation
  // Night: 9PM-5AM, Morning: 5AM-12PM, Afternoon: 12PM-5PM, Evening: 5PM-9PM
  const timeBasedColors = useMemo((): TimeBasedColors => {
    const hour = new Date().getHours();

    if (hour >= 21 || hour < 5) {
      // Night (9PM-5AM): deep, calming colors
      return {
        primary: 'indigo',
        secondary: 'blue',
        accent: 'purple',
        period: 'night'
      };
    } else if (hour < 12) {
      // Morning (5AM-12PM): warmer, energetic colors
      return {
        primary: 'orange',
        secondary: 'yellow',
        accent: 'pink',
        period: 'morning'
      };
    } else if (hour < 17) {
      // Afternoon (12PM-5PM): bright, clear colors
      return {
        primary: 'blue',
        secondary: 'cyan',
        accent: 'indigo',
        period: 'afternoon'
      };
    } else {
      // Evening (5PM-9PM): sophisticated, purple tones
      return {
        primary: 'purple',
        secondary: 'indigo',
        accent: 'violet',
        period: 'evening'
      };
    }
  }, []);

  // Get colors for the current context
  const colors = useMemo(() => {
    if (timeAware) {
      return timeBasedColors;
    }
    return {
      primary: FEATURE_COLORS[feature].primary,
      secondary: FEATURE_COLORS[feature].secondary,
      accent: FEATURE_COLORS[feature].primary,
      period: 'default' as const
    };
  }, [feature, timeAware, timeBasedColors]);

  // Generate CSS custom properties for dynamic gradients
  const cssVariables = useMemo(() => {
    if (!mounted) return {};

    const baseOpacity = variant === 'subtle' ? 0.05 : variant === 'ambient' ? 0.15 : 0.25;
    const secondaryOpacity = baseOpacity * 0.7;
    const accentOpacity = baseOpacity * 0.5;

    return {
      '--bg-primary-50': `rgb(var(--${colors.primary}-50) / ${baseOpacity})`,
      '--bg-primary-100': `rgb(var(--${colors.primary}-100) / ${secondaryOpacity})`,
      '--bg-secondary-50': `rgb(var(--${colors.secondary}-50) / ${accentOpacity})`,
      '--bg-accent-50': `rgb(var(--${colors.accent}-50) / ${accentOpacity * 0.5})`,
      '--animation-duration': timeAware ? '20s' : '15s',
      '--animation-delay': timeAware ? Math.random() * 10 + 's' : '0s',
    } as React.CSSProperties;
  }, [colors, variant, timeAware, mounted]);

  const backgroundClasses = useMemo(() => {
    const base = 'relative overflow-hidden';

    if (variant === 'subtle') {
      return `${base} bg-gradient-to-br from-${colors.primary}-50/[0.02] via-transparent to-${colors.secondary}-50/[0.01]`;
    } else if (variant === 'ambient') {
      return `${base} bg-gradient-to-br from-${colors.primary}-50/[0.08] via-${colors.secondary}-50/[0.04] to-transparent`;
    } else {
      return `${base} bg-gradient-to-br from-${colors.primary}-100/[0.15] via-${colors.secondary}-100/[0.08] to-${colors.accent}-50/[0.05]`;
    }
  }, [colors, variant]);

  if (!mounted) {
    return (
      <div className={`${backgroundClasses} ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`${backgroundClasses} ${className}`}
      style={cssVariables}
    >
      {/* Primary mesh gradient layer */}
      <div
        className="absolute inset-0 opacity-40 animate-slow-drift"
        style={{
          background: `
            radial-gradient(circle at 20% 80%, var(--bg-primary-50) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, var(--bg-secondary-50) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, var(--bg-accent-50) 0%, transparent 50%)
          `,
          animationDuration: 'var(--animation-duration)',
          animationDelay: 'var(--animation-delay)',
        }}
      />

      {/* Secondary floating orbs for depth */}
      {variant !== 'subtle' && (
        <div
          className="absolute inset-0 opacity-20 animate-float-slow"
          style={{
            background: `
              radial-gradient(ellipse at 60% 10%, var(--bg-primary-100) 0%, transparent 40%),
              radial-gradient(ellipse at 10% 60%, var(--bg-secondary-50) 0%, transparent 40%)
            `,
            animationDuration: 'calc(var(--animation-duration) * 1.5)',
            animationDelay: 'calc(var(--animation-delay) + 2s)',
          }}
        />
      )}

      {/* Time-aware accent layer */}
      {timeAware && (
        <div
          className="absolute inset-0 opacity-10 animate-pulse-slow"
          style={{
            background: `radial-gradient(ellipse at center, var(--bg-accent-50) 0%, transparent 70%)`,
            animationDuration: '8s',
          }}
        />
      )}

      {/* Content layer */}
      <div className={`relative z-10 ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
}

// Utility hook for getting current time period
// Night: 9PM-5AM, Morning: 5AM-12PM, Afternoon: 12PM-5PM, Evening: 5PM-9PM
export function useTimePeriod() {
  const [period, setPeriod] = useState<'morning' | 'afternoon' | 'evening' | 'night'>('night');

  useEffect(() => {
    const updatePeriod = () => {
      const hour = new Date().getHours();
      if (hour >= 21 || hour < 5) setPeriod('night');
      else if (hour < 12) setPeriod('morning');
      else if (hour < 17) setPeriod('afternoon');
      else setPeriod('evening');
    };

    updatePeriod();

    // Update every minute to ensure accuracy
    const interval = setInterval(updatePeriod, 60000);
    return () => clearInterval(interval);
  }, []);

  return period;
}