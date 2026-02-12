import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function GoalsAnalyticsLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-32" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 shadow-sm">
            <SkeletonLoader className="w-20" height="h-4" />
            <SkeletonLoader className="w-12 mt-2" height="h-8" />
            <SkeletonLoader className="w-16 mt-2" height="h-4" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-6">
            <SkeletonLoader className="w-32" height="h-6" />
            <SkeletonLoader className="w-full h-64 mt-4 rounded" />
          </div>
        ))}
      </div>

      {/* Performance breakdown skeleton */}
      <div className="bg-gray-800 rounded-xl p-6">
        <SkeletonLoader className="w-40" height="h-6" />
        <div className="space-y-3 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <SkeletonLoader className="w-32" height="h-5" />
              <SkeletonLoader className="w-16" height="h-5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
