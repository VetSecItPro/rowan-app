'use client';

import { useEffect, useState } from 'react';

interface CircularProgressProps {
  /** Progress value from 0-100 */
  value: number;
  /** Size of the circular progress in pixels */
  size?: number;
  /** Thickness of the progress ring */
  strokeWidth?: number;
  /** Primary label (usually percentage) */
  label?: string;
  /** Secondary label below primary */
  subLabel?: string;
  /** Custom color override (defaults to color-coded based on progress) */
  color?: string;
  /** Whether to show the percentage inside */
  showPercentage?: boolean;
  /** Animation duration in milliseconds */
  animationDuration?: number;
}

export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  subLabel,
  color,
  showPercentage = true,
  animationDuration = 1000,
}: CircularProgressProps) {
  const [progress, setProgress] = useState(0);

  // Animate progress on mount and when value changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  // Calculate circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  // Color-coded progress colors (matching GoalCard system)
  const getProgressColor = () => {
    if (color) return color;
    if (progress === 0) return 'rgb(156, 163, 175)'; // gray-400
    if (progress <= 25) return 'rgb(96, 165, 250)'; // blue-400
    if (progress <= 50) return 'rgb(59, 130, 246)'; // blue-500
    if (progress <= 75) return 'rgb(34, 197, 94)'; // green-500
    if (progress < 100) return 'rgb(34, 197, 94)'; // green-500
    return 'rgb(22, 163, 74)'; // green-600
  };

  // Get gradient ID based on progress
  const getGradientId = () => {
    if (color) return 'custom-gradient';
    if (progress === 0) return 'gray-gradient';
    if (progress <= 25) return 'blue-light-gradient';
    if (progress <= 50) return 'blue-gradient';
    if (progress <= 75) return 'green-light-gradient';
    return 'green-gradient';
  };

  // Get text color for percentage display
  const getTextColor = () => {
    if (progress >= 75) return 'text-green-600 dark:text-green-400';
    if (progress >= 50) return 'text-blue-600 dark:text-blue-400';
    if (progress >= 25) return 'text-blue-500 dark:text-blue-300';
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Define gradients for different progress states */}
        <defs>
          <linearGradient id="gray-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(209, 213, 219)" />
            <stop offset="100%" stopColor="rgb(156, 163, 175)" />
          </linearGradient>
          <linearGradient id="blue-light-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(147, 197, 253)" />
            <stop offset="100%" stopColor="rgb(96, 165, 250)" />
          </linearGradient>
          <linearGradient id="blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(96, 165, 250)" />
            <stop offset="100%" stopColor="rgb(59, 130, 246)" />
          </linearGradient>
          <linearGradient id="green-light-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(59, 130, 246)" />
            <stop offset="100%" stopColor="rgb(34, 197, 94)" />
          </linearGradient>
          <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(74, 222, 128)" />
            <stop offset="100%" stopColor="rgb(22, 163, 74)" />
          </linearGradient>
          {color && (
            <linearGradient id="custom-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
          )}
        </defs>

        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          className="text-gray-200/50 dark:text-gray-700/50"
        />

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={`url(#${getGradientId()})`}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: `stroke-dashoffset ${animationDuration}ms ease-out`,
          }}
          className="drop-shadow-sm"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showPercentage && (
          <span className={`text-2xl font-bold ${getTextColor()} transition-colors duration-300`}>
            {Math.round(progress)}%
          </span>
        )}
        {label && !showPercentage && (
          <span className={`text-xl font-bold ${getTextColor()} transition-colors duration-300`}>
            {label}
          </span>
        )}
        {subLabel && (
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center px-2">
            {subLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// Variant: Multi-ring progress (like Apple Watch activity rings)
interface MultiRingProgressProps {
  rings: Array<{
    value: number;
    color: string;
    label: string;
  }>;
  size?: number;
  strokeWidth?: number;
}

export function MultiRingProgress({
  rings,
  size = 150,
  strokeWidth = 6,
}: MultiRingProgressProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative inline-flex items-center justify-center">
      {rings.map((ring, index) => {
        const ringSize = size - index * (strokeWidth + 4);
        const radius = (ringSize - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const progress = mounted ? ring.value : 0;
        const offset = circumference - (progress / 100) * circumference;

        return (
          <svg
            key={index}
            width={ringSize}
            height={ringSize}
            className="absolute transform -rotate-90"
            style={{
              top: `${(size - ringSize) / 2}px`,
              left: `${(size - ringSize) / 2}px`,
            }}
          >
            {/* Background circle */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              strokeWidth={strokeWidth}
              stroke="currentColor"
              fill="none"
              className="text-gray-200/30 dark:text-gray-700/30"
            />

            {/* Progress circle */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              strokeWidth={strokeWidth}
              stroke={ring.color}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{
                transition: 'stroke-dashoffset 1000ms ease-out',
              }}
              className="drop-shadow-md"
            />
          </svg>
        );
      })}

      {/* Center legend */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            Progress
          </div>
          <div className="flex gap-2 mt-2">
            {rings.map((ring, index) => (
              <div key={index} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: ring.color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {Math.round(ring.value)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
