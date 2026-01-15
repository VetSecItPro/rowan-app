'use client';

import { useState, useEffect } from 'react';
import { X, Shield, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { logger } from '@/lib/logger';

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
      logger.error('Error loading CCPA status:', error, { component: 'CCPAOptOutModal', action: 'component_action' });
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
      logger.error('Error updating CCPA status:', error, { component: 'CCPAOptOutModal', action: 'component_action' });
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
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-900 sm:rounded-2xl shadow-2xl sm:max-w-2xl sm:max-h-[90vh] overflow-hidden border border-gray-700 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">CCPA Privacy Rights</h2>
              <p className="text-sm text-gray-400">California Consumer Privacy Act</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-800 flex items-center justify-center transition-colors"
            disabled={isSaving}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-400">Loading CCPA status...</span>
            </div>
          ) : (
            <>
              {/* California Resident Check */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">California Residency</h3>
                <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-800 rounded-xl">
                  <MapPin className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-100 mb-2">
                      Are you a California resident?
                    </p>
                    <p className="text-sm text-blue-200 mb-4">
                      CCPA rights apply to California residents. Please confirm your residency status.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setCaliforniaResident(true)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          californiaResident === true
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700'
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
                            : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700'
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
                  <h3 className="text-lg font-semibold text-white">Do Not Sell My Personal Information</h3>

                  {/* Current Status */}
                  {ccpaStatus && (
                    <div className={`flex items-center gap-3 p-4 rounded-xl border ${
                      ccpaStatus.opted_out
                        ? 'bg-green-900/20 border-green-800'
                        : 'bg-orange-900/20 border-orange-800'
                    }`}>
                      <CheckCircle className={`w-5 h-5 ${
                        ccpaStatus.opted_out ? 'text-green-400' : 'text-orange-400'
                      }`} />
                      <div>
                        <p className={`font-medium ${
                          ccpaStatus.opted_out
                            ? 'text-green-100'
                            : 'text-orange-100'
                        }`}>
                          {ccpaStatus.opted_out ? 'You have opted out of data sales' : 'You have not opted out of data sales'}
                        </p>
                        <p className={`text-sm ${
                          ccpaStatus.opted_out
                            ? 'text-green-200'
                            : 'text-orange-200'
                        }`}>
                          {ccpaStatus.opted_out
                            ? 'We will not sell your personal information to third parties.'
                            : 'We may share your personal information with third parties for business purposes.'
                          }
                        </p>
                        {ccpaStatus.opt_out_date && (
                          <p className="text-xs text-gray-400 mt-1">
                            Status changed: {new Date(ccpaStatus.opt_out_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Information */}
                  <div className="space-y-3 text-sm text-gray-400">
                    <h4 className="font-medium text-white">What this means:</h4>
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
                <div className="flex items-start gap-3 p-4 bg-gray-800 border border-gray-700 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white mb-1">CCPA Rights Not Applicable</p>
                    <p className="text-sm text-gray-400">
                      The California Consumer Privacy Act (CCPA) applies specifically to California residents.
                      As a non-California resident, you may have other privacy rights under applicable laws.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="flex items-start gap-3 p-4 bg-red-900/20 border border-red-800 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-200">{error}</p>
                </div>
              )}

              {/* Legal Notice */}
              <div className="text-xs text-gray-400 pt-4 border-t border-gray-700">
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