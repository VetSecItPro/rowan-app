'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useValidatedSearchParams, AuthCallbackParamsSchema } from '@/lib/hooks/useValidatedSearchParams';

function ResetPasswordForm() {
  const router = useRouter();
  const { params, error: validationError } = useValidatedSearchParams(AuthCallbackParamsSchema);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Check if we have the necessary tokens/session
  const [hasValidSession, setHasValidSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      // Check for validation errors first
      if (validationError) {
        setError('Invalid reset link format');
        setIsCheckingSession(false);
        return;
      }

      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      // Check if user came here from a password reset link (Supabase native)
      const accessToken = params?.access_token;
      const refreshToken = params?.refresh_token;

      // Check if user came here from our custom reset link
      const customToken = params?.token;

      if (accessToken && refreshToken) {
        // User clicked Supabase native password reset link
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (sessionError) {
            setError('Invalid or expired reset link. Please request a new password reset.');
          } else {
            setHasValidSession(true);
          }
        } catch (err) {
          setError('Failed to validate reset link. Please try again.');
        }
      } else if (customToken) {
        // User clicked our custom reset link - validate the token
        try {
          const response = await fetch(`/api/auth/password-reset/verify?token=${customToken}`);
          const data = await response.json();

          if (data.valid) {
            setHasValidSession(true);
          } else {
            setError(data.error || 'Invalid or expired reset link. Please request a new password reset.');
          }
        } catch (err) {
          setError('Failed to validate reset link. Please try again.');
        }
      } else if (session) {
        // User is already logged in
        setHasValidSession(true);
      } else {
        setError('No valid reset session found. Please request a new password reset.');
      }

      setIsCheckingSession(false);
    };

    checkSession();
  }, [params, validationError]);

  const validatePassword = (pwd: string): string[] => {
    const errors: string[] = [];

    if (pwd.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(pwd)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(pwd)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(pwd)) {
      errors.push('Password must contain at least one number');
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      setError(passwordErrors.join('. '));
      return;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const customToken = params?.token;

      if (customToken) {
        // Use our custom password reset API
        const response = await fetch('/api/auth/password-reset/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: customToken,
            password: password
          })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError(data.error || 'Failed to update password. Please try again.');
          return;
        }
      } else {
        // Use Supabase's built-in password update (for native reset links)
        const supabase = createClient();
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        });

        if (updateError) {
          setError('Failed to update password. Please try again.');
          return;
        }
      }

      setSuccess(true);

      // Redirect to sign-in page after 2 seconds
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);

    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Password Updated!
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your password has been successfully updated. Redirecting you to the dashboard...
          </p>
          <div className="animate-pulse text-sm text-gray-500 dark:text-gray-500">
            Please wait...
          </div>
        </div>
      </div>
    );
  }

  if (!hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Reset Link
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'This password reset link is invalid or has expired. Please request a new one.'}
          </p>
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-slate-600 dark:text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Reset Your Password
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please enter your new password below
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white pr-12 text-base md:text-sm mobile-text-input"
                placeholder="Enter your new password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 mobile-clickable"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white pr-12 text-base md:text-sm mobile-text-input"
                placeholder="Confirm your new password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-2 mobile-clickable"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Password Requirements */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Password Requirements:
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• At least 8 characters long</li>
              <li>• One uppercase letter (A-Z)</li>
              <li>• One lowercase letter (a-z)</li>
              <li>• One number (0-9)</li>
            </ul>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !password || !confirmPassword}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Updating Password...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Update Password
              </>
            )}
          </button>
        </form>

        {/* Back to Sign In */}
        <div className="mt-6 text-center">
          <Link
            href="/auth/signin"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-50 dark:from-slate-950 dark:via-gray-950 dark:to-zinc-950">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
