'use client';

import { useMemo, useState, useEffect } from 'react';
import { useTimePeriod } from './SmartBackgroundCanvas';
import { WeatherBadge } from '@/components/calendar/WeatherBadge';
import {
  SunIcon,
  CloudIcon,
  SparklesIcon,
  MoonIcon
} from '@heroicons/react/24/outline';

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
  const [isHovered, setIsHovered] = useState(false);
  const [elements, setElements] = useState<Array<{id: number, x: number, y: number, delay: number, size: number, speedX: number, speedY: number, opacity: number, rotation: number}>>([]);

  // Generate elegant corner accents - strategically positioned, never overlapping text
  useEffect(() => {
    // Only 4 elegant corner elements - one in each corner, far from center
    const newElements = [
      // Top-left corner
      { id: 0, x: 8, y: 12, delay: 0, size: 48, speedX: 0, speedY: 0, opacity: 0.25, rotation: 0 },
      // Top-right corner
      { id: 1, x: 88, y: 10, delay: 1, size: 40, speedX: 0, speedY: 0, opacity: 0.2, rotation: 45 },
      // Bottom-left corner
      { id: 2, x: 6, y: 85, delay: 2, size: 44, speedX: 0, speedY: 0, opacity: 0.22, rotation: 180 },
      // Bottom-right (above weather) - smaller and higher to avoid weather widget
      { id: 3, x: 85, y: 55, delay: 3, size: 36, speedX: 0, speedY: 0, opacity: 0.18, rotation: 270 },
    ];
    setElements(newElements);
  }, [timePeriod]);

  // Time-specific styling and configuration with enhanced atmospheric gradients
  const timeBasedConfig = useMemo(() => {
    switch (timePeriod) {
      case 'morning':
        return {
          gradient: 'linear-gradient(135deg, rgba(255, 159, 67, 0.9) 0%, rgba(255, 190, 11, 0.85) 25%, rgba(255, 235, 59, 0.8) 50%, rgba(135, 206, 235, 0.7) 100%)', // Sunrise
          glowColor: 'shadow-amber-400/40',
          textGlow: 'drop-shadow-lg',
          accent: 'from-yellow-300/30 to-orange-300/30',
        };
      case 'afternoon':
        return {
          gradient: 'linear-gradient(135deg, rgba(30, 144, 255, 0.9) 0%, rgba(135, 206, 250, 0.85) 30%, rgba(255, 255, 255, 0.8) 60%, rgba(173, 216, 230, 0.7) 100%)', // Clear blue sky
          glowColor: 'shadow-sky-400/40',
          textGlow: 'drop-shadow-lg',
          accent: 'from-sky-300/30 to-blue-300/30',
        };
      case 'evening':
        return {
          gradient: 'linear-gradient(135deg, rgba(255, 94, 77, 0.9) 0%, rgba(255, 154, 0, 0.85) 25%, rgba(142, 68, 173, 0.8) 65%, rgba(74, 0, 224, 0.7) 100%)', // Sunset
          glowColor: 'shadow-orange-400/40',
          textGlow: 'drop-shadow-lg',
          accent: 'from-orange-300/30 to-purple-300/30',
        };
      case 'night':
        return {
          gradient: 'linear-gradient(135deg, rgba(25, 25, 112, 0.95) 0%, rgba(72, 61, 139, 0.9) 30%, rgba(30, 30, 60, 0.85) 70%, rgba(0, 0, 0, 0.8) 100%)', // Deep night
          glowColor: 'shadow-indigo-500/50',
          textGlow: 'drop-shadow-lg',
          accent: 'from-indigo-400/30 to-purple-400/30',
        };
      default:
        return {
          gradient: 'linear-gradient(135deg, rgba(142, 68, 173, 0.9), rgba(147, 51, 234, 0.8), rgba(192, 132, 252, 0.7))',
          glowColor: 'shadow-purple-500/30',
          textGlow: 'drop-shadow-lg',
          accent: 'from-purple-400/30 to-violet-400/30',
        };
    }
  }, [timePeriod]);

  const { gradient, glowColor, textGlow, accent } = timeBasedConfig;

  // Using sophisticated Heroicons instead of basic SVG components

  // Get the appropriate icon for each corner - one unique icon per corner
  const getTimeIcon = (element: any) => {
    const opacity = element.opacity * 100;
    const iconProps = {
      width: element.size,
      height: element.size,
      className: `transition-all duration-700 ${
        isHovered ? 'scale-110 opacity-40' : `opacity-${opacity >= 25 ? 25 : 20}`
      } ${
        timePeriod === 'morning' ? 'text-yellow-200/40 stroke-[1.5]' :
        timePeriod === 'afternoon' ? 'text-sky-200/40 stroke-[1.5]' :
        timePeriod === 'evening' ? 'text-orange-200/40 stroke-[1.5]' :
        'text-indigo-200/40 stroke-[2]'
      }`
    };

    // Assign one unique icon to each corner based on time of day
    switch (timePeriod) {
      case 'morning':
        // Morning: Sun in corners with subtle rays
        return element.id % 2 === 0 ? <SunIcon {...iconProps} /> : <SparklesIcon {...iconProps} />;
      case 'afternoon':
        // Afternoon: Sun and clouds alternating
        return element.id % 2 === 0 ? <SunIcon {...iconProps} /> : <CloudIcon {...iconProps} />;
      case 'evening':
        // Evening: Sunset sparkles and early moon
        return element.id % 2 === 0 ? <SparklesIcon {...iconProps} /> : <MoonIcon {...iconProps} />;
      case 'night':
        // Night: Moon and stars
        return element.id % 2 === 0 ? <MoonIcon {...iconProps} /> : <SparklesIcon {...iconProps} />;
      default:
        return <SparklesIcon {...iconProps} />;
    }
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-8 transition-all duration-700 hover:scale-[1.02] ${glowColor} shadow-2xl ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: gradient,
      }}
    >
      {/* Animated Background Layers */}
      <div className="absolute inset-0">
        {/* Secondary accent layer */}
        <div
          className={`absolute inset-0 bg-gradient-to-tr ${accent} opacity-40 animate-pulse`}
          style={{ animationDuration: '6s', animationDelay: '1s' }}
        />

        {/* Dynamic wave overlay */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer" />
        </div>
      </div>

      {/* Elegant Corner Accents - Fixed positions, subtle animations */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {elements.map((element) => (
          <div
            key={element.id}
            className="absolute animate-pulse"
            style={{
              left: `${element.x}%`,
              top: `${element.y}%`,
              animationDelay: `${element.delay}s`,
              animationDuration: '8s',
              transform: `rotate(${element.rotation}deg)`,
              filter: timePeriod === 'night' ? `drop-shadow(0 0 12px rgba(255,255,255,0.15))` :
                      timePeriod === 'morning' ? `drop-shadow(0 0 10px rgba(255,215,0,0.2))` :
                      timePeriod === 'evening' ? `drop-shadow(0 0 14px rgba(255,140,0,0.2))` :
                      `drop-shadow(0 0 8px rgba(255,255,255,0.15))`
            }}
          >
            {getTimeIcon(element)}
          </div>
        ))}
      </div>

      {/* Geometric Accent Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Floating geometric shapes */}
        <div className="absolute top-6 right-8 w-16 h-16 border border-white/20 rounded-full animate-spin-slow opacity-40" />
        <div className="absolute bottom-8 left-6 w-8 h-8 border border-white/30 rotate-45 animate-pulse opacity-30" />
        <div className="absolute top-1/2 left-8 w-4 h-12 bg-white/10 rounded-full animate-sway opacity-50" />

        {/* Glowing accent lines */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-white/30 to-transparent animate-pulse" />
        <div className="absolute bottom-0 right-1/3 w-full h-px bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center">
        {/* Animated Greeting */}
        <div className="mb-8">
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black text-white ${textGlow} leading-tight tracking-tight font-serif px-2`}>
            <span
              className="inline-block animate-slide-in-left text-white"
              style={{
                animationDelay: '0.2s',
                textShadow: '0 0 40px rgba(255,255,255,0.4), 0 0 80px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)',
                fontFamily: '"Playfair Display", "Georgia", serif'
              }}
            >
              {greetingText}
            </span>
            {userName && (
              <>
                <span
                  className="inline-block animate-slide-in-right text-white font-black"
                  style={{
                    animationDelay: '0.6s',
                    textShadow: '0 0 60px rgba(255,255,255,0.5), 0 0 120px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)',
                    fontFamily: '"Playfair Display", "Georgia", serif'
                  }}
                >
                  ,{'\u00A0'}{userName}!
                </span>
              </>
            )}
          </h1>
        </div>

        {/* Enhanced Date Display */}
        <div className="flex flex-col items-center justify-center gap-4 sm:gap-6">
          <div
            className="text-white/90 text-xl sm:text-2xl font-semibold animate-fade-in-up tracking-wide"
            style={{ animationDelay: '0.8s' }}
          >
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </div>
          <div
            className="text-white/70 text-lg sm:text-xl font-medium animate-fade-in-up"
            style={{ animationDelay: '1s' }}
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
        <div className="relative z-10 mt-6">
          {children}
        </div>
      )}

      {/* Interactive Hover Effects */}
      <div className={`absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

      {/* Ripple Effect on Hover */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-4 border-white/30 rounded-full animate-ripple" />
        </div>
      )}

      {/* Weather Widget - positioned to avoid text and floating elements */}
      <div className="absolute bottom-4 right-4 z-20 opacity-95 hover:opacity-100 transition-all duration-300">
        <div className="backdrop-blur-md bg-black/25 rounded-lg p-3 border border-white/30 shadow-lg shadow-black/20">
          <WeatherBadge
            eventTime={new Date().toISOString()}
            location="Wylie, Texas, United States" // Fallback for development testing
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
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number}>>([]);

  // Generate fewer particles for compact version
  useEffect(() => {
    const particleCount = 5;
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
    }));
    setParticles(newParticles);
  }, []);

  const timeBasedConfig = useMemo(() => {
    switch (timePeriod) {
      case 'morning':
        return {
          gradients: 'from-amber-600/80 to-yellow-500/60',
          particleColor: 'bg-yellow-300/40'
        };
      case 'afternoon':
        return {
          gradients: 'from-sky-600/80 to-cyan-500/60',
          particleColor: 'bg-cyan-300/40'
        };
      case 'evening':
        return {
          gradients: 'from-purple-700/80 to-fuchsia-500/60',
          particleColor: 'bg-fuchsia-300/40'
        };
      case 'night':
        return {
          gradients: 'from-indigo-800/80 to-blue-600/60',
          particleColor: 'bg-blue-200/40'
        };
      default:
        return {
          gradients: 'from-purple-700/80 to-fuchsia-500/60',
          particleColor: 'bg-fuchsia-300/40'
        };
    }
  }, [timePeriod]);

  const { gradients, particleColor } = timeBasedConfig;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-r ${gradients} rounded-xl p-4 shadow-lg backdrop-blur-sm ${className}`}>
      {/* Compact particle system */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute w-1 h-1 rounded-full ${particleColor} animate-float-elegant opacity-60`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.id * 0.8}s`,
              animationDuration: '6s',
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-center gap-3">
        <span
          className="text-white font-black drop-shadow-lg tracking-tight bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent font-serif"
          style={{
            textShadow: '0 0 30px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.15)',
            fontFamily: '"Playfair Display", "Georgia", serif'
          }}
        >
          {greetingText}{userName ? `, ${userName}!` : '!'}
        </span>
      </div>
    </div>
  );
}