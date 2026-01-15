'use client';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number; // diameter in pixels
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  className?: string;
}

export function CircularProgress({
  progress,
  size = 48,
  strokeWidth = 4,
  color = 'emerald',
  backgroundColor = 'gray',
  showPercentage = true,
  className = '',
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colorClasses = {
    emerald: 'stroke-emerald-500',
    blue: 'stroke-blue-500',
    purple: 'stroke-purple-500',
    pink: 'stroke-pink-500',
    orange: 'stroke-orange-500',
    green: 'stroke-green-500',
  };

  const bgColorClasses = {
    gray: 'stroke-gray-700',
    emerald: 'stroke-emerald-900',
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={bgColorClasses[backgroundColor as keyof typeof bgColorClasses] || bgColorClasses.gray}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={`${colorClasses[color as keyof typeof colorClasses] || colorClasses.emerald} transition-all duration-500 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {showPercentage && (
        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-300">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
}
