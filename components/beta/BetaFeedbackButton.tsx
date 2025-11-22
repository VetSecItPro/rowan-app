'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TestTube, MessageSquare, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

export function BetaFeedbackButton() {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show for beta testers
  if (!user?.is_beta_tester || user.beta_status !== 'approved') {
    return null;
  }

  return (
    <>
      {/* Floating feedback button */}
      <div className="fixed bottom-6 right-6 z-50">
        <div
          className="group relative"
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {/* Main button */}
          <Link
            href="/beta/feedback"
            className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-medium"
          >
            <TestTube className="w-5 h-5" />
            <span className={`transition-all duration-300 overflow-hidden ${
              isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'
            }`}>
              <span className="whitespace-nowrap">Beta Feedback</span>
            </span>
            <MessageSquare className="w-4 h-4 opacity-80" />
          </Link>

          {/* Tooltip for collapsed state */}
          {!isExpanded && (
            <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              🧪 Submit Beta Feedback
              <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900 dark:border-t-gray-700"></div>
            </div>
          )}
        </div>
      </div>

      {/* Beta status indicator */}
      <div className="fixed top-20 right-4 z-40">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-300 rounded-full text-xs font-medium backdrop-blur-sm">
          <TestTube className="w-3 h-3" />
          <span>Beta Tester</span>
        </div>
      </div>
    </>
  );
}

export default BetaFeedbackButton;