export default function MagicLinkLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950 dark:via-blue-950 dark:to-indigo-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        {/* Loading spinner */}
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-4 border-purple-200 dark:border-purple-800 border-t-purple-600 dark:border-t-purple-400 rounded-full animate-spin" />
        </div>

        {/* Title skeleton */}
        <div className="h-7 w-40 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2 animate-pulse" />

        {/* Description skeleton */}
        <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse" />
      </div>
    </div>
  );
}
