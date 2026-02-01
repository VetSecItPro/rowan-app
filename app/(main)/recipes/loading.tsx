import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function RecipesLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-28" height="h-8" />
          <SkeletonLoader className="w-44" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Search skeleton */}
      <SkeletonLoader className="w-full h-12 rounded-lg" />

      {/* Recipe cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl overflow-hidden">
            <SkeletonLoader className="w-full h-40" />
            <div className="p-4 space-y-2">
              <SkeletonLoader className="w-3/4" height="h-5" />
              <SkeletonLoader className="w-1/2" height="h-4" />
              <div className="flex gap-2 mt-2">
                <SkeletonLoader className="w-16 h-6 rounded-full" />
                <SkeletonLoader className="w-16 h-6 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
