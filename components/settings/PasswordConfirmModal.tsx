'use client';

import { useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';

interface PasswordConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmButtonText?: string;
}

export function PasswordConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Your Password',
  description = 'Please enter your password to confirm this action.',
  confirmButtonText = 'Confirm'
}: PasswordConfirmModalProps) {
  const [password, setPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

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
        setError('Unable to verify user');
        setIsVerifying(false);
        return;
      }

      // Verify password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (signInError) {
        setError('Incorrect password');
        setIsVerifying(false);
        return;
      }

      // Password verified, proceed with action
      onConfirm();
      handleClose();
    } catch {
      setError('Failed to verify password');
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    setIsVerifying(false);
    onClose();
  };

  const footerContent = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleClose}
        disabled={isVerifying}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="password-confirm-form"
        disabled={isVerifying || !password.trim()}
        className="flex-1 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-full transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Shield className="w-4 h-4" />
        {isVerifying ? 'Verifying...' : confirmButtonText}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="md"
      headerGradient="bg-orange-500"
      footer={footerContent}
    >
      <form id="password-confirm-form" onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-start gap-3 p-4 bg-orange-900/20 border border-orange-800 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-orange-200">
            {description}
          </p>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
            Current Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-white placeholder-gray-500"
            placeholder="Enter your password"
            disabled={isVerifying}
            autoFocus
          />
          {error && (
            <p className="mt-2 text-sm text-red-400">{error}</p>
          )}
        </div>
      </form>
    </Modal>
  );
}