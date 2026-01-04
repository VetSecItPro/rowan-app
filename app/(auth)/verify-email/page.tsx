'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, RefreshCw, LogOut, CheckCircle, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/**
 * Email Verification Required Page
 *
 * Shown to new users (on or after Jan 4, 2026) who haven't verified their email yet.
 * Existing beta users (before Jan 4, 2026) are grandfathered in and won't see this page.
 */
export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  // Smooth fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Check if user has verified their email (poll every 5 seconds)
  useEffect(() => {
    const supabase = createClient();

    const checkVerification = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        // Email verified! Redirect to dashboard
        router.push('/dashboard');
      }
    };

    // Check immediately
    checkVerification();

    // Then poll every 5 seconds
    const interval = setInterval(checkVerification, 5000);

    return () => clearInterval(interval);
  }, [router]);

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.alreadyVerified) {
          // Email was already verified, redirect to dashboard
          router.push('/dashboard');
          return;
        }
        setResendError(data.error || 'Failed to send verification email.');
      } else {
        setResendSuccess(true);
        // Clear success message after 10 seconds
        setTimeout(() => setResendSuccess(false), 10000);
      }
    } catch {
      setResendError('Network error. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950 p-4">
      <div
        className={`w-full max-w-md transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <Image
              src="/rowan-logo.png"
              alt="Rowan"
              width={80}
              height={80}
              className="mx-auto drop-shadow-lg"
              priority
            />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-4">
            Verify Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            One more step to access Rowan
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-gray-200/50 dark:border-gray-700/50">
          {/* Email Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <Mail className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              We&apos;ve sent a verification email to:
            </p>
            <p className="font-semibold text-gray-900 dark:text-white text-lg bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-2 inline-block">
              {email || 'your email address'}
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
              Please click the link in the email to verify your account.
              Once verified, this page will automatically redirect you to the dashboard.
            </p>
          </div>

          {/* Success Message */}
          {resendSuccess && (
            <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Verification email sent! Please check your inbox (and spam folder).
              </p>
            </div>
          )}

          {/* Error Message */}
          {resendError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{resendError}</p>
            </div>
          )}

          {/* Resend Button */}
          <button
            onClick={handleResendEmail}
            disabled={isResending}
            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/25 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                Resend Verification Email
              </>
            )}
          </button>

          {/* Tips */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Didn&apos;t receive the email?
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email</li>
              <li>Wait a few minutes and try resending</li>
            </ul>
          </div>

          {/* Sign Out Link */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {isSigningOut ? 'Signing out...' : 'Sign out and use a different account'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          Need help?{' '}
          <a
            href="mailto:support@rowan.app"
            className="text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
