export default function Loading() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-800 rounded-lg w-36" />

      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 bg-gray-800 rounded-lg w-48" />
        <div className="h-10 bg-gray-800 rounded-lg w-32" />
      </div>

      {/* Log entries skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
