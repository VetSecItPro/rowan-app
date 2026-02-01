import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function LocationLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-28" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Map skeleton */}
      <SkeletonLoader className="w-full h-64 rounded-xl" />

      {/* Family members skeleton */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 flex items-center gap-3">
            <SkeletonLoader className="w-10 h-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <SkeletonLoader className="w-32" height="h-5" />
              <SkeletonLoader className="w-48" height="h-4" />
            </div>
            <SkeletonLoader className="w-16" height="h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
