export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-40 bg-gray-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-56 bg-gray-800 rounded animate-pulse" />
      </div>

      {/* Time range selector */}
      <div className="flex gap-2 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 w-20 bg-gray-800 rounded animate-pulse" />
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="h-4 w-28 bg-gray-700 rounded animate-pulse mb-3" />
            <div className="h-10 w-20 bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8">
        <div className="h-6 w-32 bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-80 bg-gray-700/30 rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="h-6 w-36 bg-gray-700 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-700/30 rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
