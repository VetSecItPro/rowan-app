'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTimePeriod } from './SmartBackgroundCanvas';

interface TimeAwareWelcomeBoxProps {
  greetingText: string;
  userName?: string;
  currentDate: string;
  className?: string;
  children?: React.ReactNode;
}

/** Renders a welcome box with time-of-day greeting and daily summary. */
export function TimeAwareWelcomeBox({
  greetingText,
  userName,
  className = '',
  children
}: TimeAwareWelcomeBoxProps) {
  const timePeriod = useTimePeriod();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Hourly changing images - get current hour for seed
  const currentHour = useMemo(() => {
    return new Date().getHours();
  }, []);

  const timeBasedConfig = useMemo(() => {
    return {
      overlay: 'bg-gradient-to-t from-black/70 via-black/40 to-black/20',
      textColor: 'text-white',
    };
  }, []);

  const { overlay, textColor } = timeBasedConfig;

  // Using Picsum Photos API with hourly seed for changing images
  // Seed changes every hour to get a new random image
  const imageUrl = `https://picsum.photos/seed/hour-${currentHour}/1600/400`;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl transition-all duration-700 hover:scale-[1.01] shadow-2xl ${className}`}
    >
      {/* Background Image */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Image
          src={imageUrl}
          alt={`${timePeriod} background`}
          width={1600}
          height={400}
          sizes="100vw"
          className={`w-full h-full object-contain transition-all duration-1000 ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Loading placeholder — pulses 3 times then holds steady */}
        {!imageLoaded && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: 2, ease: 'easeInOut' }}
          />
        )}

        {/* Dark overlay for text readability */}
        <div className={`absolute inset-0 ${overlay}`} />
      </div>

      {/* Subtle animated shimmer effect */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-shimmer" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 p-8 text-center">
        {/* Animated Greeting */}
        <div className="mb-6">
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black ${textColor} leading-tight tracking-tight font-serif`}
            style={{
              textShadow: '0 2px 20px rgba(0,0,0,0.8), 0 4px 40px rgba(0,0,0,0.6)',
              fontFamily: '"Playfair Display", "Georgia", serif'
            }}
          >
            <span
              className="inline-block animate-slide-in-left"
              style={{ animationDelay: '0.2s' }}
            >
              {greetingText}
            </span>
            {userName && (
              <span
                className="inline-block animate-slide-in-right font-black"
                style={{ animationDelay: '0.6s' }}
              >
                ,{'\u00A0'}{userName}!
              </span>
            )}
          </h1>
        </div>

      </div>

      {/* Children Content */}
      {children && (
        <div className="relative z-10 px-8 pb-8">
          {children}
        </div>
      )}

      {/* Interactive Hover Effects */}
      <div className={`absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
    </div>
  );
}

// Alternative compact version for smaller screens or different contexts
/** Renders a compact time-aware greeting without the summary content. */
export function CompactTimeAwareWelcome({
  greetingText,
  userName,
  className = ''
}: {
  greetingText: string;
  userName?: string;
  currentDate?: string;
  className?: string;
}) {
  const timePeriod = useTimePeriod();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Hourly changing images - get current hour for seed
  const currentHour = useMemo(() => {
    return new Date().getHours();
  }, []);

  // Using Picsum Photos API with hourly seed for changing images
  const imageUrl = `https://picsum.photos/seed/hour-${currentHour}/1200/300`;

  return (
    <div className={`group relative overflow-hidden rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ${className}`}>
      {/* Background Image */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <Image
          src={imageUrl}
          alt={`${timePeriod} background`}
          width={1200}
          height={300}
          sizes="100vw"
          className={`w-full h-full object-cover transition-all duration-1000 ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Loading placeholder — pulses 3 times then holds steady */}
        {!imageLoaded && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900"
            initial={{ opacity: 1 }}
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.5, repeat: 2, ease: 'easeInOut' }}
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
      </div>

      {/* Subtle shimmer effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer" />
      </div>

      <div className="relative z-10 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1
            className="text-white font-black drop-shadow-lg tracking-tight text-xl sm:text-2xl font-serif"
            style={{
              textShadow: '0 2px 12px rgba(0,0,0,0.8)',
              fontFamily: '"Playfair Display", "Georgia", serif'
            }}
          >
            {greetingText}{userName ? `, ${userName}!` : '!'}
          </h1>
        </div>
      </div>
    </div>
  );
}
