export default function SignupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-emerald-950 dark:via-teal-950 dark:to-cyan-950">
      <div className="w-full max-w-md p-6">
        {/* Logo skeleton */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        </div>

        {/* Title skeleton */}
        <div className="text-center mb-6">
          <div className="h-8 w-40 bg-gray-200 dark:bg-gray-700 rounded mx-auto mb-2 animate-pulse" />
          <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded mx-auto animate-pulse" />
        </div>

        {/* Form skeleton */}
        <div className="space-y-4 bg-white/80 dark:bg-gray-800/80 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Beta code field */}
          <div>
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Name field */}
          <div>
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Space name field */}
          <div>
            <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Email field */}
          <div>
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Password field */}
          <div>
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Button */}
          <div className="h-12 bg-emerald-200 dark:bg-emerald-700 rounded-xl animate-pulse" />
        </div>

        {/* Footer link */}
        <div className="flex justify-center mt-6">
          <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
