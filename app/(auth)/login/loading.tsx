export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md p-8">
        {/* Logo skeleton */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-gray-700 rounded-xl animate-pulse" />
        </div>

        {/* Title skeleton */}
        <div className="text-center mb-8">
          <div className="h-8 w-32 bg-gray-700 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-48 bg-gray-700 rounded mx-auto animate-pulse" />
        </div>

        {/* Form skeleton */}
        <div className="space-y-6 bg-gray-800/50 p-6 rounded-xl border border-gray-700">
          {/* Email field */}
          <div>
            <div className="h-4 w-16 bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-12 bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Password field */}
          <div>
            <div className="h-4 w-20 bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-12 bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Button */}
          <div className="h-12 bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Footer links */}
        <div className="flex justify-center gap-4 mt-6">
          <div className="h-4 w-24 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-20 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
