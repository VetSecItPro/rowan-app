export default function LoginLoading() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile Header skeleton */}
      <div className="lg:hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-900 pt-8 pb-12 px-4">
        <div className="flex flex-col items-center">
          <div className="w-18 h-18 bg-white/20 rounded-xl animate-pulse" />
          <div className="mt-2 h-8 w-20 bg-white/20 rounded animate-pulse" />
        </div>
      </div>

      {/* Desktop Left side skeleton */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-900 flex-col items-center justify-center p-12">
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-28 h-28 bg-white/20 rounded-xl animate-pulse" />
            <div className="h-16 w-40 bg-white/20 rounded animate-pulse" />
          </div>
          <div className="h-6 w-96 bg-white/20 rounded mx-auto mb-8 animate-pulse" />
          <div className="space-y-4 max-w-md mx-auto">
            <div className="h-5 w-64 bg-white/20 rounded animate-pulse" />
            <div className="h-5 w-56 bg-white/20 rounded animate-pulse" />
            <div className="h-5 w-72 bg-white/20 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Right side - Form skeleton */}
      <div className="flex-1 lg:w-1/2 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          {/* Header skeleton */}
          <div className="mb-8">
            <div className="h-9 w-44 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Form skeleton */}
          <div className="space-y-6">
            {/* Email field */}
            <div>
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>

            {/* Password field */}
            <div>
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2 animate-pulse" />
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>

            {/* Sign in button */}
            <div className="h-12 bg-emerald-200 dark:bg-emerald-800 rounded-xl animate-pulse" />

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            {/* Magic link button */}
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
          </div>

          {/* Sign up link */}
          <div className="mt-6 flex justify-center">
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
