'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { LogIn, Mail, Lock, Eye, EyeOff, Sparkles, ArrowLeft, CheckCircle } from 'lucide-react';
import { RestoreAccountModal } from '@/components/settings/RestoreAccountModal';
import { useValidatedSearchParams, LoginParamsSchema } from '@/lib/hooks/useValidatedSearchParams';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [useMagicLink, setUseMagicLink] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isProcessingCallback, setIsProcessingCallback] = useState(false);
  const [deletionInfo, setDeletionInfo] = useState<{
    deletionRequestedAt: string;
    permanentDeletionAt: string;
  } | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();
  const { params } = useValidatedSearchParams(LoginParamsSchema);

  // Handle Supabase auth callback (magic link, OAuth, etc.)
  // This detects #access_token in URL hash and processes it
  useEffect(() => {
    const handleAuthCallback = async () => {
      // Check if URL has hash with access_token (Supabase callback)
      const hash = window.location.hash;
      if (!hash || !hash.includes('access_token')) return;

      setIsProcessingCallback(true);

      try {
        // Parse tokens from hash fragment
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in hash');
          setError('Invalid authentication response. Please try again.');
          setIsProcessingCallback(false);
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return;
        }

        const supabase = createClient();

        // Explicitly set the session with tokens from hash
        const { data: { session }, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        // Clear hash immediately to prevent reprocessing
        window.history.replaceState(null, '', window.location.pathname + window.location.search);

        if (sessionError) {
          console.error('Auth callback error:', sessionError);
          setError('Failed to complete sign in. Please try again.');
          setIsProcessingCallback(false);
          return;
        }

        if (session) {
          // Success! Get redirect target from query params
          const urlParams = new URLSearchParams(window.location.search);
          const redirectTo = urlParams.get('redirectTo') || '/dashboard';
          const isInternalRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//');

          // Redirect to dashboard
          window.location.href = isInternalRedirect ? redirectTo : '/dashboard';
          return;
        }

        setIsProcessingCallback(false);
      } catch (err) {
        console.error('Auth callback processing error:', err);
        setError('Something went wrong. Please try again.');
        setIsProcessingCallback(false);
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    };

    handleAuthCallback();
  }, []);

  // Smooth fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Check if user was just registered or verified
  useEffect(() => {
    if (params?.registered === 'true') {
      setSuccessMessage('Account created successfully! Please log in with your credentials.');
    }
    if (params?.verified === 'true') {
      setSuccessMessage('Email verified successfully! Please log in to continue.');
    }
    if (params?.email_changed === 'true') {
      setSuccessMessage('Email updated successfully! Please log in with your new email.');
    }
  }, [params]);

  // Handle magic link request
  const handleMagicLinkRequest = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Please enter your email address');
      setIsLoading(false);
      return;
    }

    try {
      const response = await csrfFetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send magic link. Please try again.');
      } else {
        setMagicLinkSent(true);
      }
    } catch (err) {
      logger.error('Magic link request error:', err, { component: 'page', action: 'execution' });
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  // Show loading state when processing auth callback (magic link, OAuth)
  if (isProcessingCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-950 via-teal-950 to-cyan-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-white">Signing you in...</h2>
          <p className="text-gray-400 mt-2">Please wait a moment</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row transition-all duration-500">
      {/* Mobile Header - Green section with logo */}
      <div
        className={`lg:hidden bg-gradient-to-br from-emerald-600 via-teal-600 from-emerald-900 to-cyan-900 pt-8 pb-12 px-4 transform transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
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
        className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-600 via-teal-600 from-emerald-900 to-cyan-900 flex-col items-center justify-center p-12 relative overflow-hidden transform transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
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

          <p className="text-lg xl:text-xl text-emerald-200 mb-8 text-center px-4">
            Collaborative life management for couples and families
          </p>
          <div className="space-y-4 text-lg text-emerald-200 max-w-md mx-auto">
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
        className="flex-1 lg:w-1/2 bg-gray-950 flex items-center justify-center p-4 sm:p-8"
      >
        <motion.div
          className="w-full max-w-md bg-gray-900/70 backdrop-blur-xl p-8 sm:p-10 rounded-3xl shadow-2xl border border-gray-800/50"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div className="mb-8" variants={itemVariants}>
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-gray-400 text-lg">
              Sign in to continue your journey
            </p>
          </motion.div>

          {/* Success message */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 bg-green-900/10 border border-green-800/50 text-green-400 px-4 py-3 rounded-2xl text-sm leading-relaxed overflow-hidden"
              >
                {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 bg-red-900/10 border border-red-800/50 text-red-400 px-4 py-3 rounded-2xl text-sm leading-relaxed overflow-hidden"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Magic Link Sent Success */}
          {magicLinkSent ? (
            <motion.div className="space-y-6" variants={itemVariants}>
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Check your email!
                </h3>
                <p className="text-gray-400 mb-4">
                  We sent a magic link to <strong className="text-white">{email}</strong>
                </p>
                <p className="text-sm text-gray-500">
                  Click the link in your email to sign in instantly. The link expires in 15 minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMagicLinkSent(false);
                  setUseMagicLink(false);
                  setEmail('');
                }}
                className="w-full text-gray-400 hover:text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login options
              </button>
            </motion.div>
          ) : useMagicLink ? (
            /* Magic Link Form */
            <motion.form onSubmit={handleMagicLinkRequest} className="space-y-6" variants={itemVariants}>
              {/* Email field */}
              <div>
                <label htmlFor="magic-email" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
                  <input
                    id="magic-email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300 text-base md:text-sm shadow-sm"
                    placeholder="john@example.com"
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-xs text-gray-400 ml-1">
                  We&apos;ll send you a link to sign in without a password.
                </p>
              </div>

              {/* Send magic link button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-gray-900 transform hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Send Magic Link
                  </>
                )}
              </button>

              {/* Back to password */}
              <button
                type="button"
                onClick={() => {
                  setUseMagicLink(false);
                  setError('');
                }}
                className="w-full text-gray-400 hover:text-white font-semibold py-2 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Sign in with password instead
              </button>
            </motion.form>
          ) : (
            /* Password Login Form */
            <motion.form onSubmit={handleSubmit} className="space-y-6" variants={itemVariants}>
              {/* Email field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    data-testid="login-email-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 text-base md:text-sm shadow-sm"
                    placeholder="john@example.com"
                    required
                    autoComplete="email"
                    autoCapitalize="none"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    data-testid="login-password-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-14 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 text-base md:text-sm shadow-sm"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors duration-200 p-2"
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
              <div className="flex justify-end pr-1">
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors duration-200"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign in button */}
              <button
                type="submit"
                data-testid="login-submit-button"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-gray-900 transform hover:-translate-y-0.5"
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

              {/* Divider */}
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-gray-900/70 backdrop-blur-sm text-gray-400 font-medium tracking-wider uppercase text-[10px]">or continued with</span>
                </div>
              </div>

              {/* Magic link button */}
              <button
                type="button"
                onClick={() => {
                  setUseMagicLink(true);
                  setError('');
                }}
                className="w-full bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 border border-gray-700 shadow-sm transform hover:-translate-y-0.5"
              >
                <Sparkles className="w-5 h-5 text-purple-500" />
                Sign in with Magic Link
              </button>
            </motion.form>
          )}

          {/* Sign up link */}
          <motion.div className="mt-8 text-center" variants={itemVariants}>
            <p className="text-gray-400 text-md">
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-all duration-200 hover:underline"
              >
                Create Account
              </Link>
            </p>
          </motion.div>
        </motion.div>
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
