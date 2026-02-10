export default function VerifyEmailLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        {/* Loading spinner */}
        <div className="w-16 h-16 bg-emerald-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-8 h-8 border-4 border-emerald-800 border-t-emerald-400 rounded-full animate-spin" />
        </div>

        {/* Title skeleton */}
        <div className="h-7 w-48 bg-gray-700 rounded mx-auto mb-2 animate-pulse" />

        {/* Description skeleton */}
        <div className="h-4 w-56 bg-gray-700 rounded mx-auto animate-pulse" />
      </div>
    </div>
  );
}
