export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="h-10 w-32 bg-gray-800 rounded animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
              <div className="h-8 w-8 bg-gray-700 rounded animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-gray-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-20 bg-gray-700 rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Quick actions skeleton */}
      <div className="mb-8">
        <div className="h-6 w-32 bg-gray-800 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="h-6 w-40 bg-gray-700 rounded animate-pulse mb-4" />
        <div className="h-64 bg-gray-700/30 rounded animate-pulse" />
      </div>
    </div>
  );
}
