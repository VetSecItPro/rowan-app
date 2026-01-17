export default function ForgotPasswordLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950">
      <div className="w-full max-w-md p-6">
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-6 w-24 bg-gray-700 rounded animate-pulse" />
        </div>

        {/* Card */}
        <div className="bg-gray-800/80 p-8 rounded-xl border border-gray-700">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-gray-700 rounded-full animate-pulse" />
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <div className="h-7 w-40 bg-gray-700 rounded mx-auto mb-2 animate-pulse" />
            <div className="h-4 w-64 bg-gray-700 rounded mx-auto animate-pulse" />
          </div>

          {/* Email field */}
          <div className="mb-6">
            <div className="h-4 w-16 bg-gray-700 rounded mb-2 animate-pulse" />
            <div className="h-12 bg-gray-700 rounded animate-pulse" />
          </div>

          {/* Button */}
          <div className="h-12 bg-emerald-700 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
