'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuth } from '@/lib/contexts/auth-context';
import {
  getPrivacyPreferences,
  updatePrivacyPreferences,
  getCCPAPreference,
  updateCCPAPreference,
  getDataProcessingAgreements,
  PrivacyPreferences,
  CCPAPreference,
  DataProcessingAgreement,
} from '@/lib/services/compliance-service';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { Toggle } from '@/components/ui/Toggle';
import {
  Shield,
  Lock,
  Cookie,
  MapPin,
  Mail,
  BarChart3,
  Share2,
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';

export default function PrivacyCompliancePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [preferences, setPreferences] = useState<PrivacyPreferences | null>(null);
  const [ccpaPreference, setCCPAPreference] = useState<CCPAPreference | null>(null);
  const [agreements, setAgreements] = useState<DataProcessingAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);

    const [prefsResult, ccpaResult, agreementsResult] = await Promise.all([
      getPrivacyPreferences(user.id),
      getCCPAPreference(user.id),
      getDataProcessingAgreements(user.id),
    ]);

    if (prefsResult.success && prefsResult.data) {
      setPreferences(prefsResult.data);
    }

    if (ccpaResult.success && ccpaResult.data) {
      setCCPAPreference(ccpaResult.data);
    }

    if (agreementsResult.success && agreementsResult.data) {
      setAgreements(agreementsResult.data);
    }

    setLoading(false);
  };

  const handlePreferenceChange = async (key: keyof PrivacyPreferences, value: boolean) => {
    if (!user || !preferences) return;

    const updatedPreferences = { ...preferences, [key]: value };
    setPreferences(updatedPreferences);

    setSaving(true);
    await updatePrivacyPreferences(user.id, { [key]: value });
    setSaving(false);
  };

  const handleCCPAToggle = async (doNotSell: boolean) => {
    if (!user) return;

    setSaving(true);
    const result = await updateCCPAPreference(user.id, doNotSell);

    if (result.success) {
      setCCPAPreference({
        ...ccpaPreference!,
        do_not_sell: doNotSell,
        current_status: doNotSell ? 'opted_out' : 'opted_in',
      });
    }

    setSaving(false);
  };

  if (!user) {
    return null;
  }

  return (
    <FeatureLayout breadcrumbItems={[
      { label: 'Settings', href: '/settings' },
      { label: 'Privacy & Compliance' }
    ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Privacy & Compliance Settings</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your privacy preferences and view your data processing agreements. Your privacy is important to us, and we're committed to GDPR and CCPA compliance.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <SkeletonLoader variant="list" count={5} />
        ) : (
          <>
            {/* CCPA Do Not Sell */}
            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                    CCPA: Do Not Sell My Personal Information
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    California Consumer Privacy Act (CCPA) provides you the right to opt-out of the sale of your personal information.
                  </p>
                </div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-800 dark:text-orange-200">
                    <p className="font-medium mb-1">What does "Do Not Sell" mean?</p>
                    <p className="text-xs">
                      When enabled, we will not share your personal information with third parties for monetary or other valuable consideration. This does not affect data sharing necessary for service functionality.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Do Not Sell My Personal Information</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Current status: {ccpaPreference?.current_status === 'opted_out' ? 'Opted Out (Protected)' : 'Opted In'}
                  </p>
                </div>
                <Toggle
                  checked={ccpaPreference?.do_not_sell || false}
                  onChange={handleCCPAToggle}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Marketing Preferences */}
            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Marketing Communications</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Control how we can contact you for marketing purposes.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Marketing Emails</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Receive product updates and offers via email</p>
                  </div>
                  <Toggle
                    checked={preferences?.marketing_emails_enabled || false}
                    onChange={(checked) => handlePreferenceChange('marketing_emails_enabled', checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Marketing SMS</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Receive promotional messages via SMS</p>
                  </div>
                  <Toggle
                    checked={preferences?.marketing_sms_enabled || false}
                    onChange={(checked) => handlePreferenceChange('marketing_sms_enabled', checked)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Cookie Preferences */}
            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Cookie Preferences</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Manage which cookies and tracking technologies we can use.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Analytics Cookies</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Help us understand how you use our service</p>
                  </div>
                  <Toggle
                    checked={preferences?.analytics_cookies_enabled || false}
                    onChange={(checked) => handlePreferenceChange('analytics_cookies_enabled', checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Performance Cookies</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Improve site performance and user experience</p>
                  </div>
                  <Toggle
                    checked={preferences?.performance_cookies_enabled || false}
                    onChange={(checked) => handlePreferenceChange('performance_cookies_enabled', checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Advertising Cookies</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Personalized advertising and recommendations</p>
                  </div>
                  <Toggle
                    checked={preferences?.advertising_cookies_enabled || false}
                    onChange={(checked) => handlePreferenceChange('advertising_cookies_enabled', checked)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Data Sharing */}
            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Data Sharing</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Control how your data is shared with partners and third parties.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Share Data with Partners</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Allow trusted partners to enhance your experience</p>
                  </div>
                  <Toggle
                    checked={preferences?.share_data_with_partners || false}
                    onChange={(checked) => handlePreferenceChange('share_data_with_partners', checked)}
                    disabled={saving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Third-Party Analytics</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Share anonymized data with analytics providers</p>
                  </div>
                  <Toggle
                    checked={preferences?.allow_third_party_analytics || false}
                    onChange={(checked) => handlePreferenceChange('allow_third_party_analytics', checked)}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* Location Tracking */}
            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Location Services</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Control whether we can access your location data.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Location Tracking</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Enable location-based features and services</p>
                </div>
                <Toggle
                  checked={preferences?.location_tracking_enabled || false}
                  onChange={(checked) => handlePreferenceChange('location_tracking_enabled', checked)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Data Processing Agreements */}
            {agreements.length > 0 && (
              <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Data Processing Agreements</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      View your consent history and data processing agreements.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {agreements.map((agreement) => (
                    <div
                      key={agreement.id}
                      className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-gray-900 dark:text-white capitalize">
                              {agreement.agreement_type.replace(/_/g, ' ')}
                            </p>
                            {agreement.consented && !agreement.withdrawn ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Version: {agreement.agreement_version} • Legal Basis: {agreement.legal_basis}
                          </p>
                          {agreement.consent_date && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              Consented: {new Date(agreement.consent_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info Banner */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">Your Privacy Matters</p>
                  <p className="text-xs">
                    We are committed to protecting your privacy and complying with GDPR, CCPA, and other privacy regulations.
                    You can view your <a href="/settings/audit-log" className="underline hover:no-underline">audit trail</a> or{' '}
                    <a href="/settings" className="underline hover:no-underline">export your data</a> at any time.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </FeatureLayout>
  );
}
