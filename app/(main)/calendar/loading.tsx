import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function CalendarLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-32" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
        <div className="flex gap-2">
          <SkeletonLoader className="w-24 h-10 rounded-lg" />
          <SkeletonLoader className="w-24 h-10 rounded-lg" />
        </div>
      </div>

      {/* Calendar navigation */}
      <div className="flex items-center justify-between">
        <SkeletonLoader className="w-8 h-8 rounded-full" />
        <SkeletonLoader className="w-40" height="h-6" />
        <SkeletonLoader className="w-8 h-8 rounded-full" />
      </div>

      {/* Calendar grid skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center">
              <SkeletonLoader className="w-8 mx-auto" height="h-4" />
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <div key={i} className="aspect-square p-1 rounded-lg border border-gray-100 dark:border-gray-700">
              <SkeletonLoader className="w-6" height="h-4" />
              <div className="mt-1 space-y-1">
                <SkeletonLoader height="h-2" />
                <SkeletonLoader height="h-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
