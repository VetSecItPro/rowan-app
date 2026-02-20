export default function Loading() {
  return (
    <div className="min-h-screen bg-black animate-pulse">
      <div className="bg-gray-800 h-40" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div className="h-32 bg-gray-800/50 rounded-2xl" />
        <div className="h-48 bg-gray-800/50 rounded-2xl" />
        <div className="h-48 bg-gray-800/50 rounded-2xl" />
      </div>
    </div>
  );
}
