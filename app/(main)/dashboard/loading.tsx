import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="space-y-2">
        <SkeletonLoader variant="text" width="w-48" height="h-8" />
        <SkeletonLoader variant="text" width="w-64" height="h-5" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonLoader variant="card" count={4} />
      </div>

      {/* Main content grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonLoader variant="card" height="h-96" />
        <SkeletonLoader variant="card" height="h-96" />
        <SkeletonLoader variant="card" height="h-96" />
        <SkeletonLoader variant="card" height="h-96" />
      </div>
    </div>
  );
}
