import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function BadgesLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-28" height="h-8" />
          <SkeletonLoader className="w-44" height="h-5" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 shadow-sm">
            <SkeletonLoader className="w-20" height="h-4" />
            <SkeletonLoader className="w-12 mt-2" height="h-8" />
          </div>
        ))}
      </div>

      {/* Badges grid skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 shadow-sm text-center">
            <SkeletonLoader className="w-16 h-16 rounded-full mx-auto" />
            <SkeletonLoader className="w-3/4 mx-auto mt-3" height="h-5" />
            <SkeletonLoader className="w-1/2 mx-auto mt-2" height="h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
