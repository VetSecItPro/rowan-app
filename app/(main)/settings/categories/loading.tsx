export default function Loading() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-800 rounded-lg w-40" />

      {/* Categories list skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
