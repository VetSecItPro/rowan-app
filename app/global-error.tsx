'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-500 via-orange-500 to-yellow-500">
          <div className="text-center p-8 bg-gray-900 rounded-2xl shadow-2xl max-w-md">
            <h1 className="text-6xl font-bold text-white mb-4">500</h1>
            <h2 className="text-2xl font-semibold text-gray-200 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-400 mb-8">
              We&apos;re sorry, but something unexpected happened. Please try again.
            </p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
