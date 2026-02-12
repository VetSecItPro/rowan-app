export default function Loading() {
  return (
    <div className="flex-1 p-4 sm:p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-800 rounded-lg w-48" />

      {/* Operations list skeleton */}
      <div className="space-y-4">
        <div className="h-32 bg-gray-800 rounded-xl" />
        <div className="h-32 bg-gray-800 rounded-xl" />
        <div className="h-24 bg-gray-800 rounded-xl" />
      </div>
    </div>
  );
}
