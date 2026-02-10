export default function ResetPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-full max-w-md p-6">
        {/* Card */}
        <div className="bg-gray-800/80 p-8 rounded-xl border border-gray-700">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-gray-700 rounded-full animate-pulse" />
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <div className="h-7 w-48 bg-gray-700 rounded mx-auto mb-2 animate-pulse" />
            <div className="h-4 w-56 bg-gray-700 rounded mx-auto animate-pulse" />
          </div>

          {/* New Password field */}
          <div className="mb-4">
            <div className="h-4 w-28 bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-12 bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Confirm Password field */}
          <div className="mb-6">
            <div className="h-4 w-36 bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-12 bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Password requirements */}
          <div className="mb-6 p-4 bg-gray-700/50 rounded-lg">
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-600 rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-gray-600 rounded animate-pulse" />
              <div className="h-3 w-4/5 bg-gray-600 rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-gray-600 rounded animate-pulse" />
            </div>
          </div>

          {/* Button */}
          <div className="h-12 bg-emerald-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
