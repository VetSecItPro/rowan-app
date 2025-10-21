interface SkeletonLoaderProps {
  count?: number;
  className?: string;
  height?: string;
  width?: string;
  variant?: string;
}

export function SkeletonLoader({ count = 1, className = '', height = 'h-20', width = '', variant }: SkeletonLoaderProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${height} ${width} bg-white/20 dark:bg-gray-800/20 backdrop-blur-xl border border-white/10 dark:border-gray-700/10 rounded-2xl animate-pulse`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-white/20 dark:bg-gray-700/20 rounded w-3/4" />
        <div className="h-4 bg-white/20 dark:bg-gray-700/20 rounded w-1/2" />
        <div className="h-4 bg-white/20 dark:bg-gray-700/20 rounded w-5/6" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-16 bg-white/20 dark:bg-gray-800/20 backdrop-blur-xl border border-white/10 dark:border-gray-700/10 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-white/20 dark:bg-gray-700/20 rounded animate-pulse ${
            index === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}
