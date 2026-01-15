'use client';

import { Clock, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function BetaExpiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-gray-50 from-gray-900 to-gray-950 p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/50 p-8">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center shadow-lg">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                <AlertTriangle className="w-5 h-5 text-gray-900" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-white mb-3">
            Beta Access Expired
          </h1>

          {/* Message */}
          <p className="text-center text-gray-400 mb-6">
            Your beta testing period has ended. Thank you for helping us improve Rowan!
          </p>

          {/* Info Box */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-100">
              The beta testing program concluded on <strong>December 31, 2025 at 8:00 PM Central Time</strong>.
            </p>
          </div>

          {/* What's Next */}
          <div className="space-y-3 mb-6">
            <h2 className="font-semibold text-white">What's next?</h2>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Your feedback has been invaluable in shaping Rowan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Stay tuned for the official launch announcement</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>
                <span>Early access pricing will be available for beta testers</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/upgrade"
              className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 text-center shadow-md hover:shadow-lg"
            >
              Upgrade Your Account
            </Link>
            <Link
              href="/"
              className="block w-full py-3 px-4 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-all duration-200 text-center"
            >
              Return to Homepage
            </Link>
          </div>
        </div>

        {/* Support Link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Questions?{' '}
          <a href="mailto:support@rowan.app" className="text-blue-400 hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
}
