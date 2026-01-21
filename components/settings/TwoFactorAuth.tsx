'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Smartphone, X, Key, QrCode, Copy, Check } from 'lucide-react';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

interface TwoFactorAuthProps {
  onStatusChange?: (enabled: boolean) => void;
}

interface MFAFactor {
  id: string;
  friendly_name: string;
  factor_type: string;
  status: string;
}

export function TwoFactorAuth({ onStatusChange }: TwoFactorAuthProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [mfaFactor, setMfaFactor] = useState<MFAFactor | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);

  // Setup state
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  const loadMFAStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/mfa/enroll');
      const result = await response.json();

      if (result.success) {
        const enabled = result.data.is_enrolled;
        setIsEnabled(enabled);

        if (result.data.factors.length > 0) {
          setMfaFactor(result.data.factors[0]);
        }

        if (onStatusChange) {
          onStatusChange(enabled);
        }
      }
    } catch (error) {
      logger.error('Error loading MFA status:', error, { component: 'TwoFactorAuth', action: 'component_action' });
    } finally {
      setIsLoading(false);
    }
  }, [onStatusChange]);

  // Load current 2FA status
  useEffect(() => {
    loadMFAStatus();
  }, [loadMFAStatus]);

  const startSetup = async () => {
    try {
      setIsProcessing(true);

      const response = await csrfFetch('/api/auth/mfa/enroll', {
        method: 'POST',
      });

      const result = await response.json();

      if (result.success) {
        setQrCode(result.data.qr_code);
        setSecret(result.data.secret);
        setFactorId(result.data.id);
        setShowSetupModal(true);
      } else {
        alert('Failed to start 2FA setup: ' + result.error);
      }
    } catch (error) {
      logger.error('Error starting 2FA setup:', error, { component: 'TwoFactorAuth', action: 'component_action' });
      alert('Failed to start 2FA setup');
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyAndEnable = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Please enter a valid 6-digit code');
      return;
    }

    if (!factorId) {
      alert('No setup session found. Please restart the process.');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await csrfFetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          factorId,
          code: verificationCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsEnabled(true);
        setShowSetupModal(false);
        resetSetupState();

        if (onStatusChange) {
          onStatusChange(true);
        }

        // Reload status
        loadMFAStatus();
        alert('2FA has been enabled successfully!');
      } else {
        alert('Invalid verification code. Please try again.');
      }
    } catch (error) {
      logger.error('Error verifying 2FA code:', error, { component: 'TwoFactorAuth', action: 'component_action' });
      alert('Failed to verify code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const disable2FA = async () => {
    if (!mfaFactor) {
      alert('No MFA factor found');
      return;
    }

    if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
      return;
    }

    try {
      setIsProcessing(true);
      const response = await csrfFetch('/api/auth/mfa/unenroll', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          factorId: mfaFactor.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsEnabled(false);
        setMfaFactor(null);

        if (onStatusChange) {
          onStatusChange(false);
        }

        alert('2FA has been disabled.');
      } else {
        alert('Failed to disable 2FA: ' + result.error);
      }
    } catch (error) {
      logger.error('Error disabling 2FA:', error, { component: 'TwoFactorAuth', action: 'component_action' });
      alert('Failed to disable 2FA');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSetupState = () => {
    setQrCode(null);
    setSecret(null);
    setFactorId(null);
    setVerificationCode('');
    setSecretCopied(false);
  };

  const closeModal = () => {
    setShowSetupModal(false);
    resetSetupState();
  };

  const copySecret = async () => {
    if (secret) {
      await navigator.clipboard.writeText(secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg sm:rounded-xl p-4 sm:p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-600 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-600 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-32"></div>
          </div>
          <div className="w-24 h-10 bg-gray-600 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 2FA Status Card */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg sm:rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className="flex items-start gap-3 sm:gap-4 flex-1">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center ${
              isEnabled
                ? 'bg-green-900/30'
                : 'bg-yellow-900/30'
            }`}>
              <Smartphone className={`w-5 h-5 sm:w-6 sm:h-6 ${
                isEnabled
                  ? 'text-green-400'
                  : 'text-yellow-400'
              }`} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-1">
                Two-Factor Authentication
              </h3>
              <p className="text-xs sm:text-sm text-gray-400">
                Add an extra layer of security to your account
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-2">
                Status: {' '}
                <span className={`font-medium ${
                  isEnabled
                    ? 'text-green-400'
                    : 'text-yellow-400'
                }`}>
                  {isEnabled ? 'Enabled' : 'Not Enabled'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {isEnabled ? (
              <button
                onClick={disable2FA}
                disabled={isProcessing}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-red-600 text-white rounded-lg sm:rounded-xl hover:bg-red-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Disabling...' : 'Disable 2FA'}
              </button>
            ) : (
              <button
                onClick={startSetup}
                disabled={isProcessing}
                className="px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-green-600 text-white rounded-lg sm:rounded-xl hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Starting...' : 'Enable 2FA'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Enable 2FA</h3>
              <button
                onClick={closeModal}
                className="text-gray-500 text-gray-400 hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Step 1: QR Code */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <QrCode className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-white">
                    Step 1: Scan QR Code
                  </h4>
                </div>
                <p className="text-sm text-gray-400 mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
                </p>

                {qrCode ? (
                  <div className="bg-white p-4 rounded-xl border border-gray-700 text-center">
                    <Image
                      src={qrCode}
                      alt="2FA QR Code"
                      width={192}
                      height={192}
                      className="mx-auto w-48 h-48"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="bg-gray-900 rounded-xl p-8 flex items-center justify-center">
                    <div className="text-center text-gray-500 text-sm">
                      Loading QR code...
                    </div>
                  </div>
                )}

                {/* Manual entry option */}
                {secret && (
                  <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-300">
                        Manual entry key:
                      </span>
                      <button
                        onClick={copySecret}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                      >
                        {secretCopied ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <code className="text-xs font-mono bg-gray-800 px-2 py-1 rounded border break-all">
                      {secret}
                    </code>
                  </div>
                )}
              </div>

              {/* Step 2: Verify */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Key className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-white">
                    Step 2: Enter Verification Code
                  </h4>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  autoComplete="one-time-code"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-white text-center text-lg tracking-widest"
                />
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyAndEnable}
                  disabled={isProcessing || verificationCode.length !== 6}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Enable 2FA'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
