'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Smooth fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Check if user was just registered
  useEffect(() => {
    if (searchParams?.get('registered') === 'true') {
      setSuccessMessage('Account created successfully! Please log in with your credentials.');
    }
  }, [searchParams]);

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
        // Login successful - wait for cookies to be written, then full page reload
        // Give Supabase time to write session cookies before redirecting
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex transition-all duration-500">
      {/* Left side - Branding */}
      <div
        className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 dark:from-purple-900 dark:via-indigo-900 dark:to-blue-900 flex-col items-center justify-center p-12 relative overflow-hidden transform transition-all duration-700 ${
          mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
        }`}
      >
        {/* Animated background shimmer effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -inset-[10px] opacity-20">
            <div className="shimmer-gradient w-full h-full" />
          </div>
        </div>

        {/* Logo and branding */}
        <div className="relative z-10 text-center">
          {/* Logo and Rowan inline */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={120}
              height={120}
              className="w-28 h-28 drop-shadow-2xl transform hover:scale-110 transition-transform duration-300"
            />
            <h1 className="text-6xl xl:text-7xl font-bold text-white drop-shadow-lg">
              Rowan
            </h1>
          </div>

          <p className="text-lg xl:text-xl text-purple-100 dark:text-purple-200 mb-8 text-center px-4">
            Collaborative life management for couples and families
          </p>
          <div className="space-y-4 text-lg text-purple-100 dark:text-purple-200 max-w-md mx-auto">
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-purple-300 rounded-full flex-shrink-0"></span>
              Shared calendars & task management
            </p>
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-purple-300 rounded-full flex-shrink-0"></span>
              Shopping lists & meal planning
            </p>
            <p className="flex items-center gap-3">
              <span className="w-2 h-2 bg-purple-300 rounded-full flex-shrink-0"></span>
              Goal tracking & household management
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div
        className={`w-full lg:w-1/2 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 sm:p-8 transform transition-all duration-700 ${
          mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
        }`}
      >
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Image
              src="/rowan-logo.png"
              alt="Rowan Logo"
              width={64}
              height={64}
              className="w-16 h-16"
            />
          </div>

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
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-3 rounded-lg text-sm animate-in slide-in-from-top-2 duration-300">
                {successMessage}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm animate-in slide-in-from-top-2 duration-300">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="john@fake.com"
                  required
                  autoComplete="email"
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
                  className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
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
                href="/reset-password"
                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors duration-200"
              >
                Forgot password?
              </Link>
            </div>

            {/* Sign in button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold transition-colors duration-200"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
