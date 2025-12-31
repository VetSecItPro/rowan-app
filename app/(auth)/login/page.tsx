'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { RestoreAccountModal } from '@/components/settings/RestoreAccountModal';
import { useValidatedSearchParams, LoginParamsSchema } from '@/lib/hooks/useValidatedSearchParams';
import { logger } from '@/lib/logger';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState<{
    deletionRequestedAt: string;
    permanentDeletionAt: string;
  } | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();
  const { params } = useValidatedSearchParams(LoginParamsSchema);

  // Smooth fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Check if user was just registered
  useEffect(() => {
    if (params?.registered === 'true') {
      setSuccessMessage('Account created successfully! Please log in with your credentials.');
    }
  }, [params]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic client-side validation
    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setError('Invalid email or password. Please try again.');
        setIsLoading(false);
      } else {
        // Login successful - check if account is marked for deletion
        try {
          const response = await fetch('/api/user/cancel-deletion');
          const data = await response.json();

          if (data.markedForDeletion) {
            // Account is marked for deletion - show restoration modal
            setDeletionInfo({
              deletionRequestedAt: data.deletionRequestedAt,
              permanentDeletionAt: data.permanentDeletionAt,
            });
            setShowRestoreModal(true);
            setIsLoading(false);
          } else {
            // Account is not marked for deletion - proceed to redirect or dashboard
            setTimeout(() => {
              // Check for redirect parameter (e.g., from invitation signup flow)
              const redirectTo = params?.redirect ? decodeURIComponent(params.redirect) : '/dashboard';
              // Validate redirect is internal (security: prevent open redirect)
              const isInternalRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//');
              window.location.href = isInternalRedirect ? redirectTo : '/dashboard';
            }, 500);
          }
        } catch (checkError) {
          logger.error('Error checking deletion status:', checkError, { component: 'page', action: 'execution' });
          // If check fails, proceed to redirect or dashboard anyway (don't block login)
          setTimeout(() => {
            const redirectTo = params?.redirect ? decodeURIComponent(params.redirect) : '/dashboard';
            const isInternalRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//');
            window.location.href = isInternalRedirect ? redirectTo : '/dashboard';
          }, 500);
        }
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row transition-all duration-500">
      {/* Mobile Header - Green section with logo */}
      <div
        className={`lg:hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-900 pt-8 pb-12 px-4 transform transition-all duration-700 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
      >
        <Link href="/" className="flex flex-col items-center group">
          <Image
            src="/rowan-logo.png"
            alt="Rowan Logo"
            width={72}
            height={72}
            className="w-18 h-18 drop-shadow-2xl group-hover:scale-105 transition-transform duration-200"
          />
          <span className="mt-2 text-2xl font-bold text-white drop-shadow-lg">
            Rowan
          </span>
        </Link>
      </div>

      {/* Desktop Left side - Branding */}
      <div
        className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-900 flex-col items-center justify-center p-12 relative overflow-hidden transform transition-all duration-700 ${
          mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}
      >

        {/* Logo and branding */}
        <div className="relative z-10 text-center">
          {/* Logo and Rowan inline - Clickable to homepage */}
          <Link href="/" className="flex items-center justify-center gap-4 mb-8 group">
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={120}
              height={120}
              className="w-28 h-28 drop-shadow-2xl group-hover:scale-105 transition-transform duration-200"
            />
            <h1 className="text-6xl xl:text-7xl font-bold text-white drop-shadow-lg group-hover:scale-105 transition-transform duration-200">
              Rowan
            </h1>
          </Link>

          <p className="text-lg xl:text-xl text-emerald-100 dark:text-emerald-200 mb-8 text-center px-4">
            Collaborative life management for couples and families
          </p>
          <div className="space-y-4 text-lg text-emerald-100 dark:text-emerald-200 max-w-md mx-auto">
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-300 rounded-full flex-shrink-0"></span>
              Shared calendars & task management
            </p>
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-300 rounded-full flex-shrink-0"></span>
              Shopping lists & meal planning
            </p>
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-emerald-300 rounded-full flex-shrink-0"></span>
              Goal tracking & household management
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div
        className={`flex-1 lg:w-1/2 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 sm:p-8 transform transition-all duration-700 ${
          mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
        }`}
      >
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome Back
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to continue to Rowan
            </p>
          </div>

          {/* Login form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Success message */}
            {successMessage && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm leading-relaxed animate-in slide-in-from-top-2 duration-300">
                {successMessage}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm leading-relaxed animate-in slide-in-from-top-2 duration-300">
                {error}
              </div>
            )}

            {/* Email field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-base md:text-sm mobile-text-input"
                  placeholder="john@fake.com"
                  required
                  autoComplete="email"
                  autoCapitalize="none"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 text-base md:text-sm mobile-text-input"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 p-2 mobile-clickable"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Forgot password link */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors duration-200"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                href="/signup"
                className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-semibold transition-colors duration-200"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Restore Account Modal */}
      {deletionInfo && (
        <RestoreAccountModal
          isOpen={showRestoreModal}
          onClose={() => {
            setShowRestoreModal(false);
            // Allow user to continue to dashboard if they dismiss the modal
            router.push('/dashboard');
          }}
          deletionRequestedAt={deletionInfo.deletionRequestedAt}
          permanentDeletionAt={deletionInfo.permanentDeletionAt}
        />
      )}
    </div>
  );
}
