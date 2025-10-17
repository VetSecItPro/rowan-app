import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function FeaturesLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader variant="text" width="w-48" height="h-8" />
          <SkeletonLoader variant="text" width="w-64" height="h-5" />
        </div>
        <SkeletonLoader variant="custom" width="w-32" height="h-10" className="rounded-xl" />
      </div>

      {/* Tabs or filters skeleton */}
      <div className="flex gap-2">
        <SkeletonLoader variant="custom" width="w-24" height="h-10" className="rounded-lg" count={4} />
      </div>

      {/* Main content list skeleton */}
      <div className="space-y-3">
        <SkeletonLoader variant="list" count={8} />
      </div>
    </div>
  );
}
