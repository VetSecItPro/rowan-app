import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function RecipeDetailsLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <SkeletonLoader className="w-3/4" height="h-8" />
          <SkeletonLoader className="w-1/2" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Recipe image skeleton */}
      <SkeletonLoader className="w-full h-64 rounded-xl" />

      {/* Recipe info cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 text-center">
            <SkeletonLoader className="w-8 h-8 mx-auto rounded" />
            <SkeletonLoader className="w-16 mx-auto mt-2" height="h-4" />
            <SkeletonLoader className="w-20 mx-auto mt-1" height="h-5" />
          </div>
        ))}
      </div>

      {/* Ingredients section skeleton */}
      <div className="bg-gray-800 rounded-xl p-6">
        <SkeletonLoader className="w-32" height="h-6" />
        <div className="space-y-2 mt-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <SkeletonLoader className="w-4 h-4 rounded" />
              <SkeletonLoader className="flex-1" height="h-4" />
            </div>
          ))}
        </div>
      </div>

      {/* Instructions section skeleton */}
      <div className="bg-gray-800 rounded-xl p-6">
        <SkeletonLoader className="w-32" height="h-6" />
        <div className="space-y-4 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <SkeletonLoader className="w-8 h-8 rounded-full flex-shrink-0" />
              <SkeletonLoader className="flex-1" height="h-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
