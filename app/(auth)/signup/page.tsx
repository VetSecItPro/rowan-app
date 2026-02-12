'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { UserPlus, Mail, Lock, User, Home, Eye, EyeOff, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 }
};

export default function SignUpPage() {
  const { signUp, signOut } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get invite token from URL params (for users invited to a space)
  const inviteToken = searchParams.get('invite_token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [spaceName, setSpaceName] = useState('My Space');
  const [spaceTouched, setSpaceTouched] = useState(false);
  const [colorTheme, setColorTheme] = useState('emerald');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);

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

  const trimmedName = name.trim();
  const defaultSpaceName = 'My Space';
  const derivedSpaceName = trimmedName
    ? `${trimmedName.split(' ')[0]}'s Space`
    : defaultSpaceName;
  const effectiveSpaceName = spaceTouched ? spaceName : derivedSpaceName;

  // Password requirement checks for real-time feedback
  const passwordChecks = {
    length: password.length >= 10,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

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

    // Frontend validation matching backend requirements
    if (password.length < 10) {
      setError('Password must be at least 10 characters long');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain at least one number');
      return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      setError('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
      return;
    }

    // Check password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(
      email,
      password,
      {
        name,
        color_theme: colorTheme,
        space_name: effectiveSpaceName,
        marketing_emails_enabled: emailOptIn,
      },
      inviteToken || undefined
    );

    if (error) {
      // Handle specific error cases with user-friendly messages
      if (error.message.includes('already registered') || error.message.includes('already exists')) {
        setError('An account with this email already exists');
      } else if (error.message.includes('Service temporarily unavailable')) {
        setError('Service temporarily unavailable. Please try again in a few minutes.');
      } else if (error.message.includes('Connection problem')) {
        setError('Connection problem. Please check your internet and try again.');
      } else if (error.message.includes('Too many requests')) {
        setError('Too many signup attempts. Please try again later.');
      } else if (error.message.includes('Invalid email')) {
        setError('Please enter a valid email address.');
      } else {
        // Show the actual error message from the API (Supabase errors are already user-friendly)
        setError(error.message);
      }
      setIsLoading(false);
    } else {
      // Show success message
      setAccountCreated(true);

      // Wait 2 seconds before redirecting
      setTimeout(async () => {
        // Sign out the user to force them to log in again (bot prevention)
        await signOut();

        // If user signed up via invitation, redirect to login with a hint to accept invitation
        // The invitation will be accepted after they log in
        // NOTE: The redirect URL must be URL-encoded to preserve the token parameter
        if (inviteToken) {
          const redirectUrl = `/invitations/accept?token=${encodeURIComponent(inviteToken)}`;
          router.push(`/login?registered=true&redirect=${encodeURIComponent(redirectUrl)}`);
        } else {
          // Regular signup - just go to login
          router.push('/login?registered=true');
        }
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row transition-all duration-500">
      {/* Mobile Header - Green section with logo */}
      <div
        className={`lg:hidden bg-black pt-8 pb-12 px-4 transform transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
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
        className={`hidden lg:flex lg:w-1/2 bg-black flex-col items-center justify-center p-12 relative overflow-hidden transform transition-all duration-700 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
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

      {/* Right side - Sign up form */}
      <div
        className="flex-1 lg:w-1/2 bg-gray-950 flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
      >
        <motion.div
          className="w-full max-w-md py-10 bg-gray-900/95 p-8 sm:p-10 rounded-3xl shadow-2xl border border-gray-800/50 my-8"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Header */}
          <motion.div className="mb-8" variants={itemVariants}>
            <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight">
              {accountCreated ? 'Welcome to Rowan!' : 'Create Account'}
            </h2>
            <p className="text-gray-400 text-lg">
              {accountCreated ? 'Redirecting you to login...' : 'Start your collaborative journey'}
            </p>
          </motion.div>

          {/* Sign up form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Name Field */}
            <motion.div variants={itemVariants}>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                <input
                  id="name"
                  type="text"
                  data-testid="signup-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 text-base md:text-sm shadow-sm"
                  placeholder="Alex Johnson"
                  disabled={isLoading}
                  autoFocus
                  autoComplete="name"
                  autoCapitalize="words"
                />
              </div>
            </motion.div>

            {/* Email Field */}
            <motion.div variants={itemVariants}>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  data-testid="signup-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 text-base md:text-sm shadow-sm"
                  placeholder="alex@example.com"
                  disabled={isLoading}
                  autoComplete="email"
                  autoCapitalize="none"
                />
              </div>
            </motion.div>

            {/* Password Field */}
            <motion.div variants={itemVariants}>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  data-testid="signup-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={10}
                  className="w-full pl-12 pr-14 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 text-base md:text-sm shadow-sm"
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors p-2"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <div className="mt-3 space-y-2">
                  {/* Strength Bar */}
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${passwordStrength >= level
                          ? passwordStrength <= 2
                            ? 'bg-red-500'
                            : passwordStrength <= 3
                              ? 'bg-yellow-500'
                              : passwordStrength <= 4
                                ? 'bg-blue-500'
                                : 'bg-emerald-500'
                          : 'bg-gray-700'
                          }`}
                      />
                    ))}
                  </div>
                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    <div className={`flex items-center gap-1.5 ${passwordChecks.length ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {passwordChecks.length ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>10+ characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordChecks.uppercase ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {passwordChecks.uppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordChecks.lowercase ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {passwordChecks.lowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>Lowercase (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${passwordChecks.number ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {passwordChecks.number ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>Number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1.5 col-span-2 ${passwordChecks.special ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {passwordChecks.special ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                      <span>Special (!@#$%^&amp;*)</span>
                    </div>
                  </div>
                </div>
              )}
              {password.length === 0 && (
                <p className="mt-1 text-xs text-gray-400 ml-1">
                  10+ characters with uppercase, lowercase, number, and special character
                </p>
              )}
            </motion.div>

            {/* Confirm Password Field */}
            <motion.div variants={itemVariants}>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={10}
                  className="w-full pl-12 pr-24 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 text-base md:text-sm shadow-sm"
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {confirmPassword && password && confirmPassword === password && (
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Match
                    </span>
                  )}
                  {confirmPassword && password && confirmPassword !== password && (
                    <span className="text-xs font-semibold text-red-400">
                      No match
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-300 transition-colors p-2"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Space Name */}
            <motion.div variants={itemVariants}>
              <label htmlFor="spaceName" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                Space Name <span className="text-red-500">*</span>
              </label>
              <div className="relative group">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                <input
                  id="spaceName"
                  type="text"
                  value={effectiveSpaceName}
                  onChange={(e) => {
                    if (!spaceTouched) {
                      setSpaceTouched(true);
                    }
                    setSpaceName(e.target.value);
                  }}
                  required
                  className="w-full pl-12 pr-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-300 text-base md:text-sm shadow-sm"
                  placeholder="Samira's Space"
                  disabled={isLoading}
                />
              </div>
            </motion.div>

            {/* Color Theme Selector */}
            <motion.div variants={itemVariants}>
              <label htmlFor="colorTheme" className="block text-sm font-semibold text-gray-300 mb-2 ml-1">
                Choose your color theme
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorDropdown(!showColorDropdown)}
                  disabled={isLoading}
                  className="w-full px-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all duration-300 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg shadow-lg ${getColorClasses(colorTheme)}`} />
                    <span className="font-semibold">
                      {colorThemes.find((t) => t.value === colorTheme)?.label || 'Select a color'}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showColorDropdown ? 'rotate-180' : ''
                      }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {showColorDropdown && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="absolute z-10 w-full mt-2 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl max-h-64 overflow-y-auto"
                  >
                    {colorThemes.map((theme) => (
                      <button
                        key={theme.value}
                        type="button"
                        onClick={() => {
                          setColorTheme(theme.value);
                          setShowColorDropdown(false);
                        }}
                        disabled={isLoading}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg shadow-md flex-shrink-0 ${getColorClasses(theme.value)}`} />
                        <span className="flex-1 font-semibold text-white text-sm">
                          {theme.label}
                        </span>
                        {colorTheme === theme.value && (
                          <Check className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>

            {/* Email Opt-in */}
            <motion.div
              variants={itemVariants}
              className="flex items-start gap-4 p-5 bg-blue-900/10 border border-blue-800/50 rounded-2xl"
            >
              <input
                type="checkbox"
                id="emailOptIn"
                checked={emailOptIn}
                onChange={(e) => setEmailOptIn(e.target.checked)}
                disabled={isLoading}
                className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded-lg focus:ring-blue-500/50 transition-all duration-200 mt-1 cursor-pointer"
              />
              <label htmlFor="emailOptIn" className="text-sm text-blue-100 cursor-pointer">
                <span className="font-bold">Stay updated with Rowan</span>
                <p className="text-blue-300 mt-1.5 leading-relaxed">
                  Receive occasional updates about new features and tips. You can unsubscribe anytime.
                </p>
                <span className="block text-[11px] mt-2 text-blue-400 font-medium uppercase tracking-wider">
                  From Rowan only • Never shared with third parties
                </span>
              </label>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              variants={itemVariants}
              type="submit"
              data-testid="signup-submit-button"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-gray-900 transform hover:-translate-y-0.5"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create Your Account
                </>
              )}
            </motion.button>
          </form>

          {/* Sign in link */}
          <motion.div className="mt-8 text-center" variants={itemVariants}>
            <p className="text-gray-400 text-md font-medium">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-emerald-400 hover:text-emerald-300 font-bold transition-all duration-200 hover:underline"
              >
                Sign In
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
