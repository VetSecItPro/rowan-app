'use client';

import { useMemo, useState, useEffect } from 'react';
import { useTimePeriod } from './SmartBackgroundCanvas';

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

  // Generate time-aware floating elements
  useEffect(() => {
    const elementCount = timePeriod === 'morning' ? 8 : timePeriod === 'afternoon' ? 6 : timePeriod === 'evening' ? 10 : 12;
    const newElements = Array.from({ length: elementCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 8,
      size: Math.random() * 20 + 20, // Bigger elements (20-40px)
      speedX: (Math.random() - 0.5) * 1.5,
      speedY: (Math.random() - 0.5) * 1.5,
      opacity: Math.random() * 0.3 + 0.4, // Variable opacity (0.4-0.7)
      rotation: Math.random() * 360
    }));
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

  // SVG Components for each time period
  const SunIcon = ({ size, className = '' }: { size: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="5" fill="currentColor" className="text-yellow-300"/>
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-yellow-200"/>
    </svg>
  );

  const CloudIcon = ({ size, className = '' }: { size: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"
            fill="currentColor" className="text-white/80"/>
    </svg>
  );

  const StarIcon = ({ size, className = '' }: { size: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <polygon points="12,2 15,8.5 22,8.5 16.5,13.5 18.5,20 12,16 5.5,20 7.5,13.5 2,8.5 9,8.5"
               fill="currentColor" className="text-yellow-100"/>
    </svg>
  );

  const MoonIcon = ({ size, className = '' }: { size: number; className?: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="currentColor" className="text-slate-200"/>
    </svg>
  );

  // Get the appropriate icon component for current time period
  const getTimeIcon = (element: any) => {
    const iconProps = {
      size: element.size,
      className: `opacity-${Math.round(element.opacity * 100)} transition-all duration-1000 ${
        isHovered ? 'scale-125' : ''
      }`
    };

    switch (timePeriod) {
      case 'morning':
        return <SunIcon {...iconProps} />;
      case 'afternoon':
        return <CloudIcon {...iconProps} />;
      case 'evening':
        return Math.random() > 0.5 ? <StarIcon {...iconProps} /> : <SunIcon {...iconProps} />;
      case 'night':
        return Math.random() > 0.7 ? <MoonIcon {...iconProps} /> : <StarIcon {...iconProps} />;
      default:
        return <StarIcon {...iconProps} />;
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

      {/* Time-Aware Floating Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {elements.map((element) => (
          <div
            key={element.id}
            className={`absolute animate-float-elegant transition-all duration-1000 ${
              timePeriod === 'morning' ? 'animate-bounce-gentle' :
              timePeriod === 'afternoon' ? 'animate-drift' :
              timePeriod === 'evening' ? 'animate-twinkle' :
              'animate-sparkle'
            }`}
            style={{
              left: `${element.x}%`,
              top: `${element.y}%`,
              animationDelay: `${element.delay}s`,
              animationDuration: `${timePeriod === 'morning' ? 3 + element.delay * 0.5 :
                                 timePeriod === 'afternoon' ? 8 + element.delay * 0.3 :
                                 4 + element.delay * 0.4}s`,
              transform: `translate(${element.speedX * 15}px, ${element.speedY * 15}px) rotate(${element.rotation}deg)`,
              filter: timePeriod === 'night' ? `drop-shadow(0 0 ${element.size/2}px rgba(255,255,255,0.5))` :
                      timePeriod === 'morning' ? `drop-shadow(0 0 ${element.size/3}px rgba(255,215,0,0.6))` :
                      `drop-shadow(0 0 ${element.size/4}px rgba(255,255,255,0.3))`
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
        <div className="mb-6">
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black text-white ${textGlow} leading-none tracking-tight font-serif`}>
            <span
              className="inline-block animate-slide-in-left bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent"
              style={{
                animationDelay: '0.2s',
                textShadow: '0 0 40px rgba(255,255,255,0.3), 0 0 80px rgba(255,255,255,0.1)',
                fontFamily: '"Playfair Display", "Georgia", serif'
              }}
            >
              {greetingText}
            </span>
            {userName && (
              <>
                <span
                  className="inline-block animate-slide-in-right bg-gradient-to-r from-white via-white/95 to-white/85 bg-clip-text text-transparent font-black"
                  style={{
                    animationDelay: '0.6s',
                    textShadow: '0 0 60px rgba(255,255,255,0.4), 0 0 120px rgba(255,255,255,0.15)',
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
        <div className="flex flex-col items-center justify-center">
          <div
            className="text-white/90 text-xl font-semibold animate-fade-in-up tracking-wide mb-2"
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
            className="text-white/70 text-lg font-medium animate-fade-in-up"
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