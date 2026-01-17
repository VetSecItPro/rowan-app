'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Check, X, Loader2, Home } from 'lucide-react';
import Link from 'next/link';
import { useValidatedSearchParams, InvitationAcceptParamsSchema } from '@/lib/hooks/useValidatedSearchParams';
import { logger } from '@/lib/logger';

function AcceptInvitationContent() {
  const router = useRouter();
  const { params, error: validationError } = useValidatedSearchParams(InvitationAcceptParamsSchema);
  const token = params?.token;

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spaceName, setSpaceName] = useState<string>('');

  useEffect(() => {
    async function handleAcceptInvitation() {
      // Check for validation errors first
      if (validationError) {
        setError('Invalid invitation link format');
        setLoading(false);
        return;
      }

      if (!token) {
        setError('Invalid invitation link');
        setLoading(false);
        return;
      }

      const supabase = createClient();

      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Redirect to signup with invitation token - this allows new users to sign up
        // The invite_token serves as authorization instead of requiring a beta code
        router.push(`/signup?invite_token=${encodeURIComponent(token)}`);
        return;
      }

      try {
        // Accept invitation
        const response = await fetch('/api/invitations/accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to accept invitation');
        }

        // Get space name to display
        const { data: space } = await supabase
          .from('spaces')
          .select('name')
          .eq('id', result.data.spaceId)
          .single();

        setSpaceName(space?.name || 'the space');
        setSuccess(true);
      } catch (err) {
        logger.error('Error accepting invitation:', err, { component: 'page', action: 'execution' });
        setError(err instanceof Error ? err.message : 'Failed to accept invitation');
      } finally {
        setLoading(false);
      }
    }

    handleAcceptInvitation();
  }, [token, router, validationError]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="animate-pulse space-y-6">
            <div className="w-16 h-16 bg-purple-700 rounded-full mx-auto" />
            <div className="space-y-3">
              <div className="h-8 bg-gray-700 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-700 rounded w-5/6 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-12 h-12 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to {spaceName}!
          </h2>
          <p className="text-gray-400 mb-6">
            You&apos;ve successfully joined the space. You can now start collaborating with your family and friends.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-all shadow-lg font-medium"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <X className="w-12 h-12 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Invitation Error
          </h2>
          <p className="text-gray-400 mb-6">
            {error}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:opacity-90 transition-all shadow-lg font-medium"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return null;
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Loading...
          </h2>
        </div>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}
