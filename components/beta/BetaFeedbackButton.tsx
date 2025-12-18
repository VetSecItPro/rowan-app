'use client';

import Link from 'next/link';
import { TestTube, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useAdmin } from '@/hooks/useAdmin';

export function BetaFeedbackButton() {
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();

  // Show for beta testers or admin
  const isBetaTester = user?.is_beta_tester && user.beta_status === 'approved';

  // Don't render anything while checking admin status
  if (adminLoading) {
    return null;
  }

  // Only show for beta testers or admins
  if (!isBetaTester && !isAdmin) {
    return null;
  }

  return (
    <>
      {/* Floating feedback button - show for both beta testers and admins */}
      <div className="fixed bottom-6 right-6 z-50">
        {/* Simple mobile-friendly button */}
        <Link
          href="/beta/feedback"
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 font-medium"
        >
          <TestTube className="w-5 h-5" />
          <span className="hidden sm:inline whitespace-nowrap">Beta Feedback</span>
          <MessageSquare className="w-4 h-4 opacity-80 sm:hidden" />
        </Link>
      </div>
    </>
  );
}

export default BetaFeedbackButton;