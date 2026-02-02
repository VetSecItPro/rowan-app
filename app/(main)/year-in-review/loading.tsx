// FE: Loading skeleton for year-in-review — FIX-062
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function YearInReviewLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-40" height="h-8" />
          <SkeletonLoader className="w-56" height="h-5" />
        </div>
      </div>

      {/* Highlight cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 shadow-sm">
            <SkeletonLoader className="w-20" height="h-4" />
            <SkeletonLoader className="w-16 mt-2" height="h-8" />
          </div>
        ))}
      </div>

      {/* Chart sections skeleton */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-xl p-6 shadow-sm">
          <SkeletonLoader className="w-48 mb-4" height="h-6" />
          <SkeletonLoader className="w-full h-48 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
