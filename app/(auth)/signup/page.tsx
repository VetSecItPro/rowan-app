'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { UserPlus, Mail, Lock, User, Heart, Home, Eye, EyeOff, ChevronDown, Check } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [spaceName, setSpaceName] = useState('');
  const [colorTheme, setColorTheme] = useState('emerald');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const { signUp, signOut } = useAuth();
  const router = useRouter();

  // Smooth fade-in animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const colorThemes = [
    { value: 'emerald', label: 'Emerald' },
    { value: 'purple', label: 'Purple' },
    { value: 'blue', label: 'Blue' },
    { value: 'orange', label: 'Orange' },
    { value: 'pink', label: 'Pink' },
    { value: 'indigo', label: 'Indigo' },
    { value: 'teal', label: 'Teal' },
    { value: 'red', label: 'Red' },
    { value: 'amber', label: 'Amber' },
    { value: 'lime', label: 'Lime' },
    { value: 'cyan', label: 'Cyan' },
    { value: 'fuchsia', label: 'Fuchsia' },
    { value: 'violet', label: 'Violet' },
    { value: 'sky', label: 'Sky' },
    { value: 'rose', label: 'Rose' },
    { value: 'mint', label: 'Mint' },
    { value: 'coral', label: 'Coral' },
    { value: 'lavender', label: 'Lavender' },
    { value: 'sage', label: 'Sage' },
    { value: 'slate', label: 'Slate' },
  ];

  const getColorClasses = (theme: string) => {
    switch (theme) {
      case 'emerald':
        return 'bg-gradient-to-br from-emerald-400 to-teal-500';
      case 'purple':
        return 'bg-gradient-to-br from-purple-400 to-pink-500';
      case 'blue':
        return 'bg-gradient-to-br from-blue-400 to-cyan-500';
      case 'orange':
        return 'bg-gradient-to-br from-orange-400 to-red-500';
      case 'pink':
        return 'bg-gradient-to-br from-pink-400 to-rose-500';
      case 'indigo':
        return 'bg-gradient-to-br from-indigo-400 to-purple-500';
      case 'teal':
        return 'bg-gradient-to-br from-teal-400 to-cyan-500';
      case 'red':
        return 'bg-gradient-to-br from-red-400 to-rose-500';
      case 'amber':
        return 'bg-gradient-to-br from-amber-400 to-orange-500';
      case 'lime':
        return 'bg-gradient-to-br from-lime-400 to-green-500';
      case 'cyan':
        return 'bg-gradient-to-br from-cyan-400 to-blue-500';
      case 'fuchsia':
        return 'bg-gradient-to-br from-fuchsia-400 to-pink-500';
      case 'violet':
        return 'bg-gradient-to-br from-violet-400 to-purple-500';
      case 'sky':
        return 'bg-gradient-to-br from-sky-400 to-blue-500';
      case 'rose':
        return 'bg-gradient-to-br from-rose-400 to-pink-500';
      case 'mint':
        return 'bg-gradient-to-br from-green-300 to-emerald-400';
      case 'coral':
        return 'bg-gradient-to-br from-orange-300 to-rose-400';
      case 'lavender':
        return 'bg-gradient-to-br from-purple-300 to-indigo-400';
      case 'sage':
        return 'bg-gradient-to-br from-gray-400 to-green-400';
      case 'slate':
        return 'bg-gradient-to-br from-slate-400 to-gray-500';
      default:
        return 'bg-gradient-to-br from-emerald-400 to-teal-500';
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, {
      name,
      pronouns: pronouns || undefined,
      color_theme: colorTheme,
      space_name: spaceName || undefined,
    });

    if (error) {
      if (error.message.includes('already registered')) {
        setError('An account with this email already exists');
      } else {
        setError(error.message || 'Failed to create account');
      }
      setIsLoading(false);
    } else {
      // Show success message
      setAccountCreated(true);

      // Wait 2 seconds before redirecting
      setTimeout(async () => {
        // Sign out the user to force them to log in again (bot prevention)
        await signOut();
        // Redirect to login page
        router.push('/login?registered=true');
      }, 2000);
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

      {/* Right side - Sign up form */}
      <div
        className={`w-full lg:w-1/2 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 sm:p-8 overflow-y-auto transform transition-all duration-700 ${
          mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
        }`}
      >
        <div className="w-full max-w-md py-8">
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
              {accountCreated ? 'Account created successfully!' : 'Create Your Account'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {accountCreated ? 'Redirecting you to login...' : 'Join Rowan to start collaborating'}
            </p>
          </div>

          {/* Sign up form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-base md:text-sm animate-in slide-in-from-top-2 duration-300">
                {error}
              </div>
            )}

            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="Alex Johnson"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="alex@example.com"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn-touch absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 active:scale-95 hover-lift shimmer-purple active-press"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must be at least 8 characters
              </p>
            </div>

            {/* Pronouns Field (Optional) */}
            <div>
              <label htmlFor="pronouns" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pronouns <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="pronouns"
                  type="text"
                  value={pronouns}
                  onChange={(e) => setPronouns(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 auth-input-field auth-magnetic-hover auth-ripple-effect hover-lift shimmer-purple"
                  placeholder="they/them, she/her, he/him, etc."
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Space Name (Optional) */}
            <div>
              <label htmlFor="spaceName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Create a Space <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="spaceName"
                  type="text"
                  value={spaceName}
                  onChange={(e) => setSpaceName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 auth-input-field auth-magnetic-hover auth-ripple-effect hover-lift shimmer-purple"
                  placeholder="Our Family, Team Workspace, etc."
                  disabled={isLoading}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                You can create or join a space later if you prefer
              </p>
            </div>

            {/* Color Theme Selector */}
            <div>
              <label htmlFor="colorTheme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Choose your color theme
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorDropdown(!showColorDropdown)}
                  disabled={isLoading}
                  className="btn-touch w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 flex items-center justify-between active:scale-[0.98] hover-lift shimmer-purple active-press"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg shadow-lg ${getColorClasses(colorTheme)}`} />
                    <span className="font-medium">
                      {colorThemes.find((t) => t.value === colorTheme)?.label || 'Select a color'}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      showColorDropdown ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {showColorDropdown && (
                  <div className="absolute z-10 w-full mt-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {colorThemes.map((theme) => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => {
                          setColorTheme(theme.value);
                          setShowColorDropdown(false);
                        }}
                        disabled={isLoading}
                        className="btn-touch w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left active:scale-[0.98] hover-lift shimmer-purple active-press"
                      >
                        <div className={`w-8 h-8 rounded-lg shadow-lg flex-shrink-0 ${getColorClasses(theme.value)}`} />
                        <span className="flex-1 font-medium text-gray-900 dark:text-white">
                          {theme.label}
                        </span>
                        {colorTheme === theme.value && (
                          <Check className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="btn-touch w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 auth-submit-button auth-magnetic-hover auth-ripple-effect hover-lift shimmer-purple active-press"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Sign in link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="btn-touch inline-block py-2 px-3 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-semibold transition-colors duration-200 rounded-md active:scale-95 hover-lift shimmer-purple active-press"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
