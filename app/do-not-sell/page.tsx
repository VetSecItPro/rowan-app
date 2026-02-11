'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { Shield, MapPin, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

interface CCPAStatus {
  opted_out: boolean;
  california_resident?: boolean;
  verification_method?: string;
  opt_out_date?: string;
}

export default function DoNotSellPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ccpaStatus, setCcpaStatus] = useState<CCPAStatus | null>(null);
  const [californiaResident, setCaliforniaResident] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadCCPAStatus();
    }
  }, [user]);

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
      logger.error('Error loading CCPA status:', error, { component: 'page', action: 'execution' });
      setError(error instanceof Error ? error.message : 'Failed to load status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptOut = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await csrfFetch('/api/ccpa/opt-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optedOut: true,
          californiaResident,
          verificationMethod: 'user_declaration',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to opt out');
      }

      setCcpaStatus(result.data);
      setSuccess('Successfully opted out of personal information sales. Your preference has been saved.');
    } catch (error) {
      logger.error('Error opting out:', error, { component: 'page', action: 'execution' });
      setError(error instanceof Error ? error.message : 'Failed to opt out');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOptIn = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await csrfFetch('/api/ccpa/opt-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          optedOut: false,
          californiaResident,
          verificationMethod: 'user_declaration',
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to opt in');
      }

      setCcpaStatus(result.data);
      setSuccess('Successfully opted back in to personal information sharing. Your preference has been saved.');
    } catch (error) {
      logger.error('Error opting in:', error, { component: 'page', action: 'execution' });
      setError(error instanceof Error ? error.message : 'Failed to opt in');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Do Not Sell My Personal Information
          </h1>
          <p className="text-xl text-gray-400 mb-2">
            California Consumer Privacy Act (CCPA) Rights
          </p>
          <p className="text-lg text-gray-500">
            Exercise your right to opt-out of personal information sales
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 overflow-hidden">
          <div className="p-8 space-y-8">

            {/* CCPA Information */}
            <section>
              <h2 className="text-2xl font-bold text-white mb-6">Your CCPA Rights</h2>

              <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-100 mb-3">
                  California Residents Have the Right to Opt-Out
                </h3>
                <p className="text-blue-200 mb-4">
                  Under the California Consumer Privacy Act (CCPA), California residents have the right to opt-out of the
                  &quot;sale&quot; of their personal information to third parties. This includes sharing personal information for
                  valuable consideration, not just monetary payment.
                </p>
                <div className="flex items-center gap-2 text-blue-300">
                  <ExternalLink className="w-4 h-4" />
                  <a href="/privacy-policy" className="hover:underline">
                    Learn more in our Privacy Policy
                  </a>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 border border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">What &quot;Sale&quot; Means</h4>
                  <p className="text-sm text-gray-400">
                    Under CCPA, &quot;sale&quot; includes sharing personal information with third parties for valuable consideration,
                    including data sharing for advertising purposes.
                  </p>
                </div>

                <div className="p-4 border border-gray-700 rounded-lg">
                  <h4 className="font-semibold text-white mb-2">Our Current Practice</h4>
                  <p className="text-sm text-gray-400">
                    Rowan does not currently sell personal information. We may share data with service providers
                    for legitimate business purposes only.
                  </p>
                </div>
              </div>
            </section>

            {/* California Residency Check */}
            {!user ? (
              <section className="text-center py-12">
                <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Sign In Required</h3>
                <p className="text-gray-400 mb-6">
                  You need to sign in to manage your CCPA opt-out preferences.
                </p>
                <a
                  href="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                >
                  Sign In to Continue
                </a>
              </section>
            ) : isLoading ? (
              <section className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading your CCPA preferences...</p>
              </section>
            ) : (
              <>
                {/* Residency Verification */}
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-white">California Residency</h2>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold text-yellow-100 mb-3">
                      Confirm Your Residency Status
                    </h3>
                    <p className="text-yellow-200 mb-4">
                      CCPA rights apply specifically to California residents. Please confirm your residency status to proceed.
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setCaliforniaResident(true)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          californiaResident === true
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700'
                        }`}
                        disabled={isSaving}
                      >
                        Yes, I&apos;m a California resident
                      </button>
                      <button
                        onClick={() => setCaliforniaResident(false)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          californiaResident === false
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700'
                        }`}
                        disabled={isSaving}
                      >
                        No, I&apos;m not a California resident
                      </button>
                    </div>
                  </div>
                </section>

                {/* Opt-Out Section for CA Residents */}
                {californiaResident === true && (
                  <section>
                    <h2 className="text-2xl font-bold text-white mb-6">Opt-Out Settings</h2>

                    {/* Current Status */}
                    {ccpaStatus && (
                      <div className={`flex items-center gap-4 p-6 rounded-xl border mb-6 ${
                        ccpaStatus.opted_out
                          ? 'bg-green-900/20 border-green-800'
                          : 'bg-orange-900/20 border-orange-800'
                      }`}>
                        <CheckCircle className={`w-8 h-8 ${
                          ccpaStatus.opted_out ? 'text-green-400' : 'text-orange-400'
                        }`} />
                        <div className="flex-1">
                          <h3 className={`text-lg font-semibold ${
                            ccpaStatus.opted_out
                              ? 'text-green-100'
                              : 'text-orange-100'
                          }`}>
                            {ccpaStatus.opted_out ? 'You have opted out' : 'You have not opted out'}
                          </h3>
                          <p className={`${
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
                            <p className="text-sm text-gray-400 mt-1">
                              Status last changed: {new Date(ccpaStatus.opt_out_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      {!ccpaStatus?.opted_out ? (
                        <button
                          onClick={handleOptOut}
                          className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                          disabled={isSaving}
                        >
                          <Shield className="w-5 h-5" />
                          {isSaving ? 'Processing...' : 'Opt-Out of Personal Information Sales'}
                        </button>
                      ) : (
                        <button
                          onClick={handleOptIn}
                          className="flex-1 px-6 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isSaving}
                        >
                          {isSaving ? 'Processing...' : 'Opt Back In to Personal Information Sharing'}
                        </button>
                      )}
                    </div>

                    {/* Success/Error Messages */}
                    {success && (
                      <div className="mt-4 p-4 bg-green-900/20 border border-green-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          <p className="text-green-200">{success}</p>
                        </div>
                      </div>
                    )}

                    {error && (
                      <div className="mt-4 p-4 bg-red-900/20 border border-red-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                          <p className="text-red-200">{error}</p>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* Non-CA Residents */}
                {californiaResident === false && (
                  <section>
                    <div className="text-center py-12">
                      <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-white mb-2">CCPA Rights Not Applicable</h3>
                      <p className="text-gray-400 mb-6 max-w-2xl mx-auto">
                        The California Consumer Privacy Act (CCPA) applies specifically to California residents.
                        As a non-California resident, you may have other privacy rights under applicable laws in your jurisdiction.
                      </p>
                      <a
                        href="/privacy-policy"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View Our Privacy Policy
                      </a>
                    </div>
                  </section>
                )}
              </>
            )}

            {/* Footer Information */}
            <section className="border-t border-gray-700 pt-8">
              <h3 className="text-lg font-semibold text-white mb-4">Need Help?</h3>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Contact for CCPA Requests</h4>
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>Email: ccpa@rowan-app.com</p>
                    <p>Phone: 1-800-ROWAN-CA</p>
                    <p>Response time: Within 45 days</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-700 rounded-lg">
                  <h4 className="font-medium text-white mb-2">Additional Resources</h4>
                  <div className="text-sm text-gray-400 space-y-1">
                    <a href="/privacy-policy" className="block hover:text-blue-400">Privacy Policy</a>
                    <a href="/terms" className="block hover:text-blue-400">Terms of Service</a>
                    <a href="/settings/privacy" className="block hover:text-blue-400">Privacy Settings</a>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
                <p className="text-sm text-blue-200">
                  This page implements the &quot;Do Not Sell My Personal Information&quot; link required by CCPA Section 1798.135.
                  California residents can use this page to exercise their right to opt-out of personal information sales.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
