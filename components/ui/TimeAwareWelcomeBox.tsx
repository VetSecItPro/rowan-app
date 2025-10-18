'use client';

import { useMemo } from 'react';
import { Hand, Sparkles, Sun, Moon, Sunset } from 'lucide-react';
import { useTimePeriod } from './SmartBackgroundCanvas';

interface TimeAwareWelcomeBoxProps {
  greetingText: string;
  userName?: string;
  currentDate: string;
  children?: React.ReactNode; // For SpaceSelector or other content
  className?: string;
}

export function TimeAwareWelcomeBox({
  greetingText,
  userName,
  currentDate,
  children,
  className = ''
}: TimeAwareWelcomeBoxProps) {
  const timePeriod = useTimePeriod();

  // Time-specific styling and icons
  const timeBasedConfig = useMemo(() => {
    switch (timePeriod) {
      case 'morning':
        return {
          icon: Sun,
          shimmerClass: 'shimmer-time-morning',
          bgClass: 'bg-time-morning',
          iconColor: 'text-orange-200',
          textColor: 'text-orange-100',
          accentColor: 'text-yellow-100'
        };
      case 'afternoon':
        return {
          icon: Sun,
          shimmerClass: 'shimmer-time-afternoon',
          bgClass: 'bg-time-afternoon',
          iconColor: 'text-blue-200',
          textColor: 'text-blue-100',
          accentColor: 'text-cyan-100'
        };
      case 'evening':
        return {
          icon: Sparkles,
          shimmerClass: 'shimmer-time-evening',
          bgClass: 'bg-time-evening',
          iconColor: 'text-purple-200',
          textColor: 'text-purple-100',
          accentColor: 'text-violet-100'
        };
      case 'night':
        return {
          icon: Sparkles,
          shimmerClass: 'shimmer-time-night',
          bgClass: 'bg-time-night',
          iconColor: 'text-indigo-200',
          textColor: 'text-indigo-100',
          accentColor: 'text-blue-100'
        };
      default:
        return {
          icon: Hand,
          shimmerClass: 'shimmer-gradient',
          bgClass: '',
          iconColor: 'text-white',
          textColor: 'text-blue-100',
          accentColor: 'text-blue-100'
        };
    }
  }, [timePeriod]);

  const { icon: TimeIcon, shimmerClass, bgClass, iconColor, textColor, accentColor } = timeBasedConfig;

  return (
    <div className={`relative overflow-hidden ${shimmerClass} rounded-xl sm:rounded-2xl p-6 sm:p-8 text-white shadow-2xl ${className}`}>
      {/* Time-based background overlay */}
      <div className={`absolute inset-0 ${bgClass} opacity-20`} />

      {/* Base dark overlay for readability */}
      <div className="absolute inset-0 bg-black/10" />

      {/* Floating accent elements for depth */}
      <div className="absolute top-4 right-4 opacity-20">
        <div className={`w-16 h-16 rounded-full ${bgClass} animate-pulse-slow`} />
      </div>
      <div className="absolute bottom-6 left-6 opacity-10">
        <div className={`w-12 h-12 rounded-full ${bgClass} animate-float-slow`} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
          <TimeIcon className={`w-6 h-6 sm:w-8 sm:h-8 ${iconColor} animate-pulse-slow`} />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center">
            {greetingText}{userName ? `, ${userName}!` : '!'}
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 px-2">
          <p className={`${textColor} text-sm sm:text-base md:text-lg text-center`}>
            {currentDate}
          </p>

          {children && (
            <div className="flex items-center gap-3">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Magical Time-Aware Animation Effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Morning - Flying Birds */}
        {timePeriod === 'morning' && (
          <>
            <div className="flying-bird" />
            <div className="flying-bird" />
            <div className="flying-bird" />
            <div className="flying-bird" />
            <div className="flying-bird" />
          </>
        )}

        {/* Night - Twinkling Stars + Sparkles */}
        {timePeriod === 'night' && (
          <>
            <div className="twinkling-star" />
            <div className="twinkling-star" />
            <div className="twinkling-star" />
            <div className="twinkling-star" />
            <div className="twinkling-star" />
            <div className="sparkling-effect" />
            <div className="sparkling-effect" />
            <div className="sparkling-effect" />
          </>
        )}

        {/* Afternoon - Floating Clouds */}
        {timePeriod === 'afternoon' && (
          <>
            <div className="floating-cloud" />
            <div className="floating-cloud" />
            <div className="floating-cloud" />
            <div className="floating-cloud" />
          </>
        )}

        {/* Evening - Dancing Fireflies + Sparkles */}
        {timePeriod === 'evening' && (
          <>
            <div className="dancing-firefly" />
            <div className="dancing-firefly" />
            <div className="dancing-firefly" />
            <div className="dancing-firefly" />
            <div className="sparkling-effect" />
            <div className="sparkling-effect" />
            <div className="sparkling-effect" />
            <div className="sparkling-effect" />
            <div className="sparkling-effect" />
          </>
        )}

        {/* Family Love Hearts (Always Present) */}
        <div className="floating-heart" />
        <div className="floating-heart" />

        {/* Enhanced Magical Particles */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/30 rounded-full magical-particle"
             style={{ animationDelay: '0s' }} />
        <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white/40 rounded-full magical-particle"
             style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-3/4 w-1.5 h-1.5 bg-white/35 rounded-full magical-particle"
             style={{ animationDelay: '4s' }} />
      </div>
    </div>
  );
}

// Alternative compact version for smaller screens or different contexts
export function CompactTimeAwareWelcome({
  greetingText,
  userName,
  className = ''
}: {
  greetingText: string;
  userName?: string;
  className?: string;
}) {
  const timePeriod = useTimePeriod();

  const timeBasedConfig = useMemo(() => {
    switch (timePeriod) {
      case 'morning':
        return { icon: Sun, bgClass: 'from-orange-500/20 to-yellow-500/10' };
      case 'afternoon':
        return { icon: Sparkles, bgClass: 'from-blue-500/20 to-cyan-500/10' };
      case 'evening':
        return { icon: Sunset, bgClass: 'from-purple-500/20 to-violet-500/10' };
      case 'night':
        return { icon: Moon, bgClass: 'from-indigo-500/20 to-blue-500/10' };
      default:
        return { icon: Hand, bgClass: 'from-purple-500/20 to-blue-500/10' };
    }
  }, [timePeriod]);

  const { icon: TimeIcon, bgClass } = timeBasedConfig;

  return (
    <div className={`glass-medium bg-gradient-to-r ${bgClass} rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <TimeIcon className="w-5 h-5 text-white/80" />
        <span className="text-white font-medium">
          {greetingText}{userName ? `, ${userName}!` : '!'}
        </span>
      </div>
    </div>
  );
}