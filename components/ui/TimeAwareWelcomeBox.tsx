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
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number, size: number, speedX: number, speedY: number, opacity: number}>>([]);

  // Generate enhanced particles on mount
  useEffect(() => {
    const particleCount = 35; // More particles for active, shining effect
    const newParticles = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 8,
      size: Math.random() * 6 + 3, // Bigger particles (3-9px)
      speedX: (Math.random() - 0.5) * 2, // Random horizontal movement
      speedY: (Math.random() - 0.5) * 2, // Random vertical movement
      opacity: Math.random() * 0.4 + 0.6 // Variable opacity (0.6-1.0)
    }));
    setParticles(newParticles);
  }, []);

  // Time-specific styling and configuration
  const timeBasedConfig = useMemo(() => {
    switch (timePeriod) {
      case 'morning':
        return {
          gradient: 'linear-gradient(135deg, rgba(217, 119, 6, 0.9), rgba(249, 115, 22, 0.8), rgba(251, 191, 36, 0.7))',
          particleColor: 'bg-yellow-300/60',
          glowColor: 'shadow-amber-500/30',
          textGlow: 'drop-shadow-lg',
          accent: 'from-yellow-400/40 to-orange-400/40',
        };
      case 'afternoon':
        return {
          gradient: 'linear-gradient(135deg, rgba(2, 132, 199, 0.9), rgba(59, 130, 246, 0.8), rgba(34, 211, 238, 0.7))',
          particleColor: 'bg-cyan-300/60',
          glowColor: 'shadow-blue-500/30',
          textGlow: 'drop-shadow-lg',
          accent: 'from-cyan-400/40 to-blue-400/40',
        };
      case 'evening':
        return {
          gradient: 'linear-gradient(135deg, rgba(126, 34, 206, 0.9), rgba(139, 92, 246, 0.8), rgba(217, 70, 239, 0.7))',
          particleColor: 'bg-fuchsia-300/60',
          glowColor: 'shadow-purple-500/30',
          textGlow: 'drop-shadow-lg',
          accent: 'from-fuchsia-400/40 to-violet-400/40',
        };
      case 'night':
        return {
          gradient: 'linear-gradient(135deg, rgba(30, 58, 138, 0.9), rgba(30, 64, 175, 0.8), rgba(126, 34, 206, 0.7))',
          particleColor: 'bg-blue-200/60',
          glowColor: 'shadow-indigo-500/30',
          textGlow: 'drop-shadow-lg',
          accent: 'from-blue-400/40 to-indigo-400/40',
        };
      default:
        return {
          gradient: 'linear-gradient(135deg, rgba(126, 34, 206, 0.9), rgba(139, 92, 246, 0.8), rgba(217, 70, 239, 0.7))',
          particleColor: 'bg-fuchsia-300/60',
          glowColor: 'shadow-purple-500/30',
          textGlow: 'drop-shadow-lg',
          accent: 'from-fuchsia-400/40 to-violet-400/40',
        };
    }
  }, [timePeriod]);

  const { gradient, particleColor, glowColor, textGlow, accent } = timeBasedConfig;

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

      {/* Enhanced Particle System - More Active and Shining */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`absolute rounded-full ${particleColor} animate-float-elegant transition-all duration-1000 ${
              isHovered ? 'scale-125 opacity-100' : `opacity-${Math.round(particle.opacity * 100)}`
            }`}
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${6 + particle.delay * 0.5}s`, // Faster, more active movement
              transform: `translate(${particle.speedX * 10}px, ${particle.speedY * 10}px)`,
              opacity: particle.opacity,
              boxShadow: `0 0 ${particle.size * 2}px ${particleColor.replace('bg-', '').replace('/60', '').replace('-300', '-400')}/30`,
            }}
          />
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
          <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-bold text-white ${textGlow} leading-tight`}>
            <span className="inline-block animate-slide-in-left" style={{ animationDelay: '0.2s' }}>
              {greetingText}
            </span>
            {userName && (
              <>
                <span className="inline-block animate-slide-in-left" style={{ animationDelay: '0.4s' }}>
                  ,{' '}
                </span>
                <span
                  className="inline-block animate-slide-in-right bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent font-extrabold"
                  style={{ animationDelay: '0.6s' }}
                >
                  {userName}!
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
        <span className="text-white font-semibold drop-shadow-sm">
          {greetingText}{userName ? `, ${userName}!` : '!'}
        </span>
      </div>
    </div>
  );
}