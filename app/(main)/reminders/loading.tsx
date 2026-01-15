import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function RemindersLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-32" height="h-8" />
          <SkeletonLoader className="w-44" height="h-5" />
        </div>
        <SkeletonLoader className="w-32 h-10 rounded-lg" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[...Array(4)].map((_, i) => (
          <SkeletonLoader key={i} className="w-24 h-8 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Reminder cards skeleton */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <SkeletonLoader className="w-6 h-6 rounded flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <SkeletonLoader className="w-2/3" height="h-5" />
                <div className="flex items-center gap-2">
                  <SkeletonLoader className="w-4 h-4 rounded" />
                  <SkeletonLoader className="w-32" height="h-4" />
                </div>
                <div className="flex gap-2">
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
