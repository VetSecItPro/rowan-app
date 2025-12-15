'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

function MagicLinkHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const handleMagicLink = async () => {
      const token = searchParams?.get('token');

      if (!token) {
        setStatus('error');
        setMessage('No authentication token found. Please try requesting a new magic link.');
        return;
      }

      try {
        // First, verify the token is valid
        const verifyResponse = await fetch(`/api/auth/magic-link/verify?token=${token}`, {
          method: 'GET'
        });

        if (!verifyResponse.ok) {
          const errorData = await verifyResponse.json();
          setStatus('error');
          setMessage(errorData.error || 'Invalid magic link.');
          return;
        }

        const verifyData = await verifyResponse.json();
        
        if (!verifyData.valid) {
          setStatus('error');
          setMessage(verifyData.error || 'Invalid magic link.');
          return;
        }

        // Use Supabase's built-in magic link verification
        // The URL should contain access_token and refresh_token parameters
        const supabase = createClient();
        
        // Try to get session from URL parameters
        const accessToken = searchParams?.get('access_token');
        const refreshToken = searchParams?.get('refresh_token');
        const type = searchParams?.get('type');

        if (accessToken && refreshToken && type === 'magiclink') {
          // This is a Supabase magic link - use it directly
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            setStatus('error');
            setMessage('Failed to authenticate. Please try again.');
            return;
          }
        } else {
          // This is our custom magic link - verify with our API
          const authResponse = await fetch('/api/auth/magic-link/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ token })
          });

          if (!authResponse.ok) {
            const errorData = await authResponse.json();
            setStatus('error');
            setMessage(errorData.error || 'Authentication failed.');
            return;
          }

          const authData = await authResponse.json();
          
          if (!authData.success) {
            setStatus('error');
            setMessage('Authentication failed. Please try again.');
            return;
          }

          // If we have user info but no session, redirect to sign in
          if (authData.user_id && authData.email) {
            setStatus('success');
            setMessage('Authentication successful! Redirecting to sign in...');
            setTimeout(() => {
              router.push(`/auth/signin?email=${encodeURIComponent(authData.email)}&magic=true`);
            }, 2000);
            return;
          }
        }

        // Success - we have a valid session
        setStatus('success');
        setMessage('Successfully authenticated! Redirecting to your dashboard...');

        // Start countdown
        const countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              router.push('/dashboard');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

      } catch (error) {
        logger.error('Magic link error:', error, { component: 'page', action: 'execution' });
        setStatus('error');
        setMessage('Something went wrong during authentication. Please try again.');
      }
    };

    handleMagicLink();
  }, [searchParams, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950 dark:via-blue-950 dark:to-indigo-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-purple-600 dark:text-purple-400 animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Authenticating...
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please wait while we verify your magic link
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950 dark:via-blue-950 dark:to-indigo-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome Back!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {message}
          </p>
          {countdown > 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-500">
              Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950 dark:via-blue-950 dark:to-indigo-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Authentication Failed
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="space-y-3">
          <Link
            href="/auth/signin"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
          >
            Try Magic Link Again
          </Link>
          <Link
            href="/auth/signin"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-purple-950 dark:via-blue-950 dark:to-indigo-950">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
        </div>
      }
    >
      <MagicLinkHandler />
    </Suspense>
  );
}
