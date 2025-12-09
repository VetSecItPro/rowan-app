import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function ExpensesLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-32" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
        <SkeletonLoader className="w-32 h-10 rounded-lg" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <SkeletonLoader className="w-24" height="h-4" />
            <SkeletonLoader className="w-20 mt-2" height="h-7" />
            <SkeletonLoader className="w-16 mt-1" height="h-3" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        <SkeletonLoader className="w-40 mb-4" height="h-6" />
        <SkeletonLoader className="w-full h-48 rounded-lg" />
      </div>

      {/* Expense list skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SkeletonLoader className="w-10 h-10 rounded-full" />
                <div className="space-y-1">
                  <SkeletonLoader className="w-32" height="h-5" />
                  <SkeletonLoader className="w-20" height="h-4" />
                </div>
              </div>
              <SkeletonLoader className="w-20" height="h-6" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
