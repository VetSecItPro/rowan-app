export default function Loading() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-800 rounded-lg w-40" />

      {/* Analytics cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-800 rounded-xl" />
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="h-64 bg-gray-800 rounded-xl" />
    </div>
  );
}
