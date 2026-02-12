import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function BillsLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-24" height="h-8" />
          <SkeletonLoader className="w-44" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Bills list skeleton */}
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <SkeletonLoader className="w-8 h-8 rounded-lg" />
                  <SkeletonLoader className="w-3/4" height="h-5" />
                </div>
                <SkeletonLoader className="w-1/2" height="h-4" />
              </div>
              <div className="text-right space-y-2">
                <SkeletonLoader className="w-20" height="h-6" />
                <SkeletonLoader className="w-24" height="h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
