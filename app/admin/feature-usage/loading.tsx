export default function FeatureUsageLoading() {
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-44 bg-gray-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
      </div>

      {/* Time range selector */}
      <div className="flex gap-2 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 w-16 bg-gray-800 rounded animate-pulse" />
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="h-4 w-24 bg-gray-700 rounded animate-pulse mb-3" />
            <div className="h-8 w-16 bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Feature usage table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="h-6 w-40 bg-gray-700 rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-700/20 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-gray-700 rounded animate-pulse" />
                <div>
                  <div className="h-5 w-24 bg-gray-700 rounded animate-pulse mb-1" />
                  <div className="h-3 w-32 bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-16 bg-gray-700 rounded animate-pulse" />
                <div className="h-6 w-12 bg-gray-700 rounded-full animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
