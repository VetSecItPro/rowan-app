interface SkeletonLoaderProps {
  count?: number;
  className?: string;
  height?: string;
  width?: string;
}

/** Renders animated skeleton loading placeholders. */
export function SkeletonLoader({ count = 1, className = '', height = 'h-20', width = '' }: SkeletonLoaderProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`${height} ${width} bg-gray-800/30 border border-gray-700/10 rounded-2xl animate-pulse`}
        />
      ))}
    </div>
  );
}

/** Renders a skeleton loading placeholder shaped like a content card. */
export function SkeletonCard() {
  return (
    <div className="bg-gray-800/40 border border-gray-700/20 rounded-2xl p-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-gray-700/20 rounded w-3/4" />
        <div className="h-4 bg-gray-700/20 rounded w-1/2" />
        <div className="h-4 bg-gray-700/20 rounded w-5/6" />
      </div>
    </div>
  );
}

/** Renders a skeleton loading placeholder shaped like a data table. */
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-16 bg-gray-800/30 border border-gray-700/10 rounded-xl animate-pulse"
        />
      ))}
    </div>
  );
}

/** Renders skeleton loading placeholder lines for text content. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-700/20 rounded animate-pulse ${
            index === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}
