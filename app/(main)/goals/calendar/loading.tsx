import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function GoalsCalendarLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-36" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
        <div className="flex gap-2">
          <SkeletonLoader className="w-10 h-10 rounded-lg" />
          <SkeletonLoader className="w-10 h-10 rounded-lg" />
        </div>
      </div>

      {/* Month/Year selector skeleton */}
      <div className="flex items-center justify-between bg-gray-800 rounded-xl p-4">
        <SkeletonLoader className="w-10 h-10 rounded-lg" />
        <SkeletonLoader className="w-32" height="h-6" />
        <SkeletonLoader className="w-10 h-10 rounded-lg" />
      </div>

      {/* Calendar grid skeleton */}
      <div className="bg-gray-800 rounded-xl p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {[...Array(7)].map((_, i) => (
            <SkeletonLoader key={i} className="h-8" />
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square">
              <SkeletonLoader className="w-full h-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming milestones skeleton */}
      <div className="space-y-3">
        <SkeletonLoader className="w-40" height="h-6" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <SkeletonLoader className="w-3/4" height="h-5" />
            <SkeletonLoader className="w-1/2 mt-2" height="h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
