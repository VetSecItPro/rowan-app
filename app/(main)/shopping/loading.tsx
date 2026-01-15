import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function ShoppingLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-32" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Shopping lists skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <SkeletonLoader className="w-32" height="h-5" />
              <SkeletonLoader className="w-6 h-6 rounded" />
            </div>
            <div className="space-y-2">
              {[...Array(4)].map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <SkeletonLoader className="w-4 h-4 rounded" />
                  <SkeletonLoader className="flex-1" height="h-4" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
              <SkeletonLoader className="w-20" height="h-4" />
              <SkeletonLoader className="w-16" height="h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
