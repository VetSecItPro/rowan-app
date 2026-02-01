import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function BudgetSetupLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="text-center space-y-2">
        <SkeletonLoader className="w-48 mx-auto" height="h-8" />
        <SkeletonLoader className="w-64 mx-auto" height="h-5" />
      </div>

      {/* Setup form skeleton */}
      <div className="max-w-lg mx-auto bg-gray-800 rounded-xl p-6 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <SkeletonLoader className="w-24" height="h-4" />
            <SkeletonLoader className="w-full h-12 rounded-lg" />
          </div>
        ))}
        <SkeletonLoader className="w-full h-12 rounded-lg" />
      </div>
    </div>
  );
}
