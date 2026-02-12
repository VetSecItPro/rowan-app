export default function Loading() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-800 rounded-lg w-48" />

      {/* Documentation grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
