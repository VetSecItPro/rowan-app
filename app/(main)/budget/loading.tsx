import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function BudgetLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-24" height="h-8" />
          <SkeletonLoader className="w-44" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Budget summary skeleton */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <SkeletonLoader className="w-32" height="h-6" />
          <SkeletonLoader className="w-24" height="h-8" />
        </div>
        <SkeletonLoader className="w-full h-3 rounded-full" />
        <div className="flex justify-between mt-2">
          <SkeletonLoader className="w-20" height="h-4" />
          <SkeletonLoader className="w-20" height="h-4" />
        </div>
      </div>

      {/* Category cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <SkeletonLoader className="w-8 h-8 rounded-lg" />
                <SkeletonLoader className="w-24" height="h-5" />
              </div>
              <SkeletonLoader className="w-16" height="h-5" />
            </div>
            <SkeletonLoader className="w-full h-2 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
