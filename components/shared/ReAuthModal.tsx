'use client';

import { useState, useCallback } from 'react';
import { Shield, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';

interface ReAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  /** Visual variant for the modal header and confirm button */
  variant?: 'danger' | 'warning' | 'default';
  /** Whether the parent operation is in progress (disables confirm after re-auth succeeds) */
  isProcessing?: boolean;
}

/**
 * ReAuthModal - Reusable re-authentication modal for sensitive operations.
 *
 * Verifies the user's password via Supabase `signInWithPassword` before
 * allowing a sensitive action (account deletion, password change, etc.).
 *
 * Usage:
 * ```tsx
 * <ReAuthModal
 *   isOpen={showReAuth}
 *   onClose={() => setShowReAuth(false)}
 *   onConfirm={(password) => handleSensitiveAction(password)}
 *   title="Confirm Account Deletion"
 *   description="Enter your password to permanently delete your account."
 *   confirmLabel="Delete My Account"
 *   variant="danger"
 * />
 * ```
 */
export function ReAuthModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Your Identity',
  description = 'For your security, please re-enter your password to continue.',
  confirmLabel = 'Confirm',
  variant = 'default',
  isProcessing = false,
}: ReAuthModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  const variantConfig = {
    danger: {
      headerGradient: 'bg-gradient-to-r from-red-600 to-red-700',
      confirmBg: 'bg-red-600 hover:bg-red-700',
      alertBg: 'bg-red-900/20',
      alertBorder: 'border-red-800',
      alertText: 'text-red-200',
      alertIcon: 'text-red-400',
    },
    warning: {
      headerGradient: 'bg-gradient-to-r from-orange-500 to-orange-600',
      confirmBg: 'bg-orange-500 hover:bg-orange-600',
      alertBg: 'bg-orange-900/20',
      alertBorder: 'border-orange-800',
      alertText: 'text-orange-200',
      alertIcon: 'text-orange-400',
    },
    default: {
      headerGradient: 'bg-gradient-to-r from-purple-600 to-blue-600',
      confirmBg: 'bg-purple-600 hover:bg-purple-700',
      alertBg: 'bg-purple-900/20',
      alertBorder: 'border-purple-800',
      alertText: 'text-purple-200',
      alertIcon: 'text-purple-400',
    },
  };

  const config = variantConfig[variant];

  const resetState = useCallback(() => {
    setPassword('');
    setShowPassword(false);
    setError('');
    setIsVerifying(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user?.email) {
        setError('Unable to verify your identity. Please try signing in again.');
        setIsVerifying(false);
        return;
      }

      // Verify password by attempting to sign in with current credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        setError('Incorrect password. Please try again.');
        setIsVerifying(false);
        return;
      }

      // Password verified - invoke the callback with the verified password
      onConfirm(password);
      resetState();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsVerifying(false);
    }
  };

  const isDisabled = isVerifying || isProcessing;

  const footerContent = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleClose}
        disabled={isDisabled}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="reauth-form"
        disabled={isDisabled || !password.trim()}
        className={`flex-1 px-6 py-3 ${config.confirmBg} text-white rounded-full transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Verifying...
          </>
        ) : isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            {confirmLabel}
          </>
        )}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="md"
      headerGradient={config.headerGradient}
      footer={footerContent}
    >
      <form id="reauth-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Security notice */}
        <div className={`flex items-start gap-3 p-4 ${config.alertBg} border ${config.alertBorder} rounded-lg`}>
          <AlertTriangle className={`w-5 h-5 ${config.alertIcon} mt-0.5 flex-shrink-0`} />
          <p className={`text-sm ${config.alertText}`}>
            {description}
          </p>
        </div>

        {/* Password input */}
        <div>
          <label htmlFor="reauth-password" className="block text-sm font-medium text-gray-300 mb-2">
            Current Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="reauth-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              autoComplete="current-password"
              className="w-full px-4 py-3 pr-12 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-white placeholder-gray-500"
              placeholder="Enter your password"
              disabled={isDisabled}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-400" role="alert">{error}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}
