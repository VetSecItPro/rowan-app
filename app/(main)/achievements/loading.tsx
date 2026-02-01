import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function AchievementsLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-36" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 text-center">
            <SkeletonLoader className="w-12 h-12 rounded-full mx-auto" />
            <SkeletonLoader className="w-16 mx-auto mt-2" height="h-4" />
          </div>
        ))}
      </div>

      {/* Badge grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 text-center">
            <SkeletonLoader className="w-14 h-14 rounded-full mx-auto" />
            <SkeletonLoader className="w-20 mx-auto mt-2" height="h-4" />
            <SkeletonLoader className="w-16 mx-auto mt-1" height="h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
