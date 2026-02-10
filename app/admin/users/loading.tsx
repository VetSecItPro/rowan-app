export default function UsersLoading() {
  return (
    <div className="min-h-screen bg-black p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="h-8 w-48 bg-gray-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-40 bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-gray-800 rounded animate-pulse" />
          <div className="h-10 w-10 bg-gray-800 rounded animate-pulse" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-700 pb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 w-28 bg-gray-800 rounded animate-pulse" />
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex gap-4 mb-6">
        <div className="h-10 flex-1 max-w-md bg-gray-800 rounded animate-pulse" />
        <div className="h-10 w-32 bg-gray-800 rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
        {/* Table rows */}
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-16 border-b border-gray-700 flex items-center px-4 gap-4">
            <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse" />
            <div className="h-4 w-40 bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-32 bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-gray-700 rounded-full animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
