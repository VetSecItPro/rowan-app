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
        <img
          src={imageUrl}
          alt={`${timePeriod} background`}
          className={`w-full h-full object-contain transition-all duration-1000 ${
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

      {/* Weather Widget - Flush right edge, blends with black borders */}
      <div className="absolute bottom-0 right-0 z-20 opacity-80 hover:opacity-100 transition-all duration-300">
        <div className="backdrop-blur-sm bg-black/60 rounded-tl-lg p-3 border-l border-t border-white/10 shadow-lg shadow-black/50">
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
  currentDate,
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
        <img
          src={imageUrl}
          alt={`${timePeriod} background`}
          className={`w-full h-full object-cover transition-all duration-1000 ${
            imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          onLoad={() => setImageLoaded(true)}
        />

        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 animate-pulse" />
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
          {currentDate && (
            <p className="text-white/80 text-sm sm:text-base mt-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              {currentDate}
            </p>
          )}
        </div>
        <div className="text-white/70 text-sm hidden sm:block" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
          {new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
        </div>
      </div>

      {/* Weather Widget - Compact version */}
      <div className="absolute bottom-0 right-0 z-20 opacity-70 hover:opacity-100 transition-opacity duration-300">
        <div className="backdrop-blur-sm bg-black/50 rounded-tl-lg px-2 py-1.5 border-l border-t border-white/10">
          <WeatherBadge
            eventTime={new Date().toISOString()}
            location="Wylie, Texas, United States"
            display="compact"
          />
        </div>
      </div>
    </div>
  );
}
