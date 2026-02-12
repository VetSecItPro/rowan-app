import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function DiscoverRecipesLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-40" height="h-8" />
          <SkeletonLoader className="w-52" height="h-5" />
        </div>
      </div>

      {/* Search and filter skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <SkeletonLoader className="flex-1 h-10 rounded-lg" />
        <SkeletonLoader className="w-full sm:w-32 h-10 rounded-lg" />
        <SkeletonLoader className="w-full sm:w-32 h-10 rounded-lg" />
      </div>

      {/* Filter chips skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[...Array(6)].map((_, i) => (
          <SkeletonLoader key={i} className="w-20 h-8 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Recipe cards grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl overflow-hidden shadow-sm">
            <SkeletonLoader className="w-full h-48" />
            <div className="p-4 space-y-3">
              <SkeletonLoader className="w-3/4" height="h-6" />
              <SkeletonLoader className="w-full" height="h-4" />

              {/* Recipe meta */}
              <div className="flex gap-4 mt-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-center gap-1">
                    <SkeletonLoader className="w-4 h-4" />
                    <SkeletonLoader className="w-12" height="h-4" />
                  </div>
                ))}
              </div>

              {/* Tags */}
              <div className="flex gap-2 mt-3">
                <SkeletonLoader className="w-16 h-6 rounded-full" />
                <SkeletonLoader className="w-20 h-6 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
