import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function SettingsLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="space-y-2">
        <SkeletonLoader variant="text" width="w-48" height="h-8" />
        <SkeletonLoader variant="text" width="w-96" height="h-5" />
      </div>

      {/* Settings cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SkeletonLoader variant="card" height="h-40" count={6} />
      </div>
    </div>
  );
}
