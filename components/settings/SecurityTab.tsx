'use client';

import React, { useState, useEffect } from 'react';
import { Key, Monitor, Shield, Mail, Check, AlertTriangle, X } from 'lucide-react';
import { useActiveSessions } from '@/lib/hooks/useActiveSessions';
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm';
import { TwoFactorAuth } from '@/components/ui/DynamicSettingsComponents';
import { createClient } from '@/lib/supabase/client';
import { showError } from '@/lib/utils/toast';
import { logger } from '@/lib/logger';

interface SecurityTabProps {
  userEmail: string;
}

export const SecurityTab = React.memo(({ userEmail }: SecurityTabProps) => {
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const {
    activeSessions,
    isLoadingSessions,
    sessionToRevoke,
    setSessionToRevoke,
    showRevokeSessionModal,
    setShowRevokeSessionModal,
    fetchActiveSessions,
    handleRevokeSession,
  } = useActiveSessions();

  useEffect(() => {
    fetchActiveSessions();
  }, [fetchActiveSessions]);

  const handleRequestPasswordReset = async () => {
    if (!userEmail) return;
    setIsRequestingReset(true);

    const supabase = createClient();

    try {
      // SECURITY: Only allow password reset for current user's email
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        logger.error('Password reset error:', error, { component: 'SecurityTab', action: 'execution' });
        showError('Failed to send password reset email. Please try again.');
      } else {
        setResetEmailSent(true);
      }
    } catch (error) {
      logger.error('Error requesting password reset:', error, { component: 'SecurityTab', action: 'execution' });
      showError('An unexpected error occurred. Please try again.');
    } finally {
      setIsRequestingReset(false);
    }
  };

  return (
    <>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-900/40 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Security Settings</h2>
            <p className="text-sm sm:text-base text-gray-400">Manage your password and authentication methods</p>
          </div>
        </div>

        {/* Password Reset */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Key className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            </div>
            <div className="flex-1 w-full">
              <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Reset Password</h3>
              <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                We&apos;ll send you an email with a secure link to reset your password
              </p>

              {resetEmailSent ? (
                <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg mb-3">
                  <div className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-200">Password reset email sent!</p>
                      <p className="text-xs text-green-300 mt-1">
                        Check your inbox at <span className="font-semibold">{userEmail}</span> for instructions to reset your password.
                      </p>
                      <p className="text-xs text-green-400 mt-2">
                        Didn&apos;t receive it? Check your spam folder or{' '}
                        <button
                          onClick={() => {
                            setResetEmailSent(false);
                            handleRequestPasswordReset();
                          }}
                          className="btn-touch underline hover:no-underline font-medium transition-all active:scale-95 text-green-400 hover:text-green-300"
                        >
                          resend the email
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg mb-4">
                    <p className="text-xs text-blue-300">
                      <strong>Reset link will be sent to:</strong> {userEmail}
                    </p>
                    <p className="text-xs text-blue-400 mt-1">
                      For security, password reset is only allowed for your current email address.
                    </p>
                  </div>
                  <button
                    onClick={handleRequestPasswordReset}
                    disabled={isRequestingReset}
                    className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-purple-600 text-white rounded-lg sm:rounded-xl hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isRequestingReset ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4" />
                        Send Reset Email
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <ChangePasswordForm />

        {/* Two-Factor Authentication */}
        <TwoFactorAuth />

        {/* Active Sessions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Active Sessions</h3>
              <p className="text-sm text-gray-400">Sessions are automatically tracked when you sign in</p>
            </div>
            <button
              onClick={fetchActiveSessions}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Refresh
            </button>
          </div>
          {isLoadingSessions ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-900/50 border border-gray-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="p-6 bg-gray-900/50 border border-gray-700 rounded-xl text-center">
              <p className="text-sm text-gray-400">No active sessions found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-white">{session.device}</p>
                      <p className="text-xs text-gray-400">{session.location} • {session.lastActive}</p>
                    </div>
                  </div>
                  {session.isCurrent ? (
                    <span className="text-xs text-green-400 font-medium">Current</span>
                  ) : (
                    <button
                      onClick={() => {
                        setSessionToRevoke(session.id);
                        setShowRevokeSessionModal(true);
                      }}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Revoke Session Modal */}
      {showRevokeSessionModal && sessionToRevoke && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Revoke Session</h3>
              </div>
              <button onClick={() => setShowRevokeSessionModal(false)} className="text-gray-500 text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to revoke this session? The device will be logged out immediately.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRevokeSessionModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeSession}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                Revoke Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

SecurityTab.displayName = 'SecurityTab';
