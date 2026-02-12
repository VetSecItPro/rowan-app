import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function BudgetGoalsLoading() {
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

      {/* Budget goals cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="space-y-2 flex-1">
                <SkeletonLoader className="w-3/4" height="h-6" />
                <SkeletonLoader className="w-1/2" height="h-4" />
              </div>
              <SkeletonLoader className="w-8 h-8 rounded-full" />
            </div>

            {/* Progress bar */}
            <SkeletonLoader className="w-full h-2 rounded-full mt-4" />
            <div className="flex justify-between mt-1">
              <SkeletonLoader className="w-16" height="h-3" />
              <SkeletonLoader className="w-12" height="h-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
