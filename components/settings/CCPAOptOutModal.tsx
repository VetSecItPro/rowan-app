'use client';

import { useState, useEffect } from 'react';
import { X, Shield, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

interface CCPAOptOutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CCPAStatus {
  opted_out: boolean;
  california_resident?: boolean;
  verification_method?: string;
  opt_out_date?: string;
}

export function CCPAOptOutModal({ isOpen, onClose }: CCPAOptOutModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ccpaStatus, setCcpaStatus] = useState<CCPAStatus | null>(null);
  const [californiaResident, setCaliforniaResident] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && user) {
      loadCCPAStatus();
    }
  }, [isOpen, user]);

  const loadCCPAStatus = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ccpa/opt-out');
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load CCPA status');
      }

      setCcpaStatus(result.data);
      setCaliforniaResident(result.data.california_resident);
    } catch (error) {
      console.error('Error loading CCPA status:', error);
      setError(error instanceof Error ? error.message : 'Failed to load status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptOutToggle = async (optedOut: boolean) => {
    setIsSaving(true);
    setError('');

    try {
      const response = await fetch('/api/ccpa/opt-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optedOut,
          californiaResident,
          verificationMethod: 'user_declaration',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update opt-out status');
      }

      setCcpaStatus(result.data);

      // Show success message briefly
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error updating CCPA status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">CCPA Privacy Rights</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">California Consumer Privacy Act</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
            disabled={isSaving}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading CCPA status...</span>
            </div>
          ) : (
            <>
              {/* California Resident Check */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">California Residency</h3>
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Are you a California resident?
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                      CCPA rights apply to California residents. Please confirm your residency status.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCaliforniaResident(true)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          californiaResident === true
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        disabled={isSaving}
                      >
                        Yes, I'm a CA resident
                      </button>
                      <button
                        onClick={() => setCaliforniaResident(false)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          californiaResident === false
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        disabled={isSaving}
                      >
                        No, I'm not a CA resident
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Do Not Sell Section */}
              {californiaResident === true && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Do Not Sell My Personal Information</h3>

                  {/* Current Status */}
                  {ccpaStatus && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                      ccpaStatus.opted_out
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
                    }`}>
                      <CheckCircle className={`w-5 h-5 ${
                        ccpaStatus.opted_out ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                      }`} />
                      <div>
                        <p className={`font-medium ${
                          ccpaStatus.opted_out
                            ? 'text-green-900 dark:text-green-100'
                            : 'text-orange-900 dark:text-orange-100'
                        }`}>
                          {ccpaStatus.opted_out ? 'You have opted out of data sales' : 'You have not opted out of data sales'}
                        </p>
                        <p className={`text-sm ${
                          ccpaStatus.opted_out
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-orange-800 dark:text-orange-200'
                        }`}>
                          {ccpaStatus.opted_out
                            ? 'We will not sell your personal information to third parties.'
                            : 'We may share your personal information with third parties for business purposes.'
                          }
                        </p>
                        {ccpaStatus.opt_out_date && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Status changed: {new Date(ccpaStatus.opt_out_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Information */}
                  <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                    <h4 className="font-medium text-gray-900 dark:text-white">What this means:</h4>
                    <ul className="space-y-2 ml-4">
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span><strong>Opted Out:</strong> We will not sell your personal information to third parties for monetary or other valuable consideration.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span><strong>Not Opted Out:</strong> We may share your information with business partners for legitimate business purposes.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                        <span>This setting only affects the sale of personal information and does not impact essential service functions.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    {!ccpaStatus?.opted_out ? (
                      <button
                        onClick={() => handleOptOutToggle(true)}
                        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        disabled={isSaving}
                      >
                        <Shield className="w-4 h-4" />
                        {isSaving ? 'Opting Out...' : 'Opt Out of Data Sales'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOptOutToggle(false)}
                        className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSaving}
                      >
                        {isSaving ? 'Opting In...' : 'Opt Back In to Data Sales'}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Non-California Residents */}
              {californiaResident === false && (
                <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white mb-1">CCPA Rights Not Applicable</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      The California Consumer Privacy Act (CCPA) applies specifically to California residents.
                      As a non-California resident, you may have other privacy rights under applicable laws.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Legal Notice */}
              <div className="text-xs text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
                This opt-out is provided in compliance with the California Consumer Privacy Act (CCPA) Section 1798.135.
                Your rights and our privacy practices are detailed in our Privacy Policy.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}