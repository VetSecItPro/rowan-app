'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Users, Calendar, Ticket, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

interface BetaAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (inviteCodeId?: string) => void;
  onSwitchToLaunch?: () => void;
}

interface BetaStatus {
  slots_remaining: number;
  max_users: number;
  current_users: number;
  beta_ends_at: string;
  beta_ended: boolean;
  at_capacity: boolean;
}

type ViewMode = 'choice' | 'email' | 'code' | 'email-success';

export function BetaAccessModal({ isOpen, onClose, onSuccess, onSwitchToLaunch }: BetaAccessModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('choice');
  const [inviteCode, setInviteCode] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [betaStatus, setBetaStatus] = useState<BetaStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Fetch beta status on mount
  useEffect(() => {
    if (isOpen) {
      fetchBetaStatus();
    }
  }, [isOpen]);

  const fetchBetaStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const response = await fetch('/api/beta/validate');
      if (response.ok) {
        const data = await response.json();
        setBetaStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch beta status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Format invite code as user types (XXXX-XXXX-XXXX)
  const handleCodeChange = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

    // Add dashes after every 4 characters
    let formatted = '';
    for (let i = 0; i < cleaned.length && i < 12; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += '-';
      }
      formatted += cleaned[i];
    }

    setInviteCode(formatted);
    setError('');
  };

  // Request beta access via email
  const handleEmailRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/beta/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name: name || undefined }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific errors
        if (data.already_registered) {
          throw new Error('This email already has a beta account. Please log in instead.');
        }
        if (data.at_capacity) {
          setBetaStatus(prev => prev ? { ...prev, at_capacity: true, slots_remaining: 0 } : null);
          return;
        }
        throw new Error(data.error || 'Failed to request beta access');
      }

      if (data.success) {
        setViewMode('email-success');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Validate invite code
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/beta/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inviteCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle capacity reached
        if (data.at_capacity) {
          setError('');
          setBetaStatus(prev => prev ? { ...prev, at_capacity: true, slots_remaining: 0 } : null);
          return;
        }
        throw new Error(data.error || 'Validation failed');
      }

      if (data.success) {
        // Pass the actual invite code (not just the ID) so it can be used in signup URL
        onSuccess(inviteCode);
        onClose();
      } else {
        setError(data.error || 'Invalid invite code');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setEmail('');
    setName('');
    setError('');
    setIsLoading(false);
    setViewMode('choice');
    onClose();
  };

  const handleBack = () => {
    setError('');
    setViewMode('choice');
  };

  // Show capacity reached state
  if (betaStatus?.at_capacity || betaStatus?.beta_ended) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Beta Program"
        maxWidth="md"
      >
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {betaStatus.beta_ended ? 'Beta Program Has Ended' : 'Beta Program Full'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {betaStatus.beta_ended
                ? 'The beta testing period has concluded. Thank you to all our testers!'
                : `We've reached our limit of ${betaStatus.max_users} beta testers. Thank you for your interest!`
              }
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              Don't miss our launch!
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
              Sign up to be notified when Rowan officially launches with all features.
            </p>
            <button
              onClick={() => {
                handleClose();
                onSwitchToLaunch?.();
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Get Launch Notification
            </button>
          </div>

          <button
            onClick={handleClose}
            className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>
    );
  }

  // Email success view
  if (viewMode === 'email-success') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Check Your Email!"
        maxWidth="md"
      >
        <div className="space-y-6 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>

          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Your invite code is on its way!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              We've sent a beta invite code to <span className="font-medium text-gray-900 dark:text-white">{email}</span>
            </p>
          </div>

          {/* Spam folder notice */}
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-start gap-3">
            <span className="text-amber-500 text-lg">📬</span>
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <span className="font-medium">Can't find it?</span> Check your spam or junk folder. Emails sometimes end up there by mistake.
            </div>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              What's next:
            </h4>
            <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
              <li>Check your inbox (and spam folder)</li>
              <li>Copy the invite code from the email</li>
              <li>Click the link in the email or return here</li>
              <li>Enter your code to create your account</li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setViewMode('code');
                setError('');
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              I have my code - Enter it now
            </button>
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Beta Access"
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Beta Stats */}
        {!isLoadingStatus && betaStatus && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Spots Left</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {betaStatus.slots_remaining}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                of {betaStatus.max_users}
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-center">
              <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400 mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Ends On</span>
              </div>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                Feb 15
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400">
                2026
              </p>
            </div>
          </div>
        )}

        {/* Choice View - Select how to get access */}
        {viewMode === 'choice' && (
          <>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Join Rowan Beta!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Be one of 100 early testers with full access to all features.
              </p>
            </div>

            <div className="space-y-3">
              {/* Request via Email */}
              <button
                onClick={() => setViewMode('email')}
                className="w-full p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all group text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      Request an Invite Code
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Enter your email and we'll send you an invite code instantly
                    </p>
                  </div>
                </div>
              </button>

              {/* Already have a code */}
              <button
                onClick={() => setViewMode('code')}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-400 dark:hover:border-gray-500 transition-all group text-left"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                      I Have an Invite Code
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Already received a code? Enter it here to join
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Alternative */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Just want to stay updated?{' '}
                <button
                  onClick={() => {
                    handleClose();
                    onSwitchToLaunch?.();
                  }}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Get launch notifications
                </button>
              </p>
            </div>
          </>
        )}

        {/* Email Request View */}
        {viewMode === 'email' && (
          <>
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Get Your Invite Code
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Enter your email and we'll send you an invite code right away.
              </p>
            </div>

            <form onSubmit={handleEmailRequest} className="space-y-4">
              {/* Name Field (optional) */}
              <div>
                <label htmlFor="beta-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  id="beta-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your first name"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                  disabled={isLoading}
                />
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="beta-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    id="beta-email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white"
                    required
                    disabled={isLoading}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  We'll send your invite code to this address
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !email.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Sending...
                    </>
                  ) : (
                    'Send Invite Code'
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Code Entry View */}
        {viewMode === 'code' && (
          <>
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Enter Your Invite Code
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Enter the 12-character code from your invitation email.
              </p>
            </div>

            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div>
                <label htmlFor="invite-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Invite Code
                </label>
                <div className="relative">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    id="invite-code"
                    value={inviteCode}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX"
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white font-mono text-lg tracking-wider text-center uppercase"
                    required
                    disabled={isLoading}
                    maxLength={14}
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm font-medium">
                    {error}
                  </p>
                </div>
              )}

              {/* Info Box */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">
                  What to expect in beta:
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Full access to all features until Feb 15, 2026</li>
                  <li>• Limited to 100 beta testers</li>
                  <li>• Your feedback shapes the final product</li>
                  <li>• Easy transition to paid account at launch</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="px-6 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || inviteCode.replace(/-/g, '').length < 12}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Validating...
                    </>
                  ) : (
                    'Join Beta'
                  )}
                </button>
              </div>
            </form>

            {/* Alternative */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Don't have an invite code?{' '}
                <button
                  onClick={() => setViewMode('email')}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Request one now
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
