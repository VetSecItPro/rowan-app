'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, RefreshCw, LogOut, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

/**
 * Email Verification Page
 *
 * Handles two cases:
 * 1. User clicks verification link from email (has token)
 * 2. User is logged in and waiting for verification (no token, polling)
 */
function VerifyEmailContent() {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [email, setEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Smooth fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // FIX-052: Get email from authenticated session instead of URL query parameter
  useEffect(() => {
    async function fetchEmail() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }
    }
    fetchEmail();
  }, []);

  const verifyToken = useCallback(async (verificationToken: string) => {
    setIsVerifying(true);
    setVerificationError('');

    try {
      // First check if token is valid
      const checkResponse = await fetch(`/api/auth/verify-email?token=${verificationToken}`);
      const checkData = await checkResponse.json();

      if (!checkData.valid) {
        setVerificationError(checkData.error || 'Invalid verification link');
        setIsVerifying(false);
        return;
      }

      // Now verify the token
      const response = await csrfFetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login?verified=true');
        }, 3000);
      } else {
        setVerificationError(data.error || 'Verification failed');
      }
    } catch {
      setVerificationError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [router]);

  // Handle token verification if token is present
  useEffect(() => {
    if (token && !isVerifying && !verificationSuccess && !verificationError) {
      verifyToken(token);
    }
  }, [token, isVerifying, verificationSuccess, verificationError, verifyToken]);

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
      const response = await csrfFetch('/api/auth/resend-verification', {
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

  // If verifying a token, show verification UI
  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
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
          </div>

          {/* Card */}
          <div className="bg-gray-800/95 rounded-2xl shadow-xl p-8 border border-gray-700/50">
            {isVerifying && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-pulse">
                  <Mail className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Verifying Your Email
                </h2>
                <p className="text-gray-400">
                  Please wait...
                </p>
              </div>
            )}

            {verificationSuccess && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Email Verified!
                </h2>
                <p className="text-gray-400 mb-4">
                  Your email has been successfully verified. Redirecting you to login...
                </p>
                <Link
                  href="/login?verified=true"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all"
                >
                  Continue to Login <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {verificationError && (
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Verification Failed
                </h2>
                <p className="text-gray-400 mb-4">
                  {verificationError}
                </p>
                <div className="space-y-3">
                  <Link
                    href="/login"
                    className="block w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all text-center"
                  >
                    Go to Login
                  </Link>
                  <p className="text-sm text-gray-400">
                    You can request a new verification email after logging in.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Standard "waiting for verification" UI (no token)
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
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
          <h1 className="text-2xl font-bold text-white mt-4">
            Verify Your Email
          </h1>
          <p className="text-gray-400 mt-2">
            One more step to access Rowan
          </p>
        </div>

        {/* Card */}
        <div className="bg-gray-800/95 rounded-2xl shadow-xl p-8 border border-gray-700/50">
          {/* Email Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
              <Mail className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-gray-300 mb-4">
              We&apos;ve sent a verification email to:
            </p>
            <p className="font-semibold text-white text-lg bg-gray-700 rounded-lg px-4 py-2 inline-block">
              {email || 'your email address'}
            </p>
            <p className="text-gray-400 text-sm mt-4">
              Please click the link in the email to verify your account.
              Once verified, this page will automatically redirect you to the dashboard.
            </p>
          </div>

          {/* Success Message */}
          {resendSuccess && (
            <div className="mb-4 p-4 bg-emerald-900/20 border border-emerald-800 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-emerald-300">
                Verification email sent! Please check your inbox (and spam folder).
              </p>
            </div>
          )}

          {/* Error Message */}
          {resendError && (
            <div className="mb-4 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{resendError}</p>
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
          <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
            <p className="text-sm font-medium text-gray-300 mb-2">
              Didn&apos;t receive the email?
            </p>
            <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
              <li>Check your spam or junk folder</li>
              <li>Make sure you entered the correct email</li>
              <li>Wait a few minutes and try resending</li>
            </ul>
          </div>

          {/* Sign Out Link */}
          <div className="mt-6 pt-6 border-t border-gray-700 text-center">
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {isSigningOut ? 'Signing out...' : 'Sign out and use a different account'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-8">
          Need help?{' '}
          <a
            href="mailto:contact@steelmotionllc.com"
            className="text-emerald-400 hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="animate-pulse">
          <div className="w-16 h-16 rounded-full bg-emerald-800 mx-auto mb-4" />
          <div className="h-4 w-32 bg-gray-700 rounded mx-auto" />
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
