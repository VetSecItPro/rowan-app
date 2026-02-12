import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function NewRecipeLoading() {
  return (
    <div className="space-y-6 p-6 animate-in fade-in duration-300">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLoader className="w-36" height="h-8" />
          <SkeletonLoader className="w-48" height="h-5" />
        </div>
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>

      {/* Form sections skeleton */}
      <div className="space-y-6">
        {/* Basic info section */}
        <div className="bg-gray-800 rounded-xl p-6 space-y-4">
          <SkeletonLoader className="w-32" height="h-6" />
          <SkeletonLoader className="w-full h-10 rounded-lg" />
          <SkeletonLoader className="w-full h-24 rounded-lg" />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonLoader key={i} className="w-full h-10 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Image upload section */}
        <div className="bg-gray-800 rounded-xl p-6">
          <SkeletonLoader className="w-32" height="h-6" />
          <SkeletonLoader className="w-full h-48 rounded-lg mt-4" />
        </div>

        {/* Ingredients section */}
        <div className="bg-gray-800 rounded-xl p-6 space-y-4">
          <SkeletonLoader className="w-32" height="h-6" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-2">
              <SkeletonLoader className="flex-1 h-10 rounded-lg" />
              <SkeletonLoader className="w-24 h-10 rounded-lg" />
            </div>
          ))}
          <SkeletonLoader className="w-32 h-10 rounded-lg" />
        </div>

        {/* Instructions section */}
        <div className="bg-gray-800 rounded-xl p-6 space-y-4">
          <SkeletonLoader className="w-32" height="h-6" />
          {[...Array(3)].map((_, i) => (
            <SkeletonLoader key={i} className="w-full h-20 rounded-lg" />
          ))}
          <SkeletonLoader className="w-32 h-10 rounded-lg" />
        </div>
      </div>

      {/* Action buttons skeleton */}
      <div className="flex gap-3 justify-end">
        <SkeletonLoader className="w-24 h-10 rounded-lg" />
        <SkeletonLoader className="w-28 h-10 rounded-lg" />
      </div>
    </div>
  );
}
