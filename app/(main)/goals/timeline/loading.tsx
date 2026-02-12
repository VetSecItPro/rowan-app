import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function GoalsTimelineLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-28" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[...Array(4)].map((_, i) => (
          <SkeletonLoader key={i} className="w-24 h-8 rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Timeline items skeleton */}
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <SkeletonLoader className="w-10 h-10 rounded-full flex-shrink-0" />
              {i < 4 && <div className="w-0.5 h-full bg-gray-700 mt-2" />}
            </div>
            <div className="flex-1 pb-6">
              <div className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <SkeletonLoader className="w-3/4" height="h-6" />
                  <SkeletonLoader className="w-20" height="h-5" />
                </div>
                <SkeletonLoader className="w-1/2" height="h-4" />

                {/* Milestone items */}
                <div className="space-y-2 mt-4">
                  {[...Array(2)].map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <SkeletonLoader className="w-4 h-4 rounded" />
                      <SkeletonLoader className="flex-1" height="h-4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
