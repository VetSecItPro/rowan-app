export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
  );
}

export function MealCardSkeleton() {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
      <div className="flex items-start gap-4">
        <Skeleton className="w-24 h-24 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CalendarDaySkeleton() {
  return (
    <div className="min-h-[300px] rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
      <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Skeleton className="h-4 w-12 mb-1" />
        <Skeleton className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}

export function RecipeCardSkeleton() {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <Skeleton className="w-full h-48" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
    </div>
  );
}

export function GoalCardSkeleton() {
  return (
    <div className="bg-white/10 dark:bg-black/40 backdrop-blur-lg backdrop-saturate-150 border border-white/20 dark:border-white/10 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <Skeleton className="min-w-[44px] min-h-[44px] rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <Skeleton className="h-6 w-2/3" />
          </div>
          <Skeleton className="h-4 w-full ml-10" />
          <Skeleton className="h-4 w-3/4 ml-10" />
        </div>
        <Skeleton className="min-w-[44px] min-h-[44px] rounded-lg flex-shrink-0" />
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

export function MilestoneCardSkeleton() {
  return (
    <div className="bg-white/10 dark:bg-black/40 backdrop-blur-lg backdrop-saturate-150 border border-white/20 dark:border-white/10 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-4">
        <Skeleton className="min-w-[44px] min-h-[44px] rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
            <Skeleton className="h-6 w-3/4" />
          </div>
          <Skeleton className="h-4 w-full ml-10" />
        </div>
        <Skeleton className="min-w-[44px] min-h-[44px] rounded-lg flex-shrink-0" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="relative h-3 rounded-full">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl" />
      </div>
      <div className="flex items-end justify-between">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
