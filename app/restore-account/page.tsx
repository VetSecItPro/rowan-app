'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { RefreshCw, CheckCircle, Calendar, AlertTriangle, Loader2, Home } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { Footer } from '@/components/layout/Footer';
import { PublicHeader } from '@/components/layout/PublicHeader';

export default function RestoreAccountPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState<{
    deletionRequestedAt: string;
    permanentDeletionAt: string;
  } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  const checkDeletionStatus = async () => {
    try {
      const response = await fetch('/api/user/cancel-deletion');
      const data = await response.json();

      if (data.markedForDeletion) {
        setDeletionInfo({
          deletionRequestedAt: data.deletionRequestedAt,
          permanentDeletionAt: data.permanentDeletionAt,
        });
      } else {
        // Account is not marked for deletion
        setDeletionInfo(null);
      }
      setCheckingStatus(false);
    } catch (error) {
      logger.error('Error checking deletion status:', error, { component: 'page', action: 'execution' });
      setError('Failed to check account status. Please try again.');
      setCheckingStatus(false);
    }
  };

  // Smooth fade-in animation
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Check deletion status when user is loaded
  useEffect(() => {
    if (authLoading) return;

    if (!user) return;

    // User is logged in, check deletion status
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async status fetch updates component state
    checkDeletionStatus();
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!deletionInfo) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- derived countdown updates from server data
      setDaysRemaining(0);
      return;
    }

    const remaining = Math.ceil(
      (new Date(deletionInfo.permanentDeletionAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    setDaysRemaining(remaining);
  }, [deletionInfo]);

  const handleRestoreAccount = async () => {
    setIsRestoring(true);
    setError('');

    try {
      const response = await csrfFetch('/api/user/cancel-deletion', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to restore account');
        setIsRestoring(false);
        return;
      }

      // Account restored successfully
      setRestored(true);
      setIsRestoring(false);

      // Redirect to dashboard after 2 seconds
      // nosemgrep: javascript.lang.security.detect-eval-with-expression.detect-eval-with-expression
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (error) {
      logger.error('Account restoration error:', error, { component: 'page', action: 'execution' });
      setError('An unexpected error occurred. Please try again.');
      setIsRestoring(false);
    }
  };

  if (authLoading || checkingStatus) {
    return (
      <div className="min-h-screen bg-black flex flex-col">
        <PublicHeader />
        <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Checking account status...</p>
        </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-black flex flex-col transition-all duration-700 ${
        mounted ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <PublicHeader />
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/rowan-logo.png"
            alt="Rowan Logo"
            width={80}
            height={80}
            className="w-20 h-20"
          />
        </div>

        {restored ? (
          // Success state
          <div className="bg-gray-900/95 rounded-3xl shadow-2xl border border-gray-700/50 p-8 text-center">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">
              Account Restored Successfully!
            </h1>

            <p className="text-lg text-gray-300 mb-6">
              Your account deletion has been cancelled. Welcome back to Rowan!
            </p>

            <div className="inline-flex items-center gap-2 text-purple-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Redirecting to dashboard...</span>
            </div>
          </div>
        ) : deletionInfo ? (
          // Account marked for deletion - show restoration option
          <div className="bg-gray-900/95 rounded-3xl shadow-2xl border border-gray-700/50 p-8">
            <h1 className="text-3xl font-bold text-white mb-4 text-center">
              Restore Your Account
            </h1>

            <p className="text-lg text-gray-300 mb-8 text-center">
              Your account is currently scheduled for deletion. You can cancel this anytime within the 30-day grace period.
            </p>

            {/* Warning Notice */}
            <div className="flex items-start gap-3 p-4 bg-orange-900/20 border border-orange-800 rounded-xl mb-8">
              <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-orange-200 mb-1">
                  Account scheduled for deletion
                </h3>
                <p className="text-sm text-orange-300">
                  Deletion requested on{' '}
                  <strong>{new Date(deletionInfo.deletionRequestedAt).toLocaleDateString()}</strong>
                  <br />
                  Permanent deletion on{' '}
                  <strong>{new Date(deletionInfo.permanentDeletionAt).toLocaleDateString()}</strong>
                  <br />
                  <span className="text-orange-100 font-semibold">
                    {daysRemaining} days remaining
                  </span>
                </p>
              </div>
            </div>

            {/* Benefits of restoring */}
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-semibold text-white">
                What happens when you restore:
              </h3>

              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-4 bg-green-900/20 border border-green-800 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Deletion Cancelled</p>
                    <p className="text-sm text-gray-400">
                      Your deletion request will be cancelled immediately and permanently.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-800 rounded-xl">
                  <RefreshCw className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Full Access Restored</p>
                    <p className="text-sm text-gray-400">
                      Continue using all Rowan features normally with no restrictions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-purple-900/20 border border-purple-800 rounded-xl">
                  <Calendar className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">All Data Preserved</p>
                    <p className="text-sm text-gray-400">
                      Your expenses, tasks, messages, and all other data remains intact.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl mb-6">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-4 text-gray-300 bg-gray-800 hover:bg-gray-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                disabled={isRestoring}
              >
                <Home className="w-5 h-5" />
                Go to Dashboard
              </button>
              <button
                onClick={handleRestoreAccount}
                className="flex-1 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Restoring Account...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    Restore My Account
                  </>
                )}
              </button>
            </div>

            {/* Info note */}
            <div className="text-xs text-gray-400 text-center mt-6 pt-6 border-t border-gray-700">
              By restoring your account, you confirm that you want to continue using Rowan.
              You can request deletion again anytime from your account settings.
            </div>
          </div>
        ) : (
          // Account is NOT marked for deletion
          <div className="bg-gray-900/95 rounded-3xl shadow-2xl border border-gray-700/50 p-8 text-center">
            <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">
              Account is Active
            </h1>

            <p className="text-lg text-gray-300 mb-8">
              Your account is not marked for deletion. You can continue using Rowan normally.
            </p>

            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 inline-flex items-center gap-2"
            >
              <Home className="w-5 h-5" />
              Go to Dashboard
            </button>
          </div>
        )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
