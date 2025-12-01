'use client';

import { useMemo, useState, useEffect } from 'react';
import { useTimePeriod } from './SmartBackgroundCanvas';
import { WeatherBadge } from '@/components/calendar/WeatherBadge';

interface TimeAwareWelcomeBoxProps {
  greetingText: string;
  userName?: string;
  currentDate: string;
  className?: string;
  children?: React.ReactNode;
}

export function TimeAwareWelcomeBox({
  greetingText,
  userName,
  currentDate,
  className = '',
  children
}: TimeAwareWelcomeBoxProps) {
  const timePeriod = useTimePeriod();
  const [imageLoaded, setImageLoaded] = useState(false);

  // Time-specific photo search queries for Unsplash
  const timeBasedConfig = useMemo(() => {
    switch (timePeriod) {
      case 'morning':
        return {
          query: 'morning,sunrise,dawn,coffee,peaceful',
          overlay: 'bg-gradient-to-t from-black/60 via-black/30 to-black/20',
          textColor: 'text-white',
        };
      case 'afternoon':
        return {
          query: 'afternoon,sunny,bright,daylight,nature',
          overlay: 'bg-gradient-to-t from-black/60 via-black/30 to-black/20',
          textColor: 'text-white',
        };
      case 'evening':
        return {
          query: 'sunset,evening,dusk,golden-hour,sky',
          overlay: 'bg-gradient-to-t from-black/70 via-black/40 to-black/20',
          textColor: 'text-white',
        };
      case 'night':
        return {
          query: 'night,stars,moon,darkness,peaceful',
          overlay: 'bg-gradient-to-t from-black/70 via-black/40 to-black/20',
          textColor: 'text-white',
        };
      default:
        return {
          query: 'nature,peaceful,scenic,beautiful',
          overlay: 'bg-gradient-to-t from-black/60 via-black/30 to-black/20',
          textColor: 'text-white',
        };
    }
  }, [timePeriod]);

  const { query, overlay, textColor } = timeBasedConfig;

  // Using Picsum Photos API for reliable, fast image loading
  // Seed ensures same image per time period for consistency
  const getSeed = () => {
    switch (timePeriod) {
      case 'morning': return 'morning-sunrise';
      case 'afternoon': return 'afternoon-sunny';
      case 'evening': return 'evening-sunset';
      case 'night': return 'night-stars';
      default: return 'default-nature';
    }
  };

  const imageUrl = `https://picsum.photos/seed/${getSeed()}/1600/400`;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl transition-all duration-700 hover:scale-[1.01] shadow-2xl ${className}`}
    >
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={`${timePeriod} background`}
          className={`w-full h-full object-cover transition-all duration-1000 ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Loading placeholder */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-900 to-black animate-pulse" />
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

        {/* Enhanced Date & Time Display */}
        <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
          <div
            className={`${textColor} text-xl sm:text-2xl font-semibold animate-fade-in-up tracking-wide`}
            style={{
              animationDelay: '0.8s',
              textShadow: '0 2px 12px rgba(0,0,0,0.8)'
            }}
          >
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div
            className={`${textColor}/90 text-lg sm:text-xl font-medium animate-fade-in-up`}
            style={{
              animationDelay: '1s',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)'
            }}
          >
            {new Date().toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })}
          </div>
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

      {/* Weather Widget */}
      <div className="absolute bottom-4 right-4 z-20 opacity-95 hover:opacity-100 transition-all duration-300">
        <div className="backdrop-blur-md bg-black/40 rounded-lg p-3 border border-white/30 shadow-lg shadow-black/30">
          <WeatherBadge
            eventTime={new Date().toISOString()}
            location="Wylie, Texas, United States"
            display="medium"
          />
        </div>
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
  const [imageLoaded, setImageLoaded] = useState(false);

  const timeBasedConfig = useMemo(() => {
    switch (timePeriod) {
      case 'morning':
        return { query: 'morning,sunrise,coffee' };
      case 'afternoon':
        return { query: 'afternoon,sunny,bright' };
      case 'evening':
        return { query: 'sunset,evening,dusk' };
      case 'night':
        return { query: 'night,stars,moon' };
      default:
        return { query: 'nature,peaceful' };
    }
  }, [timePeriod]);

  const { query } = timeBasedConfig;

  const getSeed = () => {
    switch (timePeriod) {
      case 'morning': return 'morning-sunrise';
      case 'afternoon': return 'afternoon-sunny';
      case 'evening': return 'evening-sunset';
      case 'night': return 'night-stars';
      default: return 'default-nature';
    }
  };

  const imageUrl = `https://picsum.photos/seed/${getSeed()}/800/200`;

  return (
    <div className={`relative overflow-hidden rounded-xl shadow-lg ${className}`}>
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={imageUrl}
          alt={`${timePeriod} background`}
          className={`w-full h-full object-cover transition-opacity duration-1000 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
        />

        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 animate-pulse" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-black/20" />
      </div>

      <div className="relative z-10 p-4">
        <span
          className="text-white font-black drop-shadow-lg tracking-tight text-2xl font-serif"
          style={{
            textShadow: '0 2px 12px rgba(0,0,0,0.8)',
            fontFamily: '"Playfair Display", "Georgia", serif'
          }}
        >
          {greetingText}{userName ? `, ${userName}!` : '!'}
        </span>
      </div>
    </div>
  );
}
