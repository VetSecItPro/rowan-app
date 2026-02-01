import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function ReportsLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-28" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
        <SkeletonLoader className="w-32 h-10 rounded-lg" />
      </div>

      {/* Chart skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-6">
            <SkeletonLoader className="w-32 mb-4" height="h-5" />
            <SkeletonLoader className="w-full h-48 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
