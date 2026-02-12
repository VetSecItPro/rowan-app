import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function ProjectDetailsLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-48" height="h-8" />
          <SkeletonLoader className="w-32" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Project summary skeleton */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <SkeletonLoader className="w-20" height="h-4" />
              <SkeletonLoader className="w-24 mt-2" height="h-8" />
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <SkeletonLoader className="w-full h-3 rounded-full" />
        <div className="flex justify-between mt-2">
          <SkeletonLoader className="w-20" height="h-4" />
          <SkeletonLoader className="w-20" height="h-4" />
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b border-gray-700">
        {[...Array(4)].map((_, i) => (
          <SkeletonLoader key={i} className="w-24 h-10" />
        ))}
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <SkeletonLoader className="w-3/4" height="h-5" />
                <SkeletonLoader className="w-1/2" height="h-4" />
              </div>
              <SkeletonLoader className="w-8 h-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
