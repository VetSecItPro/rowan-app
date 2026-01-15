'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, CheckCircle, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

/**
 * Email Change Verification Page
 *
 * Handles verification when user clicks link in email to confirm email change.
 */
function VerifyEmailChangeContent() {
  const [mounted, setMounted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  // Smooth fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Handle token verification
  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setVerificationError('No verification token provided.');
      return;
    }

    verifyToken(token);
  }, [token]);

  const verifyToken = async (verificationToken: string) => {
    setIsVerifying(true);
    setVerificationError('');

    try {
      // First check if token is valid
      const checkResponse = await fetch(`/api/auth/email-change/verify?token=${verificationToken}`);
      const checkData = await checkResponse.json();

      if (!checkData.valid) {
        setVerificationError(checkData.error || 'Invalid verification link');
        setIsVerifying(false);
        return;
      }

      // Now verify the token (complete the email change)
      const response = await fetch('/api/auth/email-change/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationSuccess(true);
        setNewEmail(data.newEmail || '');
        // Redirect to login after 5 seconds
        setTimeout(() => {
          router.push('/login?email_changed=true');
        }, 5000);
      } else {
        setVerificationError(data.error || 'Verification failed');
      }
    } catch {
      setVerificationError('Network error. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white from-gray-900 to-emerald-950 p-4">
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
        <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-gray-700/50">
          {isVerifying && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Verifying Email Change
              </h2>
              <p className="text-gray-400">
                Please wait while we update your email...
              </p>
            </div>
          )}

          {verificationSuccess && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">
                Email Updated!
              </h2>
              <p className="text-gray-400 mb-2">
                Your email has been successfully changed to:
              </p>
              {newEmail && (
                <p className="font-semibold text-emerald-400 mb-4">
                  {newEmail}
                </p>
              )}
              <p className="text-sm text-gray-400 mb-4">
                Please sign in again with your new email address.
              </p>
              <Link
                href="/login?email_changed=true"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all"
              >
                Continue to Login <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}

          {verificationError && !isVerifying && (
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
                  href="/dashboard/settings"
                  className="block w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all text-center"
                >
                  Go to Settings
                </Link>
                <p className="text-sm text-gray-400">
                  You can request a new email change from your settings page.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-400 mt-8">
          Need help?{' '}
          <a
            href="mailto:support@rowan.app"
            className="text-emerald-400 hover:underline"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailChangePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white from-gray-900 to-emerald-950">
        <div className="animate-pulse">
          <div className="w-16 h-16 rounded-full bg-emerald-800 mx-auto mb-4" />
          <div className="h-4 w-32 bg-gray-700 rounded mx-auto" />
        </div>
      </div>
    }>
      <VerifyEmailChangeContent />
    </Suspense>
  );
}
