import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function MealsLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-24" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
        <div className="flex gap-2">
          <SkeletonLoader className="w-28 h-10 rounded-lg" />
          <SkeletonLoader className="w-28 h-10 rounded-lg" />
        </div>
      </div>

      {/* View toggle skeleton */}
      <div className="flex gap-2">
        <SkeletonLoader className="w-24 h-9 rounded-lg" />
        <SkeletonLoader className="w-24 h-9 rounded-lg" />
      </div>

      {/* Week calendar skeleton */}
      <div className="bg-gray-800 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <SkeletonLoader className="w-8 mx-auto" height="h-4" />
              <SkeletonLoader className="w-10 h-10 mx-auto rounded-full" />
              <div className="space-y-1">
                <SkeletonLoader height="h-12 rounded-lg" />
                <SkeletonLoader height="h-12 rounded-lg" />
                <SkeletonLoader height="h-12 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recipe cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl overflow-hidden shadow-sm">
            <SkeletonLoader className="w-full h-40" />
            <div className="p-4 space-y-2">
              <SkeletonLoader className="w-3/4" height="h-5" />
              <SkeletonLoader className="w-1/2" height="h-4" />
              <div className="flex gap-2 mt-2">
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
