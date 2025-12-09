import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function TasksLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-24" height="h-8" />
          <SkeletonLoader className="w-40" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[...Array(5)].map((_, i) => (
          <SkeletonLoader key={i} className="w-20 h-8 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Task cards skeleton */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <SkeletonLoader className="w-5 h-5 rounded flex-shrink-0 mt-1" />
              <div className="flex-1 space-y-2">
                <SkeletonLoader className="w-3/4" height="h-5" />
                <SkeletonLoader className="w-1/2" height="h-4" />
                <div className="flex gap-2 mt-2">
                  <SkeletonLoader className="w-16 h-6 rounded-full" />
                  <SkeletonLoader className="w-20 h-6 rounded-full" />
                </div>
              </div>
              <SkeletonLoader className="w-8 h-8 rounded-full flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
