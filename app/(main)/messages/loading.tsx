import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

export default function MessagesLoading() {
  return (
    <div className="flex h-main-content animate-in fade-in duration-300">
      {/* Sidebar skeleton */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <SkeletonLoader className="w-24" height="h-6" />
          <SkeletonLoader className="w-8 h-8 rounded-full" />
        </div>

        {/* Search bar */}
        <SkeletonLoader className="w-full h-10 rounded-lg" />

        {/* Conversation list */}
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
              <SkeletonLoader className="w-12 h-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1">
                <SkeletonLoader className="w-3/4" height="h-4" />
                <SkeletonLoader className="w-1/2" height="h-3" />
              </div>
              <SkeletonLoader className="w-10" height="h-3" />
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <SkeletonLoader className="w-10 h-10 rounded-full" />
            <div className="space-y-1">
              <SkeletonLoader className="w-32" height="h-5" />
              <SkeletonLoader className="w-20" height="h-3" />
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 p-4 space-y-4 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'justify-end'}`}>
              {i % 2 === 0 && <SkeletonLoader className="w-8 h-8 rounded-full flex-shrink-0" />}
              <div className={`space-y-1 max-w-xs ${i % 2 === 0 ? '' : 'items-end'}`}>
                <SkeletonLoader className={`${i % 2 === 0 ? 'w-48' : 'w-36'} h-16 rounded-xl`} />
                <SkeletonLoader className="w-12" height="h-3" />
              </div>
            </div>
          ))}
        </div>

        {/* Message input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <SkeletonLoader className="w-10 h-10 rounded-full flex-shrink-0" />
            <SkeletonLoader className="flex-1 h-10 rounded-full" />
            <SkeletonLoader className="w-10 h-10 rounded-full flex-shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
}
