import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function VendorsLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-28" height="h-8" />
          <SkeletonLoader className="w-44" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Search and filter skeleton */}
      <div className="flex gap-2">
        <SkeletonLoader className="flex-1 h-10 rounded-lg" />
        <SkeletonLoader className="w-24 h-10 rounded-lg" />
      </div>

      {/* Vendors grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <SkeletonLoader className="w-12 h-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <SkeletonLoader className="w-3/4" height="h-5" />
                <SkeletonLoader className="w-1/2" height="h-4" />
              </div>
            </div>
            <div className="space-y-2 mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between">
                <SkeletonLoader className="w-24" height="h-4" />
                <SkeletonLoader className="w-16" height="h-4" />
              </div>
              <div className="flex justify-between">
                <SkeletonLoader className="w-24" height="h-4" />
                <SkeletonLoader className="w-16" height="h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
